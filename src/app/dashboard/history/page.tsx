import { CustomerShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";
import { historyRows } from "@/features/dashboard/mock-data";

export default function DashboardHistoryPage() {
  return (
    <CustomerShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Historico"
          title="Consultas realizadas"
          description="Perguntas, tipo, status, data, fontes usadas, PDF gerado e acesso gratuito ou pago."
        />
        <DashboardSection title="Historico de consultas">
          <AdminTable
            headers={["Pergunta", "Tipo", "Status", "Data", "Fontes", "PDF", "Acesso"]}
            rows={historyRows}
            statusColumn={2}
            tone="light"
          />
        </DashboardSection>
      </div>
    </CustomerShell>
  );
}
