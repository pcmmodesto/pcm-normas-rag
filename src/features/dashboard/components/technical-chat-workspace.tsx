"use client";

import { useState } from "react";

type Source = {
  documentTitle: string;
  versionLabel: string;
  pageNumber: number;
  chunkIndex: number;
  excerpt: string;
  concessionaire: string | null;
  stateCodes: string[];
  documentType: string;
  score?: number;
};

type AnswerType = "DIRECT" | "PARTIAL" | "INSUFFICIENT" | "NEEDS_CONTEXT";

type QueryResult = {
  ok: boolean;
  intent?: string;
  intentLabel?: string;
  audience?: string;
  audienceLabel?: string;
  answerType?: AnswerType;
  confidence?: number;
  isSufficient?: boolean;
  answer: string;
  normativeSummary?: string;
  missingContext?: string[];
  termsSearched?: string[];
  sources: Source[];
  message?: string;
};

const EXAMPLE_QUESTIONS = [
  "Qual a bitola minima do ramal de entrada para ligacao trifasica?",
  "Quais documentos sao necessarios para ligacao nova?",
  "Como deve ser o padrao de entrada para media tensao?",
];

const ANSWER_TYPE_CONFIG: Record<
  AnswerType,
  { label: string; bg: string; text: string; border: string }
> = {
  DIRECT: {
    label: "Resposta direta",
    bg: "bg-green-50",
    text: "text-green-800",
    border: "border-green-200",
  },
  PARTIAL: {
    label: "Resposta parcial",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  INSUFFICIENT: {
    label: "Base insuficiente",
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
  },
  NEEDS_CONTEXT: {
    label: "Precisa de contexto",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
  },
};

export function TechnicalChatWorkspace() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await runQuery(question);
  }

  async function runQuery(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = (await response.json()) as QueryResult;

      if (!data.ok) {
        setError(data.message ?? "Erro ao consultar a base normativa.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Nao foi possivel conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleExample(example: string) {
    setQuestion(example);
    void runQuery(example);
  }

  function handleClear() {
    setResult(null);
    setError(null);
    setQuestion("");
  }

  const answerConfig = result?.answerType ? ANSWER_TYPE_CONFIG[result.answerType] : null;

  return (
    <div className="space-y-5">
      {/* Input card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#123C7C]">
              Chat tecnico
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#0F172A]">
              Consulta na base normativa real
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {(result || error) && (
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                onClick={handleClear}
                type="button"
              >
                Limpar
              </button>
            )}
            <span className="rounded-full bg-[#E0F2FE] px-3 py-1 text-xs font-semibold text-[#075985]">
              Base normativa ativa
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((ex) => (
            <button
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition hover:border-[#19A7E8] hover:bg-white"
              disabled={loading}
              key={ex}
              onClick={() => handleExample(ex)}
              type="button"
            >
              {ex}
            </button>
          ))}
        </div>

        <form className="mt-4" onSubmit={handleSubmit}>
          <textarea
            className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#19A7E8] focus:ring-4 focus:ring-[#19A7E8]/10"
            disabled={loading}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex.: Como solicitar ligacao nova em Altamira PA? Qual a bitola do ramal de entrada trifasico?"
            value={question}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Respostas baseadas exclusivamente nos documentos indexados.
            </p>
            <button
              className="rounded-xl bg-[#123C7C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A2456] disabled:opacity-50"
              disabled={loading || !question.trim()}
              type="submit"
            >
              {loading ? "Consultando..." : "Consultar base normativa"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Classification badges */}
          <div className="flex flex-wrap items-center gap-2">
            {answerConfig && (
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${answerConfig.bg} ${answerConfig.text} ${answerConfig.border}`}
              >
                {answerConfig.label}
              </span>
            )}
            {result.audienceLabel && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {result.audienceLabel}
              </span>
            )}
            {result.intentLabel && result.audience === "TECNICO_DIMENSIONAMENTO" && (
              <span className="rounded-full bg-[#E0F2FE] px-3 py-1 text-xs font-medium text-[#075985]">
                {result.intentLabel}
              </span>
            )}
          </div>

          {/* Partial warning banner */}
          {result.answerType === "PARTIAL" && result.isSufficient && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              A base atual nao trouxe item direto suficiente. A orientacao abaixo e geral.
            </div>
          )}

          {/* Missing context */}
          {result.missingContext && result.missingContext.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <p className="font-semibold mb-1">Para melhorar a resposta, informe tambem:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {result.missingContext.map((ctx, i) => (
                  <li key={i}>{ctx}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Main answer */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#123C7C]">
              Resposta
            </p>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#0F172A]">
              {result.answer}
            </pre>
          </div>

          {/* Normative summary — only when found and not in main answer already */}
          {result.normativeSummary && result.normativeSummary.trim().length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                O que a norma indica
              </p>
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-600">
                {result.normativeSummary}
              </pre>
            </div>
          )}

          {/* Terms searched (collapsible info) */}
          {result.termsSearched && result.termsSearched.length > 0 && (
            <p className="text-xs text-slate-400">
              Termos buscados: {result.termsSearched.join(", ")}
            </p>
          )}

          {/* Sources */}
          {result.sources.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Fontes utilizadas ({result.sources.length})
              </p>
              {result.sources.map((source, i) => (
                <SourceCard key={i} source={source} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SourceCard({ source }: { source: Source }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-medium text-[#0F172A] text-sm">{source.documentTitle}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {source.versionLabel}
        </span>
        <span className="rounded-full bg-[#E0F2FE] px-2 py-0.5 text-xs text-[#075985]">
          Pag. {source.pageNumber}
        </span>
        {source.concessionaire && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {source.concessionaire}
          </span>
        )}
        {source.stateCodes.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {source.stateCodes.join(", ")}
          </span>
        )}
      </div>
      <p className={`text-xs leading-relaxed text-slate-600 ${expanded ? "" : "line-clamp-3"}`}>
        {source.excerpt}
      </p>
      <button
        className="mt-1.5 text-xs text-[#19A7E8] hover:underline"
        onClick={() => setExpanded((v) => !v)}
        type="button"
      >
        {expanded ? "Recolher trecho" : "Ver trecho usado"}
      </button>
    </div>
  );
}
