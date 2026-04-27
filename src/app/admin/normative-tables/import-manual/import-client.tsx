"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DocVersionOption } from "./page";

type AssetType = "TABLE" | "DRAWING" | "FIGURE" | "NOTE" | "LEGEND" | "REQUIREMENT";
type ValidationStatus = "PENDING" | "VALIDATED" | "NEEDS_REVIEW";

type FilePreview = {
  file: File;
  name: string;
  type: "image" | "pdf";
  url: string;
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

type ExtractedAsset = {
  assetType?: AssetType;
  category?: string;
  code?: string;
  number?: string;
  title?: string;
  voltage?: string;
  description?: string;
  genericRowsText?: string;
  notesText?: string;
  dimensioningRows?: Array<Record<string, unknown>>;
  confidence?: string;
  warnings?: string[];
};

const ASSET_TYPES: Array<{ value: AssetType; label: string; hint: string }> = [
  { value: "TABLE", label: "Tabela", hint: "Dimensionamento, demanda, potencia, municipio ou materiais." },
  { value: "DRAWING", label: "Desenho", hint: "Padrao construtivo, caixa, poste, entrada, afastamento." },
  { value: "FIGURE", label: "Detalhe/Figura", hint: "Detalhe tecnico, corte, cota, vista ou componente." },
  { value: "LEGEND", label: "Legenda", hint: "Itens numerados, materiais e responsabilidades." },
  { value: "NOTE", label: "Nota", hint: "Nota normativa, regra pontual, tolerancia ou ressalva." },
  { value: "REQUIREMENT", label: "Requisito", hint: "Obrigacao tecnica ou criterio de atendimento." },
];

const ASSET_PURPOSES = [
  { value: "SERVICE_ENTRANCE_SIZING", label: "Dimensionamento do ramal/entrada", mode: "DIMENSIONING" },
  { value: "APPLIANCE_POWER", label: "Potencia de aparelhos", mode: "GENERIC_TABLE" },
  { value: "DEMAND_FACTOR", label: "Fator de demanda", mode: "GENERIC_TABLE" },
  { value: "MINIMUM_LOAD_DEMAND", label: "Carga minima e demanda", mode: "GENERIC_TABLE" },
  { value: "VOLTAGE_BY_CITY", label: "Tensao por municipio", mode: "GENERIC_TABLE" },
  { value: "MATERIAL_DIMENSIONS", label: "Dimensoes de material", mode: "GENERIC_TABLE" },
  { value: "METERING_DRAWING", label: "Desenho de medicao/padrao", mode: "FIGURE_ITEMS" },
  { value: "CONDUIT_DETAIL", label: "Detalhe de eletroduto", mode: "FIGURE_ITEMS" },
  { value: "POST_DETAIL", label: "Detalhe de poste/haste", mode: "FIGURE_ITEMS" },
  { value: "RESPONSIBILITY_LEGEND", label: "Legenda e responsabilidade", mode: "FIGURE_ITEMS" },
  { value: "GENERAL_REQUIREMENT", label: "Requisito ou nota geral", mode: "NOTES" },
];

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
  return Number.isFinite(n) ? n : null;
}

function valueToString(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return text === "-" || text === "–" ? "" : text;
}

function normalizeSupplyType(value: unknown) {
  const text = valueToString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (text.includes("MONO")) return "MONOFASICO";
  if (text.includes("BI")) return "BIFASICO";
  if (text.includes("TRI")) return "TRIFASICO";
  return text || "TRIFASICO";
}

function normalizeBreakerAmp(value: unknown, breakerType: unknown) {
  const direct = valueToString(value);
  if (direct) return direct;

  const match = valueToString(breakerType).match(/\d+(?:[,.]\d+)?/);
  return match?.[0] ?? "";
}

function normalizeBreakerType(value: unknown) {
  const text = valueToString(value);
  if (!text) return "";
  if (/mono/i.test(text)) return "MONO";
  if (/tri/i.test(text)) return "TRI";
  if (/bi/i.test(text)) return "BI";
  return text.replace(/\d+(?:[,.]\d+)?/g, "").replace(/[()]/g, "").trim();
}

