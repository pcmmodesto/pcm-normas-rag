import { AdminShell } from "@/components/layout/app-shell";
import { AdminWarning } from "@/components/ui/admin-warning";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { adminQuery } from "@/features/admin/lib/admin-database";
import { getAdminDocumentVersions } from "@/features/admin/lib/admin-documents";
import { DeleteDocumentButton } from "@/features/documents/components/delete-document-button";
import { ProcessDocumentButton } from "@/features/documents/components/process-document-button";

export const dynamic = "force-dynamic";

export default async function AdminProcessingPage() {
  const versions = await adminQuery(
    "admin processing versions",
    () => getAdminDocumentVersions(50),
    [],
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Processamento"
          title="Pipeline de documentos"
          description="Status real das versoes cadastradas. Extracao de texto e chunking normativo ja rodam no servidor; embeddings entram em etapa futura."
        />
        <AdminWarning
          title="A fila de processamento encontrou um problema"
          details={
            versions.ok
              ? []
              : [
                  `Consulta ${versions.errorName} (${versions.errorCode}). Veja o Runtime Log da Vercel.`,
                ]
          }
        />
        <DashboardSection title="Fila de processamento">
          {versions.data.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    {[
                      "Documento",
                      "Versao",
                      "Status",
                      "Processamento",
                      "Paginas",
                      "Chunks",
                      "Observacao",
                      "Acao",
                    ].map((header) => (
                      <th className="px-4 py-3 font-semibold" key={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {versions.data.map((version) => (
                    <tr key={version.id}>
                      <td className="whitespace-nowrap px-4 py-4">
                        {version.documentTitle}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {version.versionLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {version.status}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {version.processingStatus}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {version.pageCount} paginas
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {version.chunkCount} chunks
                      </td>
                      <td className="max-w-sm px-4 py-4">
                        {version.processingError ??
                          "Aguardando processamento com extracao de texto e chunks estruturados."}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex gap-2">
                          <ProcessDocumentButton versionId={version.id} />
                          <DeleteDocumentButton
                            documentId={version.documentId}
                            documentTitle={version.documentTitle}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Nenhuma versao encontrada"
              description="Envie uma norma em /admin/upload; ela aparecera aqui para extracao de texto e chunking estruturado."
            />
          )}
        </DashboardSection>
      </div>
    </AdminShell>
  );
}
