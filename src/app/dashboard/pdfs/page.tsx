import { CustomerShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";
import { customerPdfRows } from "@/features/dashboard/mock-data";

export default function DashboardPdfsPage() {
  return (
    <CustomerShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="PDFs"
          title="PDFs gerados"
          description="Historico de PDFs tecnicos e PDFs para cliente gerados a partir das respostas."
        />
        <DashboardSection title="Exportacoes do cliente">
          <AdminTable
            headers={["Data", "Tipo", "Pergunta", "Status", "Plano"]}
            rows={customerPdfRows}
            statusColumn={3}
            tone="light"
          />
        </DashboardSection>
      </div>
    </CustomerShell>
  );
}