function rowFromExtracted(input: Record<string, unknown>): RowInput {
  return {
    _key: mkKey(),
    supplyType: normalizeSupplyType(input.supplyType || input.breakerType),
    loadMinKw: valueToString(input.loadMinKw),
    loadMaxKw: valueToString(input.loadMaxKw),
    breakerAmp: normalizeBreakerAmp(input.breakerAmp, input.breakerType),
    breakerType: normalizeBreakerType(input.breakerType),
    copperConcentricMm2: valueToString(input.copperConcentricMm2),
    copperMultiplexedMm2: valueToString(input.copperMultiplexedMm2),
    aluminumDuplexMm2: valueToString(input.aluminumDuplexMm2),
    aluminumTriplexMm2: valueToString(input.aluminumTriplexMm2),
    aluminumQuadruplexMm2: valueToString(input.aluminumQuadruplexMm2),
    galvanizedSteelConduitInch: valueToString(input.galvanizedSteelConduitInch),
    customerPhaseNeutralConductorMm2: valueToString(input.customerPhaseNeutralConductorMm2),
    groundingConductorMm2: valueToString(input.groundingConductorMm2),
    groundingConduitInch: valueToString(input.groundingConduitInch),
    notes: valueToString(input.notes),
  };
}

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
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {preview.type === "image" ? (
            <img src={preview.url} alt={preview.name} className="max-h-[420px] w-full object-contain" />
          ) : (
            <iframe src={preview.url} title={preview.name} className="h-[420px] w-full" />
          )}
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs text-red-600 shadow hover:bg-red-50"
          >
            Remover
          </button>
          <p className="truncate px-3 py-1.5 text-xs text-slate-500">{preview.name}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-[#19A7E8] hover:bg-blue-50 hover:text-[#19A7E8]"
        >
          <span className="text-3xl leading-none">+</span>
          <span className="text-sm font-medium">Carregar imagem ou PDF</span>
          <span className="text-xs">A evidencia fica vinculada ao ativo</span>
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

function NumCell({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "-"}
      className="w-16 rounded border border-slate-200 px-1.5 py-1 text-center text-xs focus:border-[#19A7E8] focus:outline-none"
    />
  );
}

