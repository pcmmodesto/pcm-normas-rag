import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { AdminWarning } from "@/components/ui/admin-warning";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { adminQuery } from "@/features/admin/lib/admin-database";
import { getAdminDocuments } from "@/features/admin/lib/admin-documents";
import { DocumentUploadForm } from "@/features/documents/components/document-upload-form";
import { getRuntimeEnvDiagnostics } from "@/lib/server-diagnostics";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const diagnostics = getRuntimeEnvDiagnostics();
  const recentDocuments = await adminQuery(
    "admin upload recent documents",
    () => getAdminDocuments(5),
    [],
  );

  const rows = recentDocuments.data.map((document) => [
    document.title,
    document.stateCodes.join(", ") || "-",
    document.processingStatus ? String(document.processingStatus) : String(document.status),
    formatDate(document.versionCreatedAt ?? document.createdAt),
  ]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Upload real"
          title="Upload de normas tecnicas"
          description="Envie PDFs para o bucket privado do Supabase Storage e registre metadados iniciais. Somente admin pode gerenciar a base normativa."
        />
        <AdminWarning
          title="Diagnostico seguro de configuracao"
          details={[
            `DATABASE_URL: ${diagnostics.variables.DATABASE_URL}`,
            `SUPABASE_URL: ${diagnostics.variables.SUPABASE_URL}`,
            `SUPABASE_SERVICE_ROLE_KEY: ${diagnostics.variables.SUPABASE_SERVICE_ROLE_KEY}`,
            `SUPABASE_DOCUMENTS_BUCKET: ${diagnostics.variables.SUPABASE_DOCUMENTS_BUCKET}`,
            diagnostics.sameProjectHint === false
              ? "DATABASE_URL e SUPABASE_URL parecem apontar para projetos diferentes."
              : "",
            recentDocuments.ok
              ? ""
              : `Consulta de documentos falhou: ${recentDocuments.errorName} (${recentDocuments.errorCode}).`,
          ].filter(Boolean)}
        />
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <DocumentUploadForm />
          <div className="space-y-6">
            <DashboardSection title="Regras do envio">
              <dl className="space-y-4 text-sm text-slate-700">
                <div>
                  <dt className="font-semibold text-[#0F172A]">Bucket</dt>
                  <dd className="mt-1">technical-documents privado, sem URL publica.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#0F172A]">Limite</dt>
                  <dd className="mt-1">PDF obrigatorio, ate 50 MB.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#0F172A]">Responsabilidade</dt>
                  <dd className="mt-1">
                    A base documental e administrada pela PCM. Clientes apenas
                    consultam respostas no chat.
                  </dd>
                </div>
              </dl>
            </DashboardSection>
            <DashboardSection title="Ultimos documentos enviados">
              {rows.length > 0 ? (
                <AdminTable
                  headers={["Titulo", "UF", "Status", "Data"]}
                  rows={rows}
                  statusColumn={2}
                  tone="light"
                />
              ) : (
                <EmptyState
                  title="Nenhum upload registrado"
                  description="Quando uma norma real for enviada, ela aparecera aqui."
                />
              )}
            </DashboardSection>
          </div>
        </div>
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
