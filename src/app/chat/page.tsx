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
};

type QueryResult = {
  ok: boolean;
  answer: string;
  sources: Source[];
  message?: string;
};

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
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

  return (
    <div className="min-h-screen bg-[#050B1F] text-[#F8FAFC]">
      <header className="border-b border-slate-400/15 bg-[#050B1F]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#123C7C] to-[#19A7E8] text-sm font-bold text-white">
              PCM
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">
                PCM Normas RAG
              </p>
              <p className="text-xs text-[#94A3B8]">Consulta normativa tecnica</p>
            </div>
          </div>
          <span className="rounded-full bg-[#19A7E8]/10 px-3 py-1 text-xs font-medium text-[#19A7E8]">
            Base normativa ativa
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Consulta tecnica normativa
          </h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Pesquisa baseada nos documentos cadastrados. Respostas citam a fonte real.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            className="w-full rounded-2xl border border-slate-600 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#19A7E8] focus:outline-none focus:ring-1 focus:ring-[#19A7E8]"
            disabled={loading}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Digite sua pergunta tecnica normativa... Ex: Qual a bitola minima do ramal de entrada para ligacao trifasica em media tensao?"
            rows={3}
            value={question}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#64748B]">
              As respostas sao baseadas exclusivamente nos documentos indexados.
              Nao inventamos dados tecnicos.
            </p>
            <button
              className="rounded-xl bg-[#19A7E8] px-6 py-2.5 text-sm font-semibold text-[#050B1F] transition hover:bg-[#8EDBFF] disabled:opacity-50"
              disabled={loading || !question.trim()}
              type="submit"
            >
              {loading ? "Consultando..." : "Consultar"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#19A7E8]">
                Resposta
              </h2>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#E2E8F0]">
                {result.answer}
              </pre>
            </div>

            {result.sources.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Fontes ({result.sources.length})
                </h2>
                {result.sources.map((source, i) => (
                  <div
                    className="rounded-2xl border border-slate-700/60 bg-slate-800/30 p-4"
                    key={i}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white text-sm">
                        {source.documentTitle}
                      </span>
                      <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                        {source.versionLabel}
                      </span>
                      <span className="rounded-full bg-[#123C7C]/40 px-2 py-0.5 text-xs text-[#93C5FD]">
                        Pag. {source.pageNumber}
                      </span>
                      {source.concessionaire && (
                        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                          {source.concessionaire}
                        </span>
                      )}
                      {source.stateCodes.length > 0 && (
                        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                          {source.stateCodes.join(", ")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-[#94A3B8] line-clamp-4">
                      {source.excerpt}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {result.sources.length === 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                Nao foram encontradas fontes normativas suficientes para esta consulta.
                A base pode ainda nao conter documentos relacionados ao tema.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
