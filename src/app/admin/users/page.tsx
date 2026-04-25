import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { safePrisma } from "@/lib/prisma-safe";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await safePrisma(
    () =>
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          companyMemberships: {
            include: {
              company: true,
            },
            take: 1,
          },
        },
      }),
    [],
  );

  const rows = users.map((user) => {
    const company = user.companyMemberships[0]?.company;

    return [
      user.name ?? "-",
      user.email,
      String(user.role),
      user.isActive ? "active" : "inactive",
      company?.plan ? String(company.plan) : "-",
      formatDate(user.createdAt),
      user.lastLoginAt ? formatDate(user.lastLoginAt) : "-",
    ];
  });

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Usuarios"
          title="Usuarios reais"
          description="Usuarios sincronizados a partir do Supabase Auth e armazenados no Prisma."
        />
        <DashboardSection title="Contas">
          {rows.length > 0 ? (
            <AdminTable
              headers={[
                "Nome",
                "E-mail",
                "Role",
                "Status",
                "Plano",
                "Criado em",
                "Ultimo acesso",
              ]}
              rows={rows}
              statusColumn={3}
              tone="light"
            />
          ) : (
            <EmptyState
              title="Nenhum usuario sincronizado"
              description="Usuarios aparecem aqui depois do primeiro login com Supabase Auth."
            />
          )}
        </DashboardSection>
      </div>
    </AdminShell>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}