function TxtCell({ value, onChange, width = "w-20" }: { value: string; onChange: (v: string) => void; width?: string }) {
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

export function ImportManualClient({ versions }: { versions: DocVersionOption[] }) {
  const router = useRouter();
  const [previews, setPreviews] = useState<[FilePreview | null, FilePreview | null]>([null, null]);
  const [versionKey, setVersionKey] = useState<string>(() => {
    if (versions.length === 0) return "";
    const v = versions[0];
    return `${v.versionId}|${v.documentId}|${v.concessionaire ?? ""}|${(v.stateCodes ?? []).join(",")}`;
  });
  const [assetType, setAssetType] = useState<AssetType>("TABLE");
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>("NEEDS_REVIEW");
  const [meta, setMeta] = useState({
    code: "",
    number: "",
    title: "",
    voltage: "127/220V",
    category: "SERVICE_ENTRANCE_SIZING",
    pdfPage: "",
    printedPage: "",
    revision: "",
    homologationDate: "",
    method: "CARGA_INSTALADA",
    relatedTable: "",
    tags: "",
  });
  const [description, setDescription] = useState("");
  const [genericRowsText, setGenericRowsText] = useState("");
  const [notesText, setNotesText] = useState("");
  const [rows, setRows] = useState<RowInput[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const purpose = ASSET_PURPOSES.find((item) => item.value === meta.category) ?? ASSET_PURPOSES[0];
  const isDimensioning = assetType === "TABLE" && purpose.mode === "DIMENSIONING";

  const handleFile = useCallback((index: 0 | 1, file: File) => {
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("image/") ? "image" : "pdf";
    setPreviews((prev) => {
      const next: [FilePreview | null, FilePreview | null] = [...prev] as [FilePreview | null, FilePreview | null];
      if (next[index]) URL.revokeObjectURL(next[index]!.url);
      next[index] = { file, name: file.name, type, url };
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

  function updateRow(key: string, field: keyof RowInput, value: string) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
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
      const next = [...prev];
      next.splice(idx + 1, 0, { ...prev[idx], _key: mkKey() });
      return next;
    });
  }

  async function handleExtractFromEvidence() {
    setFeedback(null);
    const sources = previews.filter((preview): preview is FilePreview => Boolean(preview));
    if (!sources.length) {
      setFeedback({ ok: false, message: "Carregue uma imagem ou PDF antes de extrair." });
      return;
    }

    const form = new FormData();
    sources.forEach((source) => form.append("files", source.file, source.name));
    form.set("assetType", assetType);
    form.set("category", meta.category);
    form.set("code", meta.code);
    form.set("number", meta.number);
    form.set("title", meta.title);
    form.set("voltage", meta.voltage);
    form.set("printedPage", meta.printedPage);

    setExtracting(true);
    try {
      const response = await fetch("/api/admin/normative-assets/extract", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        extracted?: ExtractedAsset;
      };
      if (!data.ok || !data.extracted) {
        setFeedback({ ok: false, message: data.message ?? "Nao foi possivel extrair os dados." });
        return;
      }

      const extracted = data.extracted;
      if (extracted.assetType) setAssetType(extracted.assetType);
      setMeta((current) => ({
        ...current,
        category: extracted.category || current.category,
        code: extracted.code || current.code,
        number: extracted.number || current.number,
        title: extracted.title || current.title,
        voltage: extracted.voltage || current.voltage,
        method: extracted.category === "SERVICE_ENTRANCE_SIZING" ? current.method : "CONSULTA",
        tags: current.tags || [extracted.category, extracted.code].filter(Boolean).join(", "),
      }));
      if (extracted.description) setDescription(extracted.description);
      if (extracted.genericRowsText) setGenericRowsText(extracted.genericRowsText);
      if (extracted.notesText) setNotesText(extracted.notesText);
      if (Array.isArray(extracted.dimensioningRows) && extracted.dimensioningRows.length > 0) {
        setRows(extracted.dimensioningRows.map(rowFromExtracted));
      }
      const warnings = extracted.warnings?.length ? ` Avisos: ${extracted.warnings.join(" ")}` : "";
      setFeedback({
        ok: true,
        message: `${data.message ?? "Extracao concluida."} ${sources.length} evidencia(s) analisada(s). Confianca: ${extracted.confidence ?? "media"}.${warnings}`,
      });
    } catch (error) {
      setFeedback({ ok: false, message: error instanceof Error ? error.message : "Falha ao chamar extracao visual." });
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(nextStatus: ValidationStatus) {
    setFeedback(null);
    if (!versionKey) {
      setFeedback({ ok: false, message: "Selecione o documento/versao da norma." });
      return;
    }
    if (!meta.title.trim()) {
      setFeedback({ ok: false, message: "Informe o titulo do ativo normativo." });
      return;
    }
    if (assetType === "TABLE" && !meta.number.trim()) {
      setFeedback({ ok: false, message: "Informe o numero da tabela." });
      return;
    }
    if ((assetType === "DRAWING" || assetType === "FIGURE") && !meta.number.trim()) {
      setFeedback({ ok: false, message: "Informe o numero do desenho/detalhe." });
      return;
    }
    if (isDimensioning) {
      for (const row of rows) {
        if (!row.loadMaxKw || !row.breakerAmp) {
          setFeedback({ ok: false, message: "Tabela de dimensionamento precisa de carga max (kW) e disjuntor (A) em todas as linhas." });
          return;
        }
      }
    } else if (!genericRowsText.trim() && !notesText.trim() && !description.trim() && !previews[0] && !previews[1]) {
      setFeedback({ ok: false, message: "Inclua imagem/PDF, descricao, linhas estruturadas ou notas para salvar o ativo." });
      return;
    }

    const [versionId, documentId, concessionaire, stateCodesStr] = versionKey.split("|");
    const form = new FormData();
    form.set("documentVersionId", versionId);
    form.set("documentId", documentId);
    form.set("concessionaire", concessionaire || "");
    form.set("stateCodes", stateCodesStr || "");
    form.set("assetType", assetType);
    form.set("validationStatus", nextStatus);
    form.set("code", meta.code.trim());
    form.set("number", meta.number.trim());
    form.set("title", meta.title.trim());
    form.set("voltage", meta.voltage);
    form.set("category", meta.category);
    form.set("pdfPageNumber", meta.pdfPage);
    form.set("printedPage", meta.printedPage.trim());
    form.set("revision", meta.revision.trim());
    form.set("homologationDate", meta.homologationDate.trim());
    form.set("method", meta.method);
    form.set("relatedTable", meta.relatedTable.trim());
    form.set("tags", meta.tags);
    form.set("description", description);
    form.set("genericRowsText", genericRowsText);
    form.set("notesText", notesText);
    form.set(
      "rows",
      JSON.stringify(
        rows.map((r, i) => ({
          rowIndex: i + 1,
          supplyType: r.supplyType,
          loadMinKw: toNum(r.loadMinKw),
          loadMaxKw: toNum(r.loadMaxKw),
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
      ),
    );
    previews.forEach((preview, index) => {
      if (preview) form.append(`evidence${index + 1}`, preview.file, preview.name);
    });

    setSubmitting(true);
    try {
      const resp = await fetch("/api/admin/normative-tables/import-manual", {
        method: "POST",
        body: form,
      });
      const data = (await resp.json()) as { ok: boolean; message?: string; assetId?: string };
      if (data.ok) {
        setFeedback({ ok: true, message: data.message ?? "Ativo normativo salvo." });
        setTimeout(() => router.push("/admin/normative-assets"), 1200);
      } else {
        setFeedback({ ok: false, message: data.message ?? `Erro HTTP ${resp.status}.` });
      }
    } catch (err) {
      setFeedback({ ok: false, message: err instanceof Error ? err.message : "Nao foi possivel conectar ao servidor." });
    } finally {
      setSubmitting(false);
    }
  }

  const selectedVersion = versions.find((v) => v.versionId === versionKey.split("|")[0]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          1. Evidencia visual, tipo e metadados
        </h2>

        <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {ASSET_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setAssetType(type.value)}
              className={`rounded-xl border p-3 text-left transition ${
                assetType === type.value ? "border-[#19A7E8] bg-blue-50 text-[#123C7C]" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="block text-sm font-semibold">{type.label}</span>
              <span className="mt-1 block text-xs leading-5">{type.hint}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FileSlot label="Imagem / PDF 1" preview={previews[0]} onFile={(f) => handleFile(0, f)} onClear={() => clearFile(0)} />
            <FileSlot label="Imagem / PDF 2 (opcional)" preview={previews[1]} onFile={(f) => handleFile(1, f)} onClear={() => clearFile(1)} />
            <div className="sm:col-span-2 rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
              <p>
                Para tabela escaneada ou desenho, prefira imagem recortada so da tabela/detalhe.
                PDF funciona melhor quando a pagina esta nitida e curta.
              </p>
              <button
                type="button"
                onClick={handleExtractFromEvidence}
                disabled={extracting || (!previews[0] && !previews[1])}
                className="mt-3 rounded-lg bg-[#123C7C] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0A1633] disabled:opacity-50"
              >
                {extracting ? "Extraindo dados..." : "Extrair dados da imagem/PDF"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Documento (norma) *</label>
              {versions.length === 0 ? (
                <p className="mt-1 text-sm text-red-500">Nenhum documento processado (READY) encontrado. Processe um PDF primeiro.</p>
              ) : (
                <select value={versionKey} onChange={(e) => setVersionKey(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none">
                  {versions.map((v) => (
                    <option key={v.versionId} value={`${v.versionId}|${v.documentId}|${v.concessionaire ?? ""}|${(v.stateCodes ?? []).join(",")}`}>
                      {v.documentTitle} - Rev. {v.versionLabel}
                      {v.concessionaire ? ` (${v.concessionaire})` : ""}
                    </option>
                  ))}
                </select>
              )}
              {selectedVersion && (
                <p className="mt-1 text-xs text-slate-400">
                  {selectedVersion.concessionaire ?? "Sem concessionaria"} - {(selectedVersion.stateCodes ?? []).join(", ") || "Sem UF"}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Codigo</label>
              <input type="text" value={meta.code} onChange={(e) => setMeta((m) => ({ ...m, code: e.target.value }))} placeholder="TABELA 2, DESENHO 9, NOTA 37" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Numero</label>
              <input type="text" value={meta.number} onChange={(e) => setMeta((m) => ({ ...m, number: e.target.value }))} placeholder="2, 9, 37..." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Titulo *</label>
              <input type="text" value={meta.title} onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))} placeholder="Dimensionamento do ramal, Caixa de medicao, Eletroduto de aco..." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Finalidade</label>
              <select value={meta.category} onChange={(e) => setMeta((m) => ({ ...m, category: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none">
                {ASSET_PURPOSES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Tensao / nivel</label>
              <select value={meta.voltage} onChange={(e) => setMeta((m) => ({ ...m, voltage: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none">
                <option value="127/220V">127/220 V</option>
                <option value="220/380V">220/380 V</option>
                <option value="BAIXA_TENSAO">Baixa tensao</option>
                <option value="MEDIA_TENSAO">Media tensao</option>
                <option value="">Nao se aplica</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Pagina PDF</label>
              <input type="number" value={meta.pdfPage} onChange={(e) => setMeta((m) => ({ ...m, pdfPage: e.target.value }))} placeholder="32" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Pagina impressa</label>
              <input type="text" value={meta.printedPage} onChange={(e) => setMeta((m) => ({ ...m, printedPage: e.target.value }))} placeholder="32 de 104" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Revisao</label>
              <input type="text" value={meta.revision} onChange={(e) => setMeta((m) => ({ ...m, revision: e.target.value }))} placeholder="09" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Homologacao</label>
              <input type="text" value={meta.homologationDate} onChange={(e) => setMeta((m) => ({ ...m, homologationDate: e.target.value }))} placeholder="22/05/2025" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Metodo/base</label>
              <select value={meta.method} onChange={(e) => setMeta((m) => ({ ...m, method: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none">
                <option value="CARGA_INSTALADA">Carga instalada (kW)</option>
                <option value="DEMANDA">Demanda (kW)</option>
                <option value="CORRENTE">Corrente (A)</option>
                <option value="CONSULTA">Consulta/instrucao</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Tabela relacionada</label>
              <input type="text" value={meta.relatedTable} onChange={(e) => setMeta((m) => ({ ...m, relatedTable: e.target.value }))} placeholder="Tabela 27, se houver" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Tags</label>
              <input type="text" value={meta.tags} onChange={(e) => setMeta((m) => ({ ...m, tags: e.target.value }))} placeholder="ramal, medicao, eletroduto, demanda, municipio" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">2. Estrutura editavel</h2>
        <p className="mb-4 text-sm text-slate-600">
          Tabelas de dimensionamento entram no motor de calculo. Os outros ativos entram como base consultavel, com imagem original, linhas, notas e citacao para orientar a resposta tecnica.
        </p>

        {isDimensioning ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Linhas de dimensionamento ({rows.length})</h3>
              <button type="button" onClick={addRow} className="rounded-lg bg-[#123C7C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0A1633]">+ Adicionar linha</button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[1400px] divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-center">#</th>
                    <th className="px-2 py-2">Tipo fornec.</th>
                    <th className="px-2 py-2 text-center">Carga min kW</th>
                    <th className="px-2 py-2 text-center">Carga max kW *</th>
                    <th className="px-2 py-2 text-center">Disj. A *</th>
                    <th className="px-2 py-2 text-center">Tipo disj.</th>
                    <th className="px-2 py-2 text-center">Cu conc.</th>
                    <th className="px-2 py-2 text-center">Cu multi.</th>
                    <th className="px-2 py-2 text-center">Al duplex</th>
                    <th className="px-2 py-2 text-center">Al triplex</th>
                    <th className="px-2 py-2 text-center">Al quad.</th>
                    <th className="px-2 py-2 text-center">Eletr. aco</th>
                    <th className="px-2 py-2 text-center">Cond F/N</th>
                    <th className="px-2 py-2 text-center">Aterr.</th>
                    <th className="px-2 py-2 text-center">Eletr. aterr.</th>
                    <th className="px-2 py-2">Notas</th>
                    <th className="px-2 py-2 text-center">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((row, idx) => (
                    <tr key={row._key} className="bg-white hover:bg-slate-50">
                      <td className="px-2 py-1.5 text-center text-slate-400">{idx + 1}</td>
                      <td className="px-2 py-1.5">
                        <select value={row.supplyType} onChange={(e) => updateRow(row._key, "supplyType", e.target.value)} className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs focus:border-[#19A7E8] focus:outline-none">
                          <option value="MONOFASICO">Monofasico</option>
                          <option value="BIFASICO">Bifasico</option>
                          <option value="TRIFASICO">Trifasico</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-center"><NumCell value={row.loadMinKw} onChange={(v) => updateRow(row._key, "loadMinKw", v)} placeholder="vazio=Ate" /></td>
                      <td className="px-2 py-1.5 text-center"><NumCell value={row.loadMaxKw} onChange={(v) => updateRow(row._key, "loadMaxKw", v)} /></td>
                      <td className="px-2 py-1.5 text-center"><NumCell value={row.breakerAmp} onChange={(v) => updateRow(row._key, "breakerAmp", v)} /></td>
                      <td className="px-2 py-1.5 text-center"><TxtCell value={row.breakerType} onChange={(v) => updateRow(row._key, "breakerType", v)} width="w-16" /></td>
                      <td className="px-2 py-1.5 text-center"><NumCell value={row.copperConcentricMm2} onChange={(v) => updateRow(row._key, "copperConcentricMm2", v)} /></td>
                      <td className="px-2 py-1.5 text-center"><NumCell value={row.copperMultiplexedMm2} onChange={(v) => updateRow(row._key, "copperMultiplexedMm2", v)} /></td>
                      <td className="px-2 py-1.5 text-center"><NumCell value={row.aluminumDuplexMm2} onChange={(v) => updateRow(row._key, "aluminumDuplexMm2", v)} /></td>
                      <td className="px-2 py-1.5 text-center"><NumCell value={row.aluminumTriplexMm2} onChange={(v) => updateRow(row._key, "aluminumTriplexMm2", v)} /></td>
                      <td className="px-2 py-1.5 text-center"><NumCell value={row.aluminumQuadruplexMm2} onChange={(v) => updateRow(row._key, "aluminumQuadruplexMm2", v)} /></td>
                      <td className="px-2 py-1.5 text-center"><TxtCell value={row.galvanizedSteelConduitInch} onChange={(v) => updateRow(row._key, "galvanizedSteelConduitInch", v)} width="w-16" /></td>
                      <td className="px-2 py-1.5 text-center"><NumCell value={row.customerPhaseNeutralConductorMm2} onChange={(v) => updateRow(row._key, "customerPhaseNeutralConductorMm2", v)} /></td>
                      <td className="px-2 py-1.5 text-center"><NumCell value={row.groundingConductorMm2} onChange={(v) => updateRow(row._key, "groundingConductorMm2", v)} /></td>
                      <td className="px-2 py-1.5 text-center"><TxtCell value={row.groundingConduitInch} onChange={(v) => updateRow(row._key, "groundingConduitInch", v)} width="w-16" /></td>
                      <td className="px-2 py-1.5"><TxtCell value={row.notes} onChange={(v) => updateRow(row._key, "notes", v)} width="w-28" /></td>
                      <td className="px-2 py-1.5 text-center">
                        <button type="button" onClick={() => duplicateRow(row._key)} className="rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100">Dup.</button>
                        <button type="button" onClick={() => removeRow(row._key)} className="rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-50">Rem.</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Descricao interpretada</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} placeholder="Resumo tecnico: o que este desenho/tabela/detalhe define, quando se aplica e quais dados importantes existem." className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Linhas / itens estruturados</label>
              <textarea value={genericRowsText} onChange={(e) => setGenericRowsText(e.target.value)} rows={8} placeholder={"Uma linha por item. Exemplos:\nMunicipio; Tensao; Regional\nItem; Descricao; Quantidade; Responsabilidade\nAparelho; Potencia W"} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none" />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Notas, cotas e regras</label>
              <textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} rows={5} placeholder="Nota 37: cotas em milimetros. Nota 38: rosca tipo BSP. Ou regras de responsabilidade e tolerancias." className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#19A7E8] focus:outline-none" />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">3. Validar e salvar</h2>
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <strong>Fluxo recomendado:</strong> carregue a imagem, transcreva ou extraia os dados principais, salve como revisao se ainda precisa conferir, ou valide quando estiver igual a norma. So ativos validados entram como fonte principal automatica.
        </div>

        {feedback && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${feedback.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
            {feedback.message}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-3">
          <label className="text-sm font-medium text-slate-700">Status inicial</label>
          <select value={validationStatus} onChange={(e) => setValidationStatus(e.target.value as ValidationStatus)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#19A7E8] focus:outline-none">
            <option value="NEEDS_REVIEW">Precisa revisar</option>
            <option value="PENDING">Pendente</option>
            <option value="VALIDATED">Validado</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => handleSubmit(validationStatus)} disabled={submitting} className="rounded-xl bg-[#123C7C] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A1633] disabled:opacity-50">
            {submitting ? "Salvando..." : "Salvar ativo normativo"}
          </button>
          <button type="button" onClick={() => handleSubmit("VALIDATED")} disabled={submitting} className="rounded-xl bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50">
            Salvar e validar
          </button>
          <a href="/admin/normative-assets" className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            Cancelar
          </a>
        </div>
      </div>
    </div>
  );
}
