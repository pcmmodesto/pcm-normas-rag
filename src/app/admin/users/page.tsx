import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";
import { userRows } from "@/features/dashboard/mock-data";

export default function AdminUsersPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Usuarios"
          title="Usuarios e clientes"
          description="Estrutura futura para contas, empresas, papeis, planos e status de acesso."
        />
        <DashboardSection title="Contas">
          <AdminTable
            headers={["Nome", "E-mail", "Perfil", "Status", "Plano", "Ultimo acesso"]}
            rows={userRows}
            statusColumn={3}
            tone="light"
          />
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
