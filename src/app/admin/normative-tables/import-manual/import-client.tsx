"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DocVersionOption } from "./page";

// ─── Types ───────────────────────────────────────────────────────────────────

type FilePreview = {
  name: string;
  type: string; // "image" | "pdf"
  url: string;  // object URL
};

type RowInput = {
  _key: string;
  supplyType: string;
  loadMinKw: string;
  loadMaxKw: string;
  breakerAmp: string;
  breakerType: string;
  copperConcentricMm2: string;
  copperMultiplexedMm2: string;
  aluminumDuplexMm2: string;
  aluminumTriplexMm2: string;
  aluminumQuadruplexMm2: string;
  galvanizedSteelConduitInch: string;
  customerPhaseNeutralConductorMm2: string;
  groundingConductorMm2: string;
  groundingConduitInch: string;
  notes: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mkKey() {
  return String(Date.now() + Math.random());
}

function emptyRow(): RowInput {
  return {
    _key: mkKey(),
    supplyType: "MONOFASICO",
    loadMinKw: "",
    loadMaxKw: "",
    breakerAmp: "",
    breakerType: "",
    copperConcentricMm2: "",
    copperMultiplexedMm2: "",
    aluminumDuplexMm2: "",
    aluminumTriplexMm2: "",
    aluminumQuadruplexMm2: "",
    galvanizedSteelConduitInch: "",
    customerPhaseNeutralConductorMm2: "",
    groundingConductorMm2: "",
    groundingConduitInch: "",
    notes: "",
  };
}

function toNum(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return isNaN(n) ? null : n;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FileSlot({
  label,
  preview,
  onFile,
  onClear,
}: {
  label: string;
  preview: FilePreview | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {preview ? (
        <div className="relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
          {preview.type === "image" ? (
            <img
              src={preview.url}
              alt={preview.name}
              className="max-h-[420px] w-full object-contain"
            />
          ) : (
            <iframe
              src={preview.url}
              title={preview.name}
              className="h-[420px] w-full"
            />
          )}
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs text-red-600 shadow hover:bg-red-50"
          >
            Remover
          </button>
          <p className="px-3 py-1.5 text-xs text-slate-500 truncate">{preview.name}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-[#19A7E8] hover:bg-blue-50 hover:text-[#19A7E8]"
        >
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium">Clique para carregar</span>
          <span className="text-xs">Imagem ou PDF</span>
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Row cell helpers ─────────────────────────────────────────────────────────

function NumCell({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "-"}
      className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs text-center focus:border-[#19A7E8] focus:outline-none"
    />
  );
}

function TxtCell({
  value,
  onChange,
  width = "w-20",
}: {
  value: string;
  onChange: (v: string) => void;
  width?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="-"
      className={`${width} rounded border border-slate-200 px-1.5 py-1 text-xs focus:border-[#19A7E8] focus:outline-none`}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ImportManualClient({ versions }: { versions: DocVersionOption[] }) {
  const router = useRouter();

  // File previews (max 2)
  const [previews, setPreviews] = useState<[FilePreview | null, FilePreview | null]>([null, null]);

  // Document version selection
  const [versionKey, setVersionKey] = useState<string>(() => {
    if (versions.length === 0) return "";
    const v = versions[0];
    return `${v.versionId}|${v.documentId}|${v.concessionaire ?? ""}|${(v.stateCodes ?? []).join(",")}`;
  });

  // Table metadata
  const [meta, setMeta] = useState({
    tableNumber: "",
    tableTitle: "",
    voltage: "127/220V",
    category: "SERVICE_ENTRANCE_SIZING",
    pdfPage: "",
    printedPage: "",
    revision: "",
    homologationDate: "",
    method: "CARGA_INSTALADA",
  });

  // Rows
  const [rows, setRows] = useState<RowInput[]>([emptyRow()]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  // ── File handling ────────────────────────────────────────────────────────────

  const handleFile = useCallback((index: 0 | 1, file: File) => {
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("image/") ? "image" : "pdf";
    setPreviews((prev) => {
      const next: [FilePreview | null, FilePreview | null] = [...prev] as [FilePreview | null, FilePreview | null];
      if (next[index]) URL.revokeObjectURL(next[index]!.url);
      next[index] = { name: file.name, type, url };
      return next;
    });
  }, []);

  const clearFile = useCallback((index: 0 | 1) => {
    setPreviews((prev) => {
      const next: [FilePreview | null, FilePreview | null] = [...prev] as [FilePreview | null, FilePreview | null];
      if (next[index]) URL.revokeObjectURL(next[index]!.url);
      next[index] = null;
      return next;
    });
  }, []);

  // ── Row editing ──────────────────────────────────────────────────────────────

  function updateRow(key: string, field: keyof RowInput, value: string) {
    setRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  function duplicateRow(key: string) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r._key === key);
      if (idx < 0) return prev;
      const copy = { ...prev[idx], _key: mkKey() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setFeedback(null);

    if (!versionKey) {
      setFeedback({ ok: false, message: "Selecione o documento/versao da norma." });
      return;
    }
    if (!meta.tableNumber.trim()) {
      setFeedback({ ok: false, message: "Informe o numero da tabela (ex: 1 ou 2)." });
      return;
    }
    if (!meta.tableTitle.trim()) {
      setFeedback({ ok: false, message: "Informe o titulo da tabela." });
      return;
    }
    if (rows.length === 0) {
      setFeedback({ ok: false, message: "Adicione pelo menos uma linha." });
      return;
    }
    for (const row of rows) {
      if (!row.loadMaxKw || !row.breakerAmp) {
        setFeedback({ ok: false, message: "Todas as linhas devem ter Carga max (kW) e Disjuntor (A)." });
        return;
      }
    }

    const [versionId, documentId, concessionaire, stateCodesStr] = versionKey.split("|");

    setSubmitting(true);
    try {
      const resp = await fetch("/api/admin/normative-tables/import-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentVersionId: versionId,
          documentId,
          concessionaire: concessionaire || null,
          stateCodes: stateCodesStr ? stateCodesStr.split(",").filter(Boolean) : [],
          tableNumber: meta.tableNumber.trim(),
          title: meta.tableTitle.trim(),
          voltage: meta.voltage,
          category: meta.category,
          pdfPageNumber: meta.pdfPage ? parseInt(meta.pdfPage) : null,
          printedPage: meta.printedPage.trim() || null,
          revision: meta.revision.trim() || null,
          homologationDate: meta.homologationDate.trim() || null,
          method: meta.method,
          rows: rows.map((r, i) => ({
            rowIndex: i + 1,
            supplyType: r.supplyType,
            loadMinKw: toNum(r.loadMinKw),
            loadMaxKw: toNum(r.loadMaxKw)!,
            breakerAmp: toNum(r.breakerAmp) ? Math.round(toNum(r.breakerAmp)!) : null,
            breakerType: r.breakerType.trim() || null,
            copperConcentricMm2: toNum(r.copperConcentricMm2),
            copperMultiplexedMm2: toNum(r.copperMultiplexedMm2),
            aluminumDuplexMm2: toNum(r.aluminumDuplexMm2),
            aluminumTriplexMm2: toNum(r.aluminumTriplexMm2),
            aluminumQuadruplexMm2: toNum(r.aluminumQuadruplexMm2),
            galvanizedSteelConduitInch: r.galvanizedSteelConduitInch.trim() || null,
            customerPhaseNeutralConductorMm2: toNum(r.customerPhaseNeutralConductorMm2),
            groundingConductorMm2: toNum(r.groundingConductorMm2),
            groundingConduitInch: r.groundingConduitInch.trim() || null,
            notes: r.notes.trim() || null,
            voltage: meta.voltage,
            method: meta.method,
          })),
        }),
      });

      const data = (await resp.json()) as { ok: boolean; message?: string; tableId?: string };
      if (data.ok) {
        setFeedback({ ok: true, message: `Tabela ${meta.tableNumber} importada com ${rows.length} linhas validadas.` });
        setTimeout(() => router.push("/admin/normative-tables"), 1500);
      } else {
        setFeedback({ ok: false, message: data.message ?? `Erro HTTP ${resp.status}.` });
      }
    } catch (err) {
      setFeedback({
        ok: false,
        message: err instanceof Error ? err.message : "Nao foi possivel conectar ao servidor.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Version option selected ──────────────────────────────────────────────────

  const selectedVersion = versions.find(
    (v) => v.versionId === versionKey.split("|")[0],
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Step 1: Reference images + Metadata ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          1. Referencia visual e metadados
        </h2>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* File previews */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FileSlot
              label="Imagem / PDF 1"
              preview={previews[0]}
              onFile={(f) => handleFile(0, f)}
              onClear={() => clearFile(0)}
            />
            <FileSlot
              label="Imagem / PDF 2 (opcional)"
              preview={previews[1]}
              onFile={(f) => handleFile(1, f)}
              onClear={() => clearFile(1)}
            />
          </div>

          {/* Metadata form */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Document version */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Documento (norma) *
              </label>
              {versions.length === 0 ? (
                <p className="mt-1 text-sm text-red-500">
                  Nenhum documento processado (READY) encontrado. Processe um PDF primeiro.
                </p>
              ) : (
                <select
                  value={versionKey}
                  onChange={(e) => setVersionKey(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none"
                >
                  {versions.map((v) => (
                    <option
                      key={v.versionId}
                      value={`${v.versionId}|${v.documentId}|${v.concessionaire ?? ""}|${(v.stateCodes ?? []).join(",")}`}
                    >
                      {v.documentTitle} — Rev. {v.versionLabel}
                      {v.concessionaire ? ` (${v.concessionaire})` : ""}
                    </option>
                  ))}
                </select>
              )}
              {selectedVersion && (
                <p className="mt-1 text-xs text-slate-400">
                  {selectedVersion.concessionaire ?? "Sem concessionaria"} ·{" "}
                  {(selectedVersion.stateCodes ?? []).join(", ") || "Sem UF"}
                </p>
              )}
            </div>

            {/* Table number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Numero da tabela *</label>
              <input
                type="text"
                value={meta.tableNumber}
                onChange={(e) => setMeta((m) => ({ ...m, tableNumber: e.target.value }))}
                placeholder="1"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none"
              />
            </div>

            {/* Voltage */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Tensao *</label>
              <select
                value={meta.voltage}
                onChange={(e) => setMeta((m) => ({ ...m, voltage: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none"
              >
                <option value="127/220V">127/220 V</option>
                <option value="220/380V">220/380 V</option>
                <option value="13800V">13,8 kV</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            {/* Table title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Titulo da tabela *</label>
              <input
                type="text"
                value={meta.tableTitle}
                onChange={(e) => setMeta((m) => ({ ...m, tableTitle: e.target.value }))}
                placeholder="Dimensionamento do Ramal de Conexao e Entrada das Instalacoes em 220/380V"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none"
              />
            </div>

            {/* PDF page */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Pagina PDF</label>
              <input
                type="number"
                value={meta.pdfPage}
                onChange={(e) => setMeta((m) => ({ ...m, pdfPage: e.target.value }))}
                placeholder="29"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none"
              />
            </div>

            {/* Printed page */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Pagina impressa</label>
              <input
                type="text"
                value={meta.printedPage}
                onChange={(e) => setMeta((m) => ({ ...m, printedPage: e.target.value }))}
                placeholder="29 de 104"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none"
              />
            </div>

            {/* Revision */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Revisao</label>
              <input
                type="text"
                value={meta.revision}
                onChange={(e) => setMeta((m) => ({ ...m, revision: e.target.value }))}
                placeholder="09"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none"
              />
            </div>

            {/* Homologation date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Data de homologacao</label>
              <input
                type="text"
                value={meta.homologationDate}
                onChange={(e) => setMeta((m) => ({ ...m, homologationDate: e.target.value }))}
                placeholder="22/05/2025"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Categoria</label>
              <select
                value={meta.category}
                onChange={(e) => setMeta((m) => ({ ...m, category: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none"
              >
                <option value="SERVICE_ENTRANCE_SIZING">Dimensionamento do Ramal</option>
                <option value="CABLE_SIZING">Dimensionamento de Cabos</option>
                <option value="BREAKER_SIZING">Dimensionamento de Disjuntores</option>
                <option value="GROUNDING">Aterramento</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            {/* Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Metodo de calculo</label>
              <select
                value={meta.method}
                onChange={(e) => setMeta((m) => ({ ...m, method: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none"
              >
                <option value="CARGA_INSTALADA">Carga instalada (kW)</option>
                <option value="DEMANDA">Demanda (kW)</option>
                <option value="CORRENTE">Corrente (A)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Step 2: Row editor ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            2. Linhas da tabela ({rows.length})
          </h2>
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg bg-[#123C7C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0A1633]"
          >
            + Adicionar linha
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[1400px] divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2 w-6 text-center">#</th>
                <th className="px-2 py-2 w-28">Tipo fornec.</th>
                <th className="px-2 py-2 w-20 text-center">Carga min kW</th>
                <th className="px-2 py-2 w-20 text-center">Carga max kW *</th>
                <th className="px-2 py-2 w-16 text-center">Disj. A *</th>
                <th className="px-2 py-2 w-16 text-center">Tipo disj.</th>
                <th className="px-2 py-2 w-18 text-center">Cu conc. mm²</th>
                <th className="px-2 py-2 w-18 text-center">Cu multi. mm²</th>
                <th className="px-2 py-2 w-18 text-center">Al duplex mm²</th>
                <th className="px-2 py-2 w-18 text-center">Al triplex mm²</th>
                <th className="px-2 py-2 w-18 text-center">Al quad. mm²</th>
                <th className="px-2 py-2 w-18 text-center">Eletr. aco pol.</th>
                <th className="px-2 py-2 w-18 text-center">Cond F/N mm²</th>
                <th className="px-2 py-2 w-18 text-center">Aterr. mm²</th>
                <th className="px-2 py-2 w-18 text-center">Eletr. aterr. pol.</th>
                <th className="px-2 py-2 w-32">Notas</th>
                <th className="px-2 py-2 w-20 text-center">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, idx) => (
                <tr key={row._key} className="bg-white hover:bg-slate-50">
                  <td className="px-2 py-1.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <select
                      value={row.supplyType}
                      onChange={(e) => updateRow(row._key, "supplyType", e.target.value)}
                      className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs focus:border-[#19A7E8] focus:outline-none"
                    >
                      <option value="MONOFASICO">Monofasico</option>
                      <option value="BIFASICO">Bifasico</option>
                      <option value="TRIFASICO">Trifasico</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <NumCell
                      value={row.loadMinKw}
                      onChange={(v) => updateRow(row._key, "loadMinKw", v)}
                      placeholder="vazio=Ate"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <NumCell
                      value={row.loadMaxKw}
                      onChange={(v) => updateRow(row._key, "loadMaxKw", v)}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <NumCell
                      value={row.breakerAmp}
                      onChange={(v) => updateRow(row._key, "breakerAmp", v)}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <TxtCell
                      value={row.breakerType}
                      onChange={(v) => updateRow(row._key, "breakerType", v)}
                      width="w-16"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <NumCell value={row.copperConcentricMm2} onChange={(v) => updateRow(row._key, "copperConcentricMm2", v)} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <NumCell value={row.copperMultiplexedMm2} onChange={(v) => updateRow(row._key, "copperMultiplexedMm2", v)} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <NumCell value={row.aluminumDuplexMm2} onChange={(v) => updateRow(row._key, "aluminumDuplexMm2", v)} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <NumCell value={row.aluminumTriplexMm2} onChange={(v) => updateRow(row._key, "aluminumTriplexMm2", v)} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <NumCell value={row.aluminumQuadruplexMm2} onChange={(v) => updateRow(row._key, "aluminumQuadruplexMm2", v)} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <TxtCell value={row.galvanizedSteelConduitInch} onChange={(v) => updateRow(row._key, "galvanizedSteelConduitInch", v)} width="w-16" />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <NumCell value={row.customerPhaseNeutralConductorMm2} onChange={(v) => updateRow(row._key, "customerPhaseNeutralConductorMm2", v)} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <NumCell value={row.groundingConductorMm2} onChange={(v) => updateRow(row._key, "groundingConductorMm2", v)} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <TxtCell value={row.groundingConduitInch} onChange={(v) => updateRow(row._key, "groundingConduitInch", v)} width="w-16" />
                  </td>
                  <td className="px-2 py-1.5">
                    <TxtCell value={row.notes} onChange={(v) => updateRow(row._key, "notes", v)} width="w-28" />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => duplicateRow(row._key)}
                        title="Duplicar linha"
                        className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        Dup.
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(row._key)}
                        title="Remover linha"
                        className="rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-50 hover:text-red-600"
                      >
                        Rem.
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-xs text-slate-400">
          * Campos obrigatorios por linha. Carga min vazia = &quot;Ate X kW&quot;. Use ponto ou virgula para decimais.
        </div>
      </div>

      {/* ── Step 3: Validate and save ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          3. Validar e salvar
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Ao clicar em <strong>Salvar como Validada</strong>, a tabela sera gravada no banco com
          status <span className="rounded bg-green-100 px-1 text-green-700 text-xs font-semibold">VALIDATED</span> e
          estara disponivel imediatamente para consulta estruturada no chat tecnico.
        </p>

        {feedback && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm ${
              feedback.ok
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
          >
            {submitting ? "Salvando..." : "Salvar como Validada"}
          </button>
          <a
            href="/admin/normative-tables"
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancelar
          </a>
        </div>
      </div>
    </div>
  );
}
