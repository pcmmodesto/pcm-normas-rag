import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";
import { auditLogRows } from "@/features/dashboard/mock-data";

export default function AdminLogsPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Logs e auditoria"
          title="Rastro operacional"
          description="Filtros visuais por usuario, acao, periodo e erro, prontos para futura integracao com AuditLog."
        />
        <DashboardSection title="Filtros">
          <div className="grid gap-3 md:grid-cols-4">
            {["Usuario", "Acao", "Periodo", "Status"].map((label) => (
              <input
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-[#0F172A]"
                key={label}
                placeholder={label}
              />
            ))}
          </div>
        </DashboardSection>
        <DashboardSection title="Eventos recentes">
          <AdminTable
            headers={["Data/hora", "Usuario", "Acao", "Entidade", "IP", "Status", "Metadados"]}
            rows={auditLogRows}
            statusColumn={5}
            tone="light"
          />
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
