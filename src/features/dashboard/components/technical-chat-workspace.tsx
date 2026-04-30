"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

type Source = {
  documentTitle: string;
  versionLabel: string;
  pageNumber: number;
  chunkIndex: number;
  chunkType?: string;
  sectionNumber?: string | null;
  sectionTitle?: string | null;
  tableNumber?: string | null;
  tableTitle?: string | null;
  excerpt: string;
  concessionaire: string | null;
  stateCodes: string[];
  documentType: string;
  score?: number;
  evidence?: Array<{
    signedUrl: string;
    label: string;
    storagePath: string;
    kind: "image" | "pdf" | "file";
  }>;
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
            <FormattedAnswer answer={result.answer} />
          </div>

          {/* Normative summary — only when found and not in main answer already */}
          {result.normativeSummary && result.normativeSummary.trim().length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                O que a norma indica
              </p>
              <FormattedNormativeSummary summary={result.normativeSummary} />
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

type AnswerBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "list"; items: string[] }
  | { type: "facts"; rows: Array<{ label: string; value: string }> };

const SECTION_TITLES = new Set([
  "Dimensionamento preliminar conforme tabela normativa estruturada",
  "Estimativa de carga instalada",
  "Dados tecnicos considerados",
  "Tabela normativa utilizada",
  "Resultado do dimensionamento",
  "Notas da tabela:",
  "Premissas e alertas tecnicos",
  "Dados faltantes para dimensionar cabo/disjuntor/padrao com seguranca:",
  "Informe apenas os dados faltantes:",
]);

const FACT_PREFIXES = [
  "Total estimado",
  "kVA estimado",
  "Tensao",
  "Tipo de ligacao",
  "Localidade",
  "Concessionaria",
  "UF",
  "Escopo",
  "Tabela",
  "Pagina",
  "Linha/faixa aplicada",
  "Criterio de escolha",
  "Disjuntor",
  "Cabo de cobre multiplexado",
  "Cabo de aluminio multiplexado duplex",
  "Cabo de aluminio multiplexado triplex",
  "Cabo de aluminio multiplexado quadruplex",
  "Eletroduto",
  "Condutor fase/neutro do cliente",
  "Condutor de aterramento",
  "Eletroduto de aterramento",
  "Documento",
  "Revisao",
];

function FormattedAnswer({ answer }: { answer: string }) {
  const blocks = parseAnswer(answer);
  return (
    <div className="space-y-4 text-sm text-[#0F172A]">
      {blocks.map((block, index) => (
        <AnswerBlockView block={block} key={index} />
      ))}
    </div>
  );
}

function AnswerBlockView({ block }: { block: AnswerBlock }) {
  if (block.type === "heading") {
    return (
      <h3 className="border-b border-slate-100 pb-2 text-base font-semibold text-[#123C7C]">
        {block.text}
      </h3>
    );
  }

  if (block.type === "table") {
    const [header, ...rows] = block.rows;
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs sm:text-sm">
          {header && (
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {header.map((cell, index) => (
                  <th className="px-3 py-2 font-semibold" key={`${cell}-${index}`}>
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td className="px-3 py-2 align-top text-slate-700" key={`${cell}-${cellIndex}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === "facts") {
    return (
      <dl className="grid gap-2 sm:grid-cols-2">
        {block.rows.map((row) => (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2" key={row.label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {row.label}
            </dt>
            <dd className="mt-0.5 font-medium text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (block.type === "list") {
    return (
      <ul className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
        {block.items.map((item, index) => (
          <li className="flex gap-2 leading-relaxed text-slate-700" key={`${item}-${index}`}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#19A7E8]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2 leading-relaxed text-slate-700">
      {block.lines.map((line, index) => (
        <p key={`${line}-${index}`}>{line}</p>
      ))}
    </div>
  );
}

function parseAnswer(answer: string): AnswerBlock[] {
  const lines = answer.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const blocks: AnswerBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (SECTION_TITLES.has(line)) {
      blocks.push({ type: "heading", text: line.replace(/:$/, "") });
      index++;
      continue;
    }

    if (line.includes("|")) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes("|")) {
        rows.push(lines[index].split("|").map((cell) => cell.trim()).filter(Boolean));
        index++;
      }
      blocks.push({ type: "table", rows });
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(lines[index].replace(/^-+\s*/, ""));
        index++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (isFactLine(line)) {
      const rows: Array<{ label: string; value: string }> = [];
      while (index < lines.length && isFactLine(lines[index])) {
        const [label, ...rest] = lines[index].split(":");
        rows.push({ label: label.trim(), value: rest.join(":").trim().replace(/\.$/, "") });
        index++;
      }
      blocks.push({ type: "facts", rows });
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      !SECTION_TITLES.has(lines[index]) &&
      !lines[index].includes("|") &&
      !lines[index].startsWith("- ") &&
      !isFactLine(lines[index])
    ) {
      paragraph.push(lines[index]);
      index++;
    }
    blocks.push({ type: "paragraph", lines: paragraph });
  }

  return blocks;
}

function isFactLine(line: string) {
  const [label, value] = line.split(":");
  return Boolean(value?.trim()) && FACT_PREFIXES.includes(label.trim());
}

function FormattedNormativeSummary({ summary }: { summary: string }) {
  const lines = summary.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-600">
      {lines.map((line, index) => (
        <p
          className={index === 0 ? "font-semibold text-slate-700" : ""}
          key={`${line}-${index}`}
        >
          {line}
        </p>
      ))}
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
        {source.sectionNumber && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
            §{source.sectionNumber}
            {source.sectionTitle ? ` ${source.sectionTitle}` : ""}
          </span>
        )}
        {source.tableNumber && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            Tabela {source.tableNumber}
          </span>
        )}
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
      {source.evidence && source.evidence.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {source.evidence.map((item) => (
            <a
              className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
              href={item.signedUrl}
              key={item.storagePath}
              rel="noreferrer"
              target="_blank"
            >
              {item.kind === "image" ? (
                <img
                  alt={item.label}
                  className="h-44 w-full object-contain p-2 transition group-hover:scale-[1.02]"
                  src={item.signedUrl}
                />
              ) : (
                <div className="flex h-44 items-center justify-center p-4 text-center text-xs font-medium text-slate-500">
                  Abrir {item.kind === "pdf" ? "PDF" : "arquivo"} de evidencia
                </div>
              )}
              <span className="block border-t border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">
                {item.label}
              </span>
            </a>
          ))}
        </div>
      )}
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
