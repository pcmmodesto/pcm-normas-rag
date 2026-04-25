import Link from "next/link";
import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { safePrisma } from "@/lib/prisma-safe";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  const documents = await safePrisma(
    () =>
      prisma.technicalDocument.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    [],
  );

  const rows = documents.map((document) => {
    const currentVersion = document.versions[0];

    return [
      document.title,
      document.concessionaire ?? "-",
      document.stateCodes.join(", ") || "-",
      document.categories.join(", ") || String(document.documentType),
      currentVersion?.versionLabel ?? "-",
      String(document.status),
      formatDate(currentVersion?.createdAt ?? document.createdAt),
      String(currentVersion?.pageCount ?? 0),
      String(currentVersion?.chunkCount ?? 0),
      currentVersion?.processingStatus
        ? String(currentVersion.processingStatus)
        : "PENDING",
      "Ver",
    ];
  });

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Documentos"
          title="Acervo normativo"
          description="Documentos reais cadastrados no banco. O cliente nao envia nem gerencia documentos."
        />
        <DashboardSection title="Documentos cadastrados">
          {rows.length > 0 ? (
            <AdminTable
              headers={[
                "Titulo",
                "Concessionaria",
                "UF",
                "Categoria/tipo",
                "Versao atual",
                "Status",
                "Upload",
                "Paginas",
                "Chunks",
                "Processamento",
                "Acao",
              ]}
              rows={rows}
              statusColumn={5}
              tone="light"
            />
          ) : (
            <EmptyState
              title="Nenhum documento cadastrado"
              description="Envie a primeira norma pela area administrativa. A base normativa e mantida somente pela PCM/admin."
              action={
                <Link
                  className="inline-flex rounded-xl bg-[#123C7C] px-4 py-3 text-sm font-semibold text-white"
                  href="/admin/upload"
                >
                  Enviar norma
                </Link>
              }
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
