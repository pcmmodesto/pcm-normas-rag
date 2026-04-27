import { AdminShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ImportManualClient } from "./import-client";

export const dynamic = "force-dynamic";

export type DocVersionOption = {
  versionId: string;
  documentId: string;
  documentTitle: string;
  versionLabel: string;
  concessionaire: string | null;
  stateCodes: string[] | null;
};

export default async function ImportManualPage() {
  await requireAdmin();

  const rows = await prisma.$queryRaw<
    Array<{
      version_id: string;
      document_id: string;
      document_title: string;
      version_label: string;
      concessionaire: string | null;
      state_codes: string[] | null;
    }>
  >`
    select
      dv.id            as version_id,
      td.id            as document_id,
      td.title         as document_title,
      dv.version_label,
      td.concessionaire,
      td.state_codes
    from document_versions dv
    join technical_documents td on td.id = dv.document_id
    where dv.processing_status = 'READY'
    order by td.title asc, dv.version_label desc
    limit 200
  `.catch(() => []);

  const versions: DocVersionOption[] = rows.map((r) => ({
    versionId: r.version_id,
    documentId: r.document_id,
    documentTitle: r.document_title,
    versionLabel: r.version_label,
    concessionaire: r.concessionaire,
    stateCodes: r.state_codes,
  }));

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Importacao manual"
          title="Importar ativo normativo"
          description="Carregue imagens ou PDFs de tabelas, desenhos, detalhes, legendas, notas e requisitos. Estruture os dados, revise e valide antes de liberar como fonte tecnica."
        />
        <ImportManualClient versions={versions} />
      </div>
    </AdminShell>
  );
}
