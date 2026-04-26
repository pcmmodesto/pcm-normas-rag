"use client";

import { useState } from "react";

type Candidate = {
  chunkId: string;
  documentTitle: string;
  pageNumber: number;
  chunkType: string;
  sectionNumber: string | null;
  sectionTitle: string | null;
  tableNumber: string | null;
  score: number;
  reasons: string[];
  rejected: boolean;
  rejectionReason?: string;
  textPreview: string;
};

type DebugInfo = {
  intent: string;
  intentLabel: string;
  audience: string;
  audienceLabel: string;
  keywords: string[];
  searchTerms: string[];
  minScore: number;
  candidateCount: number;
  candidates: Candidate[];
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
  SECTION: "bg-purple-100 text-purple-800",
  TEXT: "bg-slate-100 text-slate-600",
  ADMINISTRATIVE: "bg-red-100 text-red-700",
  SUMMARY: "bg-red-100 text-red-700",
  DEFINITION: "bg-amber-100 text-amber-700",
  REQUIREMENT: "bg-green-100 text-green-700",
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
            placeholder="Ex.: Qual o padrao de entrada de uma casa com carga de 15 kVA?"
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
          {/* Classification */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#123C7C]">
              Classificacao
            </p>
            <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-4">
              <Row label="Intencao" value={`${debug.intent} — ${debug.intentLabel}`} />
              <Row label="Audiencia" value={`${debug.audience} — ${debug.audienceLabel}`} />
              <Row label="Score minimo" value={String(debug.minScore)} />
              <Row label="Candidatos / Aprovados" value={`${debug.candidateCount} / ${passing.length}`} />
            </div>
          </div>

          {/* Terms */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#123C7C]">
              Termos
            </p>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-700">Keywords: </span>
                <TagList tags={debug.keywords} color="blue" />
              </div>
              <div>
                <span className="font-medium text-slate-700">Busca SQL: </span>
                <TagList tags={debug.searchTerms} color="slate" />
              </div>
            </div>
          </div>

          {/* Passing chunks */}
          {passing.length > 0 && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-green-800">
                Chunks aprovados ({passing.length})
              </p>
              <div className="space-y-3">
                {passing.map((c) => (
                  <ChunkCard key={c.chunkId} chunk={c} variant="passing" />
                ))}
              </div>
            </div>
          )}

          {/* Below threshold */}
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

          {/* Rejected chunks */}
          {rejected.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-800">
                Rejeitados por score/gate ({rejected.length})
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
              Nenhum chunk passou no filtro. Base normativa insuficiente para esta pergunta.
            </div>
          )}
        </div>
      )}
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
        {chunk.sectionNumber && (
          <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
            §{chunk.sectionNumber}
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
