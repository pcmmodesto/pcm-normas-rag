import { AdminShell } from "@/components/layout/app-shell";
import { AdminWarning } from "@/components/ui/admin-warning";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";
import { adminQuery } from "@/features/admin/lib/admin-database";
import { getAdminNormativeTables } from "@/features/admin/lib/normative-structures";
import { NormativeTablesClient } from "./normative-tables-client";

export const dynamic = "force-dynamic";

export default async function AdminNormativeTablesPage() {
  const tables = await adminQuery(
    "admin normative tables",
    () => getAdminNormativeTables(30),
    [],
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Base estruturada"
          title="Tabelas normativas"
          description="Curadoria das tabelas extraidas do PDF. Use esta tela para validar e corrigir linhas que o chat tecnico consulta antes do RAG textual."
        />
        <AdminWarning
          title="A consulta de tabelas estruturadas encontrou um problema"
          details={
            tables.ok
              ? []
              : [
                  `Consulta ${tables.errorName} (${tables.errorCode}). Veja o Runtime Log da Vercel.`,
                ]
          }
        />
        <DashboardSection title="Tabelas extraidas e importadas">
          <NormativeTablesClient initialTables={tables.data} />
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
