"use client";

import { useState } from "react";
import type { AdminNormativeAsset } from "@/features/admin/lib/normative-assets";

type Props = {
  initialAssets: AdminNormativeAsset[];
};

export function NormativeAssetsClient({ initialAssets }: Props) {
  const [assets, setAssets] = useState(initialAssets);
  const [statusFilter, setStatusFilter] = useState("VALIDATED");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ACTIVE");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const counts = buildCounts(assets);
  const types = Array.from(new Set(assets.map((asset) => asset.type))).sort();
  const filteredAssets = assets.filter((asset) => {
    const matchesStatus = statusFilter === "ALL" || asset.validationStatus === statusFilter;
    const matchesType = typeFilter === "ALL" || asset.type === typeFilter;
    const matchesActive =
      activeFilter === "ALL" ||
      (activeFilter === "ACTIVE" ? asset.isActive : !asset.isActive);
    const haystack = [
      asset.title,
      asset.code,
      asset.documentTitle,
      asset.concessionaire,
      asset.state,
      asset.voltageLevel,
      ...asset.tags,
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
    return matchesStatus && matchesType && matchesActive && matchesQuery;
  });

  async function updateAsset(asset: AdminNormativeAsset, patch: Record<string, unknown>) {
    setBusy(asset.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/normative-assets/${asset.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!data.ok) {
        setMessage(data.message ?? "Nao foi possivel atualizar o ativo.");
        return;
      }
      setAssets((current) =>
        current.map((item) => item.id === asset.id ? { ...item, ...data.asset } : item),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Validados ativos" value={counts.validatedActive} tone="green" />
          <Metric label="Pendentes/revisao" value={counts.pendingOrReview} tone="amber" />
          <Metric label="Inativos" value={counts.inactive} tone="slate" />
          <Metric label="Total carregado" value={assets.length} tone="blue" />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#19A7E8]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por tabela, documento, UF, concessionaria..."
            value={query}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#19A7E8]"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="VALIDATED">Somente validados</option>
            <option value="PENDING">Pendentes</option>
            <option value="NEEDS_REVIEW">Precisa revisar</option>
            <option value="REJECTED">Rejeitados</option>
            <option value="ALL">Todos os status</option>
          </select>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#19A7E8]"
            onChange={(event) => setTypeFilter(event.target.value)}
            value={typeFilter}
          >
            <option value="ALL">Todos os tipos</option>
            {types.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#19A7E8]"
            onChange={(event) => setActiveFilter(event.target.value)}
            value={activeFilter}
          >
            <option value="ACTIVE">Somente ativos</option>
            <option value="INACTIVE">Somente inativos</option>
            <option value="ALL">Ativos e inativos</option>
          </select>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Exibindo {filteredAssets.length} de {assets.length}. Por padrao, esta tela mostra apenas ativos validados e ativos.
        </p>
      </div>
      {message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </div>
      )}
      {assets.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Nenhum ativo normativo cadastrado. Reprocesse um documento para gerar ativos.
        </div>
      ) : (
        filteredAssets.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Nenhum ativo encontrado com os filtros atuais.
          </div>
        ) : filteredAssets.map((asset) => (
          <AssetCard
            asset={asset}
            busy={busy === asset.id}
            key={asset.id}
            updateAsset={updateAsset}
          />
        ))
      )}
    </div>
  );
}

function buildCounts(assets: AdminNormativeAsset[]) {
  return {
    validatedActive: assets.filter((asset) => asset.validationStatus === "VALIDATED" && asset.isActive).length,
    pendingOrReview: assets.filter((asset) =>
      asset.validationStatus === "PENDING" || asset.validationStatus === "NEEDS_REVIEW",
    ).length,
    inactive: assets.filter((asset) => !asset.isActive).length,
  };
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "slate" | "blue";
}) {
  const cls = {
    green: "border-green-100 bg-green-50 text-green-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    slate: "border-slate-100 bg-slate-50 text-slate-700",
    blue: "border-blue-100 bg-blue-50 text-blue-800",
  }[tone];

  return (
    <div className={`rounded-xl border px-3 py-2 ${cls}`}>
      <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function AssetCard({
  asset,
  busy,
  updateAsset,
}: {
  asset: AdminNormativeAsset;
  busy: boolean;
  updateAsset: (asset: AdminNormativeAsset, patch: Record<string, unknown>) => Promise<void>;
}) {
  const [jsonText, setJsonText] = useState(JSON.stringify(asset.structuredDataJson ?? {}, null, 2));

  function saveJson() {
    try {
      const structuredDataJson = JSON.parse(jsonText);
      void updateAsset(asset, { structuredDataJson });
    } catch {
      void updateAsset(asset, { message: "JSON invalido." });
    }
  }

  const statusClass =
    asset.validationStatus === "VALIDATED"
      ? "bg-green-100 text-green-800"
      : asset.validationStatus === "REJECTED"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {asset.type}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
              {asset.validationStatus}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${asset.isActive ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
              {asset.isActive ? "ativo" : "inativo"}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-[#0F172A]">{asset.title}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {asset.documentTitle} | {asset.versionLabel} | Pag. {asset.pageNumber}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {asset.code ?? "-"} | {asset.concessionaire ?? "-"} | {asset.state ?? "-"} | {asset.voltageLevel ?? "-"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-800 disabled:opacity-50"
            disabled={busy}
            onClick={() => updateAsset(asset, { validationStatus: "VALIDATED" })}
            type="button"
          >
            Validar
          </button>
          <button
            className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50"
            disabled={busy}
            onClick={() => updateAsset(asset, { validationStatus: "NEEDS_REVIEW" })}
            type="button"
          >
            Revisar
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
            disabled={busy}
            onClick={() => updateAsset(asset, { isActive: !asset.isActive })}
            type="button"
          >
            {asset.isActive ? "Inativar" : "Ativar"}
          </button>
        </div>
      </div>

      {asset.imageStoragePath ? (
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
          Imagem original: {asset.imageStoragePath}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-500">
          Imagem original ainda nao associada.
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Texto extraido
          </p>
          <pre className="max-h-56 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
            {(asset.extractedText ?? "").slice(0, 3000) || "Sem texto extraido."}
          </pre>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Dados estruturados
          </p>
          <textarea
            className="h-56 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700 outline-none focus:border-[#19A7E8]"
            onChange={(event) => setJsonText(event.target.value)}
            value={jsonText}
          />
          <button
            className="mt-2 rounded-lg bg-[#123C7C] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            disabled={busy}
            onClick={saveJson}
            type="button"
          >
            Salvar JSON
          </button>
        </div>
      </div>
    </section>
  );
}
