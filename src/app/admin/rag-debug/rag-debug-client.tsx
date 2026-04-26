"use client";

import { useState } from "react";

type Candidate = {
  chunkId: string;
  documentTitle: string;
  pageNumber: number;
  chunkType: string;
  pageType: string | null;
  technicalIntent: string | null;
  drawingNumber?: string | null;
  relatedTableNumber?: string | null;
  tableRows?: unknown[];
  asteriskItems?: unknown[];
  responsibility?: string | null;
  measurements?: unknown[];
  technicalNotes?: unknown[];
  sectionNumber: string | null;
  sectionTitle: string | null;
  tableNumber: string | null;
  score: number;
  textualScore?: number;
  technicalScore?: number;
  penaltyScore?: number;
  finalScore?: number;
  reasons: string[];
  rejected: boolean;
  rejectionReason?: string;
  sourceRole?: "MAIN" | "AUXILIARY" | "REJECTED";
  textPreview: string;
};

type ExpandedTerm = {
  term: string;
  reason: string;
  source: "original" | "intent" | "service";
};

type DebugInfo = {
  intent: string;
  intentLabel: string;
  secondaryIntents?: string[];
  secondaryIntentLabels?: string[];
  audience: string;
  audienceLabel: string;
  classificationMode?: string;
  keywords: string[];
  technicalEntities?: Record<string, unknown>;
  structuredLookup?: StructuredLookup;
  expandedTerms?: ExpandedTerm[];
  searchTerms: string[];
  minScore: number;
  isTechnicalSourceSufficient?: boolean;
  hasStrongTechnicalSource?: boolean;
  hasDimensioningTableOrCriteria?: boolean;
  candidateCount: number;
  candidates: Candidate[];
};

type StructuredLookup = {
  mode: string;
  attempted: boolean;
  found: boolean;
  reason: string;
  table?: Record<string, unknown>;
  selectedRow?: Record<string, unknown>;
  candidateRows?: Record<string, unknown>[];
  kvaKwNotice?: string;
};

type DebugResult = {
  ok: boolean;
  intent?: string;
  intentLabel?: string;
  audience?: string;
  audienceLabel?: string;
  answerType?: string;
  isSufficient?: boolean;
  termsSearched?: string[];
  answer?: string;
  sources?: unknown[];
  debugInfo?: DebugInfo;
  message?: string;
};

const CHUNK_TYPE_COLORS: Record<string, string> = {
  TABLE: "bg-blue-100 text-blue-800",
  TABLE_ROW: "bg-blue-50 text-blue-700",
  TABLE_TEXT: "bg-blue-50 text-blue-700",
  SECTION: "bg-purple-100 text-purple-800",
  TEXT: "bg-slate-100 text-slate-600",
  ADMINISTRATIVE: "bg-red-100 text-red-700",
  SUMMARY: "bg-red-100 text-red-700",
  DEFINITION: "bg-amber-100 text-amber-700",
  REQUIREMENT: "bg-green-100 text-green-700",
  DIMENSIONING_CRITERIA: "bg-emerald-100 text-emerald-800",
  ANNEX: "bg-indigo-100 text-indigo-700",
};

