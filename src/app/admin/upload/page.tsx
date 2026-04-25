import { AdminShell } from "@/components/layout/app-shell";
import { AdminTable } from "@/components/ui/admin-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentUploadForm } from "@/features/documents/components/document-upload-form";
import { recentUploads } from "@/features/dashboard/mock-data";

export default function UploadPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Upload real"
          title="Upload de normas tecnicas"
          description="Envie PDFs para o bucket privado do Supabase Storage e registre metadados iniciais. O formulario real e a rota /api/documents/upload continuam preservados."
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
                  <dt className="font-semibold text-[#0F172A]">Proxima etapa</dt>
                  <dd className="mt-1">Extracao de texto, paginas, chunks, tabelas e embeddings.</dd>
                </div>
              </dl>
            </DashboardSection>
            <DashboardSection title="Ultimos documentos enviados">
              <AdminTable
                headers={["Titulo", "UF", "Status", "Data"]}
                rows={recentUploads}
                statusColumn={2}
                tone="light"
              />
            </DashboardSection>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
