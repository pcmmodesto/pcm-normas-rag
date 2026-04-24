import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatCard } from "@/components/ui/stat-card";
import { plannedIntegrations } from "@/lib/integrations";

const workflow = [
  "Upload controlado de PDFs de normas técnicas",
  "Extração de páginas, trechos e metadados",
  "Geração de embeddings e armazenamento vetorial",
  "Respostas com fonte, página e trecho utilizado",
];

export default function Home() {
  return (
    <AppShell>
      <section className="border-b border-[#d8dde6] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Base visual inicial"
              title="PCM Normas RAG"
              description="Aplicativo independente para organizar, consultar e futuramente responder perguntas sobre normas técnicas de concessionárias de energia com rastreabilidade por fonte."
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded bg-[#123c69] px-5 py-3 text-center font-semibold text-white transition hover:bg-[#0f3156]"
                href="/chat"
              >
                Abrir chat técnico
              </Link>
              <Link
                className="rounded border border-[#c8d0dc] px-5 py-3 text-center font-semibold text-[#172033] transition hover:bg-[#f2f5f9]"
                href="/admin"
              >
                Ver painel
              </Link>
            </div>
          </div>

          <div className="rounded border border-[#d8dde6] bg-[#f8fafc] p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#123c69]">
              Fluxo RAG planejado
            </p>
            <ol className="mt-5 space-y-4">
              {workflow.map((item, index) => (
                <li className="flex gap-3" key={item}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#f5c542] text-sm font-bold text-[#172033]">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6 text-[#384457]">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            detail="Tela demonstrativa para acervo futuro."
            label="Normas indexadas"
            value="0"
          />
          <StatCard
            detail="Integração futura com embeddings."
            label="Trechos vetoriais"
            value="0"
          />
          <StatCard
            detail="Sem chamadas de IA nesta etapa."
            label="Consultas RAG"
            value="0"
          />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plannedIntegrations.map((integration) => (
            <article
              className="rounded border border-[#d8dde6] bg-white p-5"
              key={integration.name}
            >
              <h2 className="text-lg font-semibold text-[#172033]">
                {integration.name}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#5a667a]">
                {integration.purpose}
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#b88405]">
                {integration.status}
              </p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
