import Link from "next/link";
import { AdminShell } from "@/components/layout/app-shell";
import { AdminWarning } from "@/components/ui/admin-warning";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { adminQuery } from "@/features/admin/lib/admin-database";
import { getAdminDocuments } from "@/features/admin/lib/admin-documents";
import { DeleteDocumentButton } from "@/features/documents/components/delete-document-button";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  const documents = await adminQuery(
    "admin documents list",
    () => getAdminDocuments(100),
    [],
  );

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
          {documents.data.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    {[
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
                    ].map((header) => (
                      <th className="px-4 py-3 font-semibold" key={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {documents.data.map((document) => (
                    <tr key={document.id}>
                      <td className="max-w-xl px-4 py-4 font-medium text-slate-900">
                        {document.title}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {document.concessionaire ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {document.stateCodes.join(", ") || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {String(document.documentType)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {document.versionLabel ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {String(document.status)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {formatDate(document.versionCreatedAt ?? document.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {document.pageCount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {document.chunkCount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {document.processingStatus
                          ? String(document.processingStatus)
                          : "PENDING"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <DeleteDocumentButton
                          documentId={document.id}
                          documentTitle={document.title}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
