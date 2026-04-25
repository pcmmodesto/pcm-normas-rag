import { AdminShell } from "@/components/layout/app-shell";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { UsageBar } from "@/components/ui/usage-bar";
import { financeMetrics } from "@/features/dashboard/mock-data";

export default function AdminFinancePage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Financeiro"
          title="Receita e assinaturas"
          description="Dashboard financeiro sem gateway real, com MRR, ARR, avulsas, ticket medio e inadimplencia futura em modo preview."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {financeMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
        <DashboardSection title="Composicao de receita">
          <div className="space-y-5">
            <UsageBar label="Assinaturas mensais" value={58} />
            <UsageBar label="Assinaturas anuais" value={28} />
            <UsageBar label="Consultas avulsas" value={14} />
            <UsageBar label="Inadimplencia futura estimada" value={6} />
          </div>
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
