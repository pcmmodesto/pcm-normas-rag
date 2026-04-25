import { CustomerShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";
import { UsageBar } from "@/components/ui/usage-bar";
import { usageRows } from "@/features/dashboard/mock-data";

export default function DashboardUsagePage() {
  return (
    <CustomerShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Uso"
          title="Indicadores mensais e anuais"
          description="Consultas gratuitas, tecnicas, PDFs gerados, temas pesquisados, documentos consultados e limite do plano."
        />
        <DashboardSection title="Limite do plano">
          <UsageBar label="Plano mensal tecnico" value={54} />
        </DashboardSection>
        <DashboardSection title="Evolucao mensal">
          <AdminTable
            headers={["Mes", "Consultas", "Gratuitas", "Tecnicas", "PDFs", "Tema", "Documento"]}
            rows={usageRows}
            tone="light"
          />
        </DashboardSection>
      </div>
    </CustomerShell>
  );
}
