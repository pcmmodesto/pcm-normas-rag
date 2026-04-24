import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { suggestRagPdfKind } from "@/features/rag-pdf/lib/classifier";

const examples = [
  "Quais documentos sao necessarios para ligacao em baixa tensao?",
  "Onde a norma trata de padrao de entrada?",
  "Qual trecho fala sobre protecao geral?",
];

const demoQuestion =
  "Qual estrutura de rede devo usar em um angulo de 45 graus com cabo 2 AWG CA?";

const suggestedKind = suggestRagPdfKind(demoQuestion);

export default function ChatPage() {
  return (
    <AppShell>
      <section className="mx-auto grid min-h-[75vh] max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded border border-[#d8dde6] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#b88405]">
            Chat tecnico
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[#172033]">
            Consulta com rastreabilidade
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#5a667a]">
            Interface preparada para respostas futuras com fonte, pagina e
            trecho utilizado. Nesta etapa nao ha chamada para modelo de IA.
          </p>
          <div className="mt-5 rounded border border-[#f0d27c] bg-[#fff8df] p-4 text-sm leading-6 text-[#4b3a08]">
            Sugestao demonstrativa para a pergunta atual: PDF{" "}
            <strong>
              {suggestedKind === "technical" ? "tecnico" : "cliente"}
            </strong>
            . A classificacao usa apenas palavras-chave nesta etapa.
          </div>
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
              Faca uma pergunta tecnica sobre uma norma carregada. Quando o RAG
              for implementado, a resposta exibira fontes, paginas e trechos.
            </div>
            <div className="ml-auto max-w-[82%] rounded bg-[#123c69] p-4 text-sm leading-6 text-white">
              {demoQuestion}
            </div>
            <div className="max-w-[82%] rounded bg-[#f2f5f9] p-4 text-sm leading-6 text-[#384457]">
              Resposta demonstrativa: a estrutura aplicavel deve ser definida
              pela tabela ou abaco da norma considerando angulo, bitola e tipo
              de condutor. A resposta final dependera dos chunks reais e das
              fontes normativas carregadas.
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  className="rounded bg-[#123c69] px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-[#0f3156]"
                  href="/pdf-preview/technical"
                >
                  Gerar PDF tecnico
                </Link>
                <Link
                  className="rounded border border-[#c8d0dc] bg-white px-4 py-2 text-center text-sm font-semibold text-[#172033] transition hover:bg-[#f8fafc]"
                  href="/pdf-preview/client"
                >
                  Gerar PDF para cliente
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-[#d8dde6] p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                className="min-h-24 flex-1 resize-none rounded border border-[#c8d0dc] px-3 py-3 text-sm outline-none transition focus:border-[#123c69] focus:ring-2 focus:ring-[#123c69]/15"
                placeholder="Digite sua pergunta tecnica..."
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

