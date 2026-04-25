import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { safePrisma } from "@/lib/prisma-safe";

export const dynamic = "force-dynamic";

export default async function AdminProcessingPage() {
  const versions = await safePrisma(
    () =>
      prisma.documentVersion.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          document: true,
        },
      }),
    [],
  );

  const rows = versions.map((version) => [
    version.document.title,
    version.versionLabel,
    String(version.status),
    String(version.processingStatus),
    `${version.pageCount} paginas`,
    `${version.chunkCount} chunks`,
    version.processingError ?? "Processamento automatico ainda nao implementado",
  ]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Processamento"
          title="Pipeline de documentos"
          description="Status real das versoes cadastradas. Extracao de texto, chunks e embeddings ainda serao conectados."
        />
        <DashboardSection title="Fila de processamento">
          {rows.length > 0 ? (
            <AdminTable
              headers={[
                "Documento",
                "Versao",
                "Status",
                "Processamento",
                "Paginas",
                "Chunks",
                "Observacao",
              ]}
              rows={rows}
              statusColumn={3}
              tone="light"
            />
          ) : (
            <EmptyState
              title="Processamento ainda nao implementado"
              description="Nenhuma versao de documento foi encontrada. Quando o upload criar versoes, elas aparecerao aqui com status real."
            />
          )}
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
