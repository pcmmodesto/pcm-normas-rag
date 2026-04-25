import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";
import { documentRows } from "@/features/dashboard/mock-data";

export default function AdminDocumentsPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Documentos"
          title="Acervo normativo"
          description="Gerenciamento de normas, versoes, status, paginas, chunks e acoes administrativas."
        />
        <DashboardSection title="Documentos cadastrados">
          <AdminTable
            headers={["Titulo", "Concessionaria", "UF", "Categoria", "Versao", "Status", "Upload", "Paginas", "Chunks", "Processado", "Acao"]}
            rows={documentRows}
            statusColumn={5}
            tone="light"
          />
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
