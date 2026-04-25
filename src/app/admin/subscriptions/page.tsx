import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { safePrisma } from "@/lib/prisma-safe";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const subscriptions = await safePrisma(
    () =>
      prisma.userSubscription.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: true,
          company: true,
          plan: true,
        },
      }),
    [],
  );

  const rows = subscriptions.map((subscription) => [
    subscription.company?.name ?? subscription.user?.name ?? "-",
    subscription.user?.email ?? "-",
    subscription.plan.name,
    String(subscription.status),
    subscription.startedAt ? formatDate(subscription.startedAt) : "-",
    subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "-",
    subscription.plan.queryLimitMonthly
      ? `0 / ${subscription.plan.queryLimitMonthly}`
      : "-",
    formatMoney(subscription.plan.priceCents),
    "Ver",
  ]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Assinaturas"
          title="Planos e uso contratado"
          description="Assinaturas reais do banco. Checkout e gateway real ainda serao conectados."
        />
        <DashboardSection title="Clientes e planos">
          {rows.length > 0 ? (
            <AdminTable
              headers={[
                "Cliente",
                "E-mail",
                "Plano",
                "Status",
                "Inicio",
                "Vencimento",
                "Uso",
                "Valor",
                "Acao",
              ]}
              rows={rows}
              statusColumn={3}
              tone="light"
            />
          ) : (
            <EmptyState
              title="Modulo de assinaturas em preparacao"
              description="Nenhuma assinatura real foi encontrada. Quando o checkout for conectado, os contratos aparecerao aqui."
            />
          )}
        </DashboardSection>
      </div>
    </AdminShell>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(value);
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
