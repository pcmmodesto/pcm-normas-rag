import Link from "next/link";
import { PublicShell } from "@/components/layout/app-shell";
import { PricingCard } from "@/components/ui/pricing-card";
import { FreeChatWidget } from "@/features/dashboard/components/free-chat-widget";
import { pricingPlans } from "@/features/dashboard/mock-data";

const steps = [
  ["1", "A PCM organiza a base normativa", "Normas, notas tecnicas, EPDs, EPEs, manuais e especificacoes sao mantidos pelo admin."],
  ["2", "Pergunte em linguagem natural", "O sistema classifica se a consulta e basica, tecnica ou precisa de contexto."],
  ["3", "Receba resposta rastreavel", "A resposta futura deve citar fonte, pagina, item, tabela e trecho usado."],
];

const differentiators = [
  "Base documental organizada por concessionaria, estado, versao e categoria.",
  "Separacao clara entre consulta basica gratuita e consulta tecnica paga.",
  "Arquitetura preparada para tabelas, abacos, regras tecnicas e PDFs.",
  "Regras anti-alucinacao: nunca inventar valor, pagina, cabo ou tabela.",
];

export default function Home() {
  return (
    <PublicShell>
      <section className="bg-[radial-gradient(circle_at_top_left,rgba(25,167,232,0.28),transparent_34%),linear-gradient(135deg,#050B1F_0%,#0A1633_62%,#050B1F_100%)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#19A7E8]">
              PCM Modesto Engenharia
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Consulta inteligente de normas tecnicas de concessionarias
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#CBD5E1]">
              Procurar informacao em normas, tabelas e documentos de
              concessionaria toma tempo. Pergunte ao assistente e receba uma
              resposta com fonte, pagina e rastreabilidade.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                className="rounded-xl bg-[#19A7E8] px-5 py-3 text-center font-semibold text-[#050B1F] transition hover:bg-[#8EDBFF]"
                href="#consulta-gratuita"
              >
                Testar consulta gratuita
              </a>
              <Link
                className="rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-center font-semibold text-white transition hover:bg-white/15"
                href="/login"
              >
                Entrar no sistema
              </Link>
              <Link
                className="rounded-xl border border-[#D4AF37]/45 bg-[#D4AF37]/10 px-5 py-3 text-center font-semibold text-[#F8E7A1] transition hover:bg-[#D4AF37]/15"
                href="/pricing"
              >
                Ver planos
              </Link>
            </div>
          </div>
          <FreeChatWidget />
        </div>
      </section>

      <section id="consulta-gratuita" className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-5 lg:grid-cols-3">
          {steps.map(([number, title, description]) => (
            <article
              className="rounded-2xl border border-slate-400/15 bg-white/[0.06] p-6 shadow-xl shadow-cyan-950/10"
              key={title}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#19A7E8] font-semibold text-[#050B1F]">
                {number}
              </span>
              <h2 className="mt-5 text-xl font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#CBD5E1]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-14 text-[#0F172A]">
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#123C7C]">
              Planos
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Do atendimento basico ao criterio tecnico rastreavel
            </h2>
            <p className="mt-4 text-slate-600">
              Pagamento real ainda nao esta ativo. Os botoes preparam login e
              checkout futuro.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.name} {...plan} tone="light" />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-5 md:grid-cols-2">
          {differentiators.map((item) => (
            <div
              className="rounded-2xl border border-slate-400/15 bg-[#0A1633] p-6 text-[#CBD5E1]"
              key={item}
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
