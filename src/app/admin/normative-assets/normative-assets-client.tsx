"use client";

import { useState } from "react";
import type { AdminNormativeAsset } from "@/features/admin/lib/normative-assets";

type Props = {
  initialAssets: AdminNormativeAsset[];
};

export function NormativeAssetsClient({ initialAssets }: Props) {
  const [assets, setAssets] = useState(initialAssets);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        assets.map((asset) => (
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
