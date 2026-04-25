import { AdminShell } from "@/components/layout/app-shell";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default function AdminPdfExportsPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Exportacoes PDF"
          title="Relatorios gerados"
          description="Modulo preparado para exportacoes reais de PDF tecnico e PDF para cliente."
        />
        <DashboardSection title="Exportacoes recentes">
          <EmptyState
            title="Modulo de PDFs em preparacao"
            description="Ainda nao ha tabela real de exportacoes de PDF. Quando a geracao for conectada, os registros aparecerao aqui."
          />
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
