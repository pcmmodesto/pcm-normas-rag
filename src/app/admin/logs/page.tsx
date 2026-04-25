import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { safePrisma } from "@/lib/prisma-safe";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const logs = await safePrisma(
    () =>
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          user: true,
        },
      }),
    [],
  );

  const rows = logs.map((log) => [
    formatDateTime(log.createdAt),
    log.user?.email ?? "-",
    String(log.action),
    log.entityType,
    log.ipAddress ?? "-",
    "registrado",
    log.entityId ?? "-",
  ]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Logs e auditoria"
          title="Rastro operacional"
          description="Eventos reais registrados em AuditLog quando existirem."
        />
        <DashboardSection title="Eventos recentes">
          {rows.length > 0 ? (
            <AdminTable
              headers={[
                "Data/hora",
                "Usuario",
                "Acao",
                "Entidade",
                "IP",
                "Status",
                "Referencia",
              ]}
              rows={rows}
              statusColumn={5}
              tone="light"
            />
          ) : (
            <EmptyState
              title="Nenhum log registrado"
              description="A auditoria esta modelada, mas ainda nao ha eventos reais gravados."
            />
          )}
        </DashboardSection>
      </div>
    </AdminShell>
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}
