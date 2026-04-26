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

function ProcessingErrorMessage({ error }: { error: string }) {
  if (/23503|foreign key|fkey/i.test(error)) {
    return (
      <span className="text-red-600">
        Falha ao salvar linhas da tabela normativa: a tabela principal nao foi criada antes das linhas (FK 23503).
        Reprocesse o documento; se persistir, verifique os logs da Vercel.
      </span>
    );
  }
  if (/MaxClients|max clients|pool_size/i.test(error)) {
    return (
      <span className="text-amber-600">
        Limite de conexoes do banco atingido durante o processamento (MaxClientsInSessionMode).
        Aguarde alguns segundos e reprocesse. Se persistir, verifique se DATABASE_URL usa o pooler de transacao do Supabase (porta 6543).
      </span>
    );
  }
  if (/504|timeout|time.?out/i.test(error)) {
    return (
      <span className="text-amber-600">
        Tempo limite do servidor ao processar o PDF. Tente novamente; se persistir, o PDF pode ser grande demais para o plano atual.
      </span>
    );
  }
  return <span className="text-red-500">{error.slice(0, 300)}</span>;
}

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
            <div className="max-w-full overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[980px] table-fixed divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="w-[31%] px-4 py-3 font-semibold">Documento</th>
                    <th className="w-[7%] px-3 py-3 font-semibold">Versao</th>
                    <th className="w-[8%] px-3 py-3 font-semibold">Status</th>
                    <th className="w-[11%] px-3 py-3 font-semibold">Processamento</th>
                    <th className="w-[9%] px-3 py-3 font-semibold">Paginas</th>
                    <th className="w-[8%] px-3 py-3 font-semibold">Chunks</th>
                    <th className="w-[14%] px-3 py-3 font-semibold">Observacao</th>
                    <th className="w-[12%] px-3 py-3 font-semibold">Acao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {versions.data.map((version) => (
                    <tr key={version.id}>
                      <td className="break-words px-4 py-4 font-medium text-slate-800">
                        {version.documentTitle}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        {version.versionLabel}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        {version.status}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        {version.processingStatus}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        {version.pageCount} paginas
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        {version.chunkCount} chunks
                      </td>
                      <td className="break-words px-3 py-4 leading-6">
                        {version.processingError
                          ? <ProcessingErrorMessage error={version.processingError} />
                          : "Aguardando processamento com extracao de texto e chunks estruturados."}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-col gap-2 xl:flex-row">
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
