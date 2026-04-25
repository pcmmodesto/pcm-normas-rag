import { PublicShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { PricingCard } from "@/components/ui/pricing-card";
import { pricingPlans } from "@/features/dashboard/mock-data";

export default function PricingPage() {
  return (
    <PublicShell>
      <section className="bg-[linear-gradient(135deg,#050B1F_0%,#0A1633_70%,#050B1F_100%)]">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <PageHeader
            eyebrow="Planos"
            title="Escolha como acessar consultas normativas"
            description="Consulta basica gratuita, consulta tecnica avulsa, plano mensal e plano anual. Checkout real sera conectado em etapa futura."
            tone="dark"
          />
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.name} {...plan} />
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
