import Link from "next/link";
import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { AdminWarning } from "@/components/ui/admin-warning";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { adminQuery } from "@/features/admin/lib/admin-database";
import { getAdminDocuments } from "@/features/admin/lib/admin-documents";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  const documents = await adminQuery(
    "admin documents list",
    () => getAdminDocuments(100),
    [],
  );

  const rows = documents.data.map((document) => [
      document.title,
      document.concessionaire ?? "-",
      document.stateCodes.join(", ") || "-",
      String(document.documentType),
      document.versionLabel ?? "-",
      String(document.status),
      formatDate(document.versionCreatedAt ?? document.createdAt),
      String(document.pageCount),
      String(document.chunkCount),
      document.processingStatus ? String(document.processingStatus) : "PENDING",
      "Ver",
    ]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Documentos"
          title="Acervo normativo"
          description="Documentos reais cadastrados no banco. O cliente nao envia nem gerencia documentos."
        />
        <AdminWarning
          title="A listagem de documentos encontrou um problema"
          details={
            documents.ok
              ? []
              : [`Consulta ${documents.errorName} (${documents.errorCode}). Veja o Runtime Log da Vercel.`]
          }
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
