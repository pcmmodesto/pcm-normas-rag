import { AppShell } from "@/components/layout/app-shell";

const examples = [
  "Quais documentos são necessários para ligação em baixa tensão?",
  "Onde a norma trata de padrão de entrada?",
  "Qual trecho fala sobre proteção geral?",
];

export default function ChatPage() {
  return (
    <AppShell>
      <section className="mx-auto grid min-h-[75vh] max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded border border-[#d8dde6] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#b88405]">
            Chat técnico
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[#172033]">
            Consulta com rastreabilidade
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#5a667a]">
            Interface preparada para respostas futuras com fonte, página e
            trecho utilizado. Nesta etapa não há chamada para modelo de IA.
          </p>
          <div className="mt-8 space-y-3">
            {examples.map((example) => (
              <button
                className="w-full rounded border border-[#d8dde6] bg-[#f8fafc] px-4 py-3 text-left text-sm text-[#384457] transition hover:bg-white"
                key={example}
                type="button"
              >
                {example}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex min-h-[620px] flex-col rounded border border-[#d8dde6] bg-white shadow-sm">
          <div className="border-b border-[#d8dde6] p-5">
            <h2 className="text-lg font-semibold text-[#172033]">
              Assistente de normas
            </h2>
            <p className="mt-1 text-sm text-[#657187]">
              Modo demonstrativo, sem IA conectada.
            </p>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="max-w-[82%] rounded bg-[#f2f5f9] p-4 text-sm leading-6 text-[#384457]">
              Faça uma pergunta técnica sobre uma norma carregada. Quando o RAG
              for implementado, a resposta exibirá fontes, páginas e trechos.
            </div>
            <div className="ml-auto max-w-[82%] rounded bg-[#123c69] p-4 text-sm leading-6 text-white">
              Exemplo: qual o padrão de entrada aplicável para unidade
              consumidora em baixa tensão?
            </div>
          </div>
          <div className="border-t border-[#d8dde6] p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                className="min-h-24 flex-1 resize-none rounded border border-[#c8d0dc] px-3 py-3 text-sm outline-none transition focus:border-[#123c69] focus:ring-2 focus:ring-[#123c69]/15"
                placeholder="Digite sua pergunta técnica..."
              />
              <button
                className="rounded bg-[#f5c542] px-5 py-3 font-semibold text-[#172033] transition hover:bg-[#e7b82f] sm:self-end"
                type="button"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
