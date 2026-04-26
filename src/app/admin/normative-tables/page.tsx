import { AdminShell } from "@/components/layout/app-shell";
import { AdminWarning } from "@/components/ui/admin-warning";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";
import { adminQuery } from "@/features/admin/lib/admin-database";
import {
  getAdminNormativeFigures,
  getAdminNormativeTables,
} from "@/features/admin/lib/normative-structures";
import { NormativeTablesClient } from "./normative-tables-client";

export const dynamic = "force-dynamic";

export default async function AdminNormativeTablesPage() {
  const tables = await adminQuery(
    "admin normative tables",
    () => getAdminNormativeTables(30),
    [],
  );
  const figures = await adminQuery(
    "admin normative figures",
    () => getAdminNormativeFigures(60),
    [],
  );
  const warningDetails: string[] = [];
  if (!tables.ok) {
    warningDetails.push(`Consulta ${tables.errorName} (${tables.errorCode}). Veja o Runtime Log da Vercel.`);
  }
  if (!figures.ok) {
    warningDetails.push(`Consulta ${figures.errorName} (${figures.errorCode}). Veja o Runtime Log da Vercel.`);
  }

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
          details={warningDetails}
        />
        <DashboardSection title="Tabelas extraidas e importadas">
          <NormativeTablesClient
            initialFigures={figures.data}
            initialTables={tables.data}
          />
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
