import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";
import { pdfExportRows } from "@/features/dashboard/mock-data";

export default function AdminPdfExportsPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Exportacoes PDF"
          title="Relatorios gerados"
          description="Lista preparada para tipos de PDF, pergunta, status, plano usado e custo estimado futuro."
        />
        <DashboardSection title="Exportacoes recentes">
          <AdminTable
            headers={["Data", "Usuario", "Tipo", "Pergunta", "Documento", "Status", "Plano", "Custo", "Acao"]}
            rows={pdfExportRows}
            statusColumn={5}
            tone="light"
          />
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
