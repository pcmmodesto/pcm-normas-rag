import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";
import { subscriptionRows } from "@/features/dashboard/mock-data";

export default function AdminSubscriptionsPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Assinaturas"
          title="Planos e uso contratado"
          description="Tabela visual preparada para trial, active, past_due, canceled e expired. Checkout real sera conectado depois."
        />
        <DashboardSection title="Clientes e planos">
          <AdminTable
            headers={["Cliente", "E-mail", "Plano", "Status", "Inicio", "Vencimento", "Uso", "Valor", "Acao"]}
            rows={subscriptionRows}
            statusColumn={3}
            tone="light"
          />
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
