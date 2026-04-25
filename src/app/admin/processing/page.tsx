import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";
import { processingRows } from "@/features/dashboard/mock-data";

export default function AdminProcessingPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Processamento"
          title="Pipeline futuro de documentos"
          description="Status preparado para extracao de texto, paginas, chunks, embeddings e erros."
        />
        <DashboardSection title="Fila de processamento">
          <AdminTable
            headers={["Documento", "Etapa", "Status", "Progresso", "Observacao"]}
            rows={processingRows}
            statusColumn={2}
            tone="light"
          />
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