export function RagDebugClient() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<DebugResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: trimmed, debug: true }),
      });
      const data = (await response.json()) as DebugResult;
      setResult(data);
    } catch {
      setError("Erro ao conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  const debug = result?.debugInfo;
  const passing =
    debug?.candidates.filter((c) => !c.rejected && c.score >= debug.minScore) ?? [];
  const mainChunks =
    debug?.candidates.filter((c) => c.sourceRole === "MAIN" && !c.rejected) ?? [];
  const auxiliaryChunks =
    debug?.candidates.filter((c) => c.sourceRole === "AUXILIARY" && !c.rejected) ?? [];
  const rejected = debug?.candidates.filter((c) => c.rejected) ?? [];
  const belowThreshold =
    debug?.candidates.filter((c) => !c.rejected && c.score < debug.minScore) ?? [];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#19A7E8] focus:ring-4 focus:ring-[#19A7E8]/10"
            disabled={loading}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex.: qual sera o cabo de entrada para uma casa com 45 kVA?"
            value={question}
          />
          <div className="flex justify-end">
            <button
              className="rounded-xl bg-[#123C7C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A2456] disabled:opacity-50"
              disabled={loading || !question.trim()}
              type="submit"
            >
              {loading ? "Analisando..." : "Diagnosticar"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && !result.ok && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {result.message}
        </div>
      )}

      {result?.ok && debug && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#123C7C]">
              Classificacao
            </p>
            <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-4">
              <Row label="Intencao" value={`${debug.intent} - ${debug.intentLabel}`} />
              <Row
                label="Secundarias"
                value={
                  debug.secondaryIntents?.length
                    ? debug.secondaryIntents
                        .map((intent, index) => `${intent} - ${debug.secondaryIntentLabels?.[index] ?? ""}`)
                        .join(", ")
                    : "(nenhuma)"
                }
              />
              <Row label="Audiencia" value={`${debug.audience} - ${debug.audienceLabel}`} />
              <Row label="Modo" value={debug.classificationMode ?? "-"} />
              <Row label="Score minimo" value={String(debug.minScore)} />
              <Row label="Candidatos / Aprovados" value={`${debug.candidateCount} / ${passing.length}`} />
              <Row
                label="Fonte tecnica"
                value={debug.isTechnicalSourceSufficient ? "suficiente" : "insuficiente"}
              />
              <Row
                label="Tabela/Criterio"
                value={debug.hasDimensioningTableOrCriteria ? "encontrado" : "nao encontrado"}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#123C7C]">
              Termos
            </p>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-700">Termos originais: </span>
                <TagList tags={debug.keywords} color="blue" />
              </div>
              <div>
                <span className="font-medium text-slate-700">Termos expandidos: </span>
                <TagList tags={debug.searchTerms} color="slate" />
              </div>
              {debug.technicalEntities && (
                <div>
                  <span className="font-medium text-slate-700">Entidades tecnicas: </span>
                  <TagList
                    tags={Object.entries(debug.technicalEntities)
                      .filter(([, value]) => Boolean(value) && !Array.isArray(value))
                      .map(([key, value]) => `${key}: ${String(value)}`)}
                    color="amber"
                  />
                </div>
              )}
              {debug.expandedTerms && debug.expandedTerms.length > 0 && (
                <div className="grid gap-2 pt-2 md:grid-cols-2">
                  {debug.expandedTerms.map((term) => (
                    <div
                      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                      key={`${term.source}-${term.term}`}
                    >
                      <span className="font-semibold text-slate-800">{term.term}</span>
                      <span className="ml-2 rounded bg-white px-1.5 py-0.5 text-[11px] uppercase text-slate-500">
                        {term.source}
                      </span>
                      <p className="mt-1">{term.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {debug.structuredLookup && (
            <StructuredLookupPanel lookup={debug.structuredLookup} />
          )}

          {mainChunks.length > 0 && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-green-800">
                Chunks principais ({mainChunks.length})
              </p>
              <div className="space-y-3">
                {mainChunks.map((c) => (
                  <ChunkCard key={c.chunkId} chunk={c} variant="passing" />
                ))}
              </div>
            </div>
          )}

          {auxiliaryChunks.length > 0 && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sky-800">
                Chunks auxiliares ({auxiliaryChunks.length})
              </p>
              <div className="space-y-3">
                {auxiliaryChunks.map((c) => (
                  <ChunkCard key={c.chunkId} chunk={c} variant="below" />
                ))}
              </div>
            </div>
          )}

          {belowThreshold.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-800">
                Abaixo do threshold ({belowThreshold.length})
              </p>
              <div className="space-y-3">
                {belowThreshold.map((c) => (
                  <ChunkCard key={c.chunkId} chunk={c} variant="below" />
                ))}
              </div>
            </div>
          )}

          {rejected.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-800">
                Chunks rejeitados ({rejected.length})
              </p>
              <div className="space-y-3">
                {rejected.map((c) => (
                  <ChunkCard key={c.chunkId} chunk={c} variant="rejected" />
                ))}
              </div>
            </div>
          )}

          {!result.isSufficient && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
              Base normativa insuficiente para resposta tecnica segura.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StructuredLookupPanel({ lookup }: { lookup: StructuredLookup }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-900">
        Consulta estruturada em tabelas
      </p>
      <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-4">
        <Row label="Modo" value={lookup.mode} />
        <Row label="Executada" value={lookup.attempted ? "sim" : "nao"} />
        <Row label="Tabela encontrada" value={lookup.found ? "sim" : "nao"} />
        <Row label="Motivo" value={lookup.reason} />
      </div>
      {lookup.kvaKwNotice && (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-blue-900">
          {lookup.kvaKwNotice}
        </p>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {lookup.table && (
          <JsonBox title="Tabela encontrada" value={lookup.table} />
        )}
        {lookup.selectedRow && (
          <JsonBox title="Linha selecionada" value={lookup.selectedRow} />
        )}
      </div>
      {lookup.candidateRows && lookup.candidateRows.length > 0 && (
        <div className="mt-3">
          <JsonBox title={`Linhas candidatas (${lookup.candidateRows.length})`} value={lookup.candidateRows} />
        </div>
      )}
    </div>
  );
}

function JsonBox({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white p-3 text-xs text-slate-700">
      <p className="mb-2 font-semibold text-blue-900">{title}</p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <p className="mt-0.5 font-medium text-[#0F172A]">{value}</p>
    </div>
  );
}

function TagList({ tags, color }: { tags: string[]; color: "blue" | "amber" | "slate" }) {
  const cls = {
    blue: "bg-[#E0F2FE] text-[#075985]",
    amber: "bg-amber-100 text-amber-800",
    slate: "bg-slate-100 text-slate-600",
  }[color];

  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {tags.map((t) => (
        <span key={t} className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
          {t}
        </span>
      ))}
      {tags.length === 0 && <span className="text-slate-400">(nenhum)</span>}
    </span>
  );
}

function ChunkCard({
  chunk,
  variant,
}: {
  chunk: Candidate;
  variant: "passing" | "below" | "rejected";
}) {
  const [expanded, setExpanded] = useState(false);

  const scoreCls =
    variant === "passing"
      ? "bg-green-100 text-green-800"
      : variant === "rejected"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";

  const typeCls =
    CHUNK_TYPE_COLORS[chunk.chunkType] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-medium text-[#0F172A]">{chunk.documentTitle}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          Pag. {chunk.pageNumber}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeCls}`}>
          {chunk.chunkType}
        </span>
        {chunk.pageType && (
          <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
            {chunk.pageType}
          </span>
        )}
        {chunk.technicalIntent && (
          <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs text-cyan-700">
            {chunk.technicalIntent}
          </span>
        )}
        {chunk.drawingNumber && (
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
            Desenho {chunk.drawingNumber}
          </span>
        )}
        {chunk.relatedTableNumber && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
            Tabela {chunk.relatedTableNumber}
          </span>
        )}
        {chunk.responsibility && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
            {chunk.responsibility}
          </span>
        )}
        {chunk.sourceRole && (
          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
            {chunk.sourceRole}
          </span>
        )}
        {chunk.sectionNumber && (
          <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
            Secao {chunk.sectionNumber}
            {chunk.sectionTitle ? ` ${chunk.sectionTitle}` : ""}
          </span>
        )}
        {chunk.tableNumber && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
            Tabela {chunk.tableNumber}
          </span>
        )}
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreCls}`}>
          Score: {chunk.score}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          TXT {chunk.textualScore ?? 0}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          TEC {chunk.technicalScore ?? 0}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          PEN {chunk.penaltyScore ?? 0}
        </span>
        {chunk.rejected && chunk.rejectionReason && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
            {chunk.rejectionReason}
          </span>
        )}
      </div>

      {chunk.reasons.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {chunk.reasons.map((r, i) => (
            <span key={i} className="rounded bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
              {r}
            </span>
          ))}
        </div>
      )}

      <StructuredMetadata chunk={chunk} />

      <div>
        <p className={`text-xs leading-relaxed text-slate-600 ${expanded ? "" : "line-clamp-3"}`}>
          {chunk.textPreview}
        </p>
        <button
          className="mt-1 text-xs text-[#19A7E8] hover:underline"
          onClick={() => setExpanded((v) => !v)}
          type="button"
        >
          {expanded ? "Recolher" : "Ver trecho completo"}
        </button>
      </div>
    </div>
  );
}

function StructuredMetadata({ chunk }: { chunk: Candidate }) {
  const rows = chunk.tableRows ?? [];
  const asteriskItems = chunk.asteriskItems ?? [];
  const measurements = chunk.measurements ?? [];
  const notes = chunk.technicalNotes ?? [];

  if (
    rows.length === 0 &&
    asteriskItems.length === 0 &&
    measurements.length === 0 &&
    notes.length === 0
  ) {
    return null;
  }

  return (
    <div className="mb-2 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
      {measurements.length > 0 && (
        <MetadataBox title="Cotas detectadas" items={measurements.slice(0, 4)} />
      )}
      {notes.length > 0 && (
        <MetadataBox title="Notas tecnicas" items={notes.slice(0, 4)} />
      )}
      {asteriskItems.length > 0 && (
        <MetadataBox title="Itens com asterisco" items={asteriskItems.slice(0, 8)} />
      )}
      {rows.length > 0 && (
        <MetadataBox title="Table rows" items={rows.slice(0, 8)} />
      )}
    </div>
  );
}

function MetadataBox({ title, items }: { title: string; items: unknown[] }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
      <p className="mb-1 font-semibold text-slate-700">{title}</p>
      <div className="space-y-1">
        {items.map((item, index) => (
          <p className="line-clamp-2" key={index}>
            {formatMetadataItem(item)}
          </p>
        ))}
      </div>
    </div>
  );
}

function formatMetadataItem(item: unknown) {
  if (!item || typeof item !== "object") return String(item);
  const obj = item as Record<string, unknown>;
  if ("measurementName" in obj) {
    return `${obj.measurementName}: ${obj.value} ${obj.unit} +/- ${obj.tolerance ?? "-"}`;
  }
  if ("item" in obj) {
    return `${obj.item} - ${obj.description} (${obj.quantity}) ${obj.responsibility ?? ""}`;
  }
  if ("noteNumber" in obj) {
    return `Nota ${obj.noteNumber ?? "-"}: ${obj.text}`;
  }
  return JSON.stringify(obj);
}
