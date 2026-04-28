import { AdminShell } from "@/components/layout/app-shell";
import { AdminWarning } from "@/components/ui/admin-warning";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";
import { adminQuery } from "@/features/admin/lib/admin-database";
import { getAdminNormativeAssets } from "@/features/admin/lib/normative-assets";
import { NormativeAssetsClient } from "./normative-assets-client";

export const dynamic = "force-dynamic";

export default async function AdminNormativeAssetsPage() {
  const assets = await adminQuery(
    "admin normative assets",
    () => getAdminNormativeAssets(500),
    [],
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Base normativa estruturada"
          title="Ativos normativos"
          description="Tabelas, desenhos, legendas, notas e requisitos como ativos auditaveis, com texto extraido, dados estruturados, status e futura imagem original."
        />
        <AdminWarning
          title="A consulta de ativos normativos encontrou um problema"
          details={
            assets.ok
              ? []
              : [`Consulta ${assets.errorName} (${assets.errorCode}). Veja o Runtime Log da Vercel.`]
          }
        />
        <DashboardSection title="Ativos cadastrados">
          <NormativeAssetsClient initialAssets={assets.data} />
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
