import { AdminShell } from "@/components/layout/app-shell";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { safePrisma } from "@/lib/prisma-safe";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  const [paidPurchases, activeSubscriptions, monthlySubscriptions, annualSubscriptions] =
    await Promise.all([
      safePrisma(
        () =>
          prisma.paidQueryPurchase.aggregate({
            where: { status: "PAID" },
            _sum: { amountCents: true },
            _count: true,
          }),
        { _sum: { amountCents: null }, _count: 0 },
      ),
      safePrisma(
        () => prisma.userSubscription.count({ where: { status: "ACTIVE" } }),
        0,
      ),
      safePrisma(
        () =>
          prisma.userSubscription.count({
            where: { status: "ACTIVE", plan: { interval: "MONTH" } },
          }),
        0,
      ),
      safePrisma(
        () =>
          prisma.userSubscription.count({
            where: { status: "ACTIVE", plan: { interval: "YEAR" } },
          }),
        0,
      ),
    ]);

  const revenueCents = paidPurchases._sum.amountCents ?? 0;

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Financeiro"
          title="Receita e assinaturas"
          description="Indicadores reais quando houver pagamentos/assinaturas. Sem gateway conectado, valores permanecem zerados."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Receita confirmada"
            value={formatMoney(revenueCents)}
            detail="Soma de PaidQueryPurchase paga"
          />
          <MetricCard
            label="Consultas avulsas pagas"
            value={String(paidPurchases._count)}
            detail="Compras reais no banco"
          />
          <MetricCard
            label="Assinaturas ativas"
            value={String(activeSubscriptions)}
            detail="UserSubscription ACTIVE"
          />
          <MetricCard
            label="Inadimplencia"
            value="0"
            detail="Modulo de cobranca em preparacao"
          />
        </div>
        <DashboardSection title="Composicao de receita">
          {activeSubscriptions > 0 || paidPurchases._count > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Mensais"
                value={String(monthlySubscriptions)}
                detail="Assinaturas mensais ativas"
              />
              <MetricCard
                label="Anuais"
                value={String(annualSubscriptions)}
                detail="Assinaturas anuais ativas"
              />
              <MetricCard
                label="Avulsas"
                value={String(paidPurchases._count)}
                detail="Consultas pagas avulsas"
              />
            </div>
          ) : (
            <EmptyState
              title="Modulo financeiro em preparacao"
              description="Ainda nao ha pagamento real, checkout ou transacoes pagas registradas."
            />
          )}
        </DashboardSection>
      </div>
    </AdminShell>
  );
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
