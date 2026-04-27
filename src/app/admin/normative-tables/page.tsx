import Link from "next/link";
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
          description="Curadoria das tabelas extraidas ou importadas. Dimensionamento alimenta calculo; outras tabelas, desenhos e notas ficam como ativos auditaveis para consulta tecnica."
        />
        <AdminWarning
          title="A consulta de tabelas estruturadas encontrou um problema"
          details={warningDetails}
        />
        <div className="flex justify-end">
          <Link
            href="/admin/normative-tables/import-manual"
            className="rounded-xl bg-[#123C7C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A1633]"
          >
            + Importar ativo manualmente
          </Link>
        </div>
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
