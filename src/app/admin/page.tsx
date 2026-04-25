import Link from "next/link";
import { AdminShell } from "@/components/layout/app-shell";
import { AdminWarning } from "@/components/ui/admin-warning";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { adminQuery, countTable } from "@/features/admin/lib/admin-database";
import { getAdminDocuments } from "@/features/admin/lib/admin-documents";
import { logRuntimeEnvDiagnostics } from "@/lib/server-diagnostics";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const diagnostics = logRuntimeEnvDiagnostics("admin-page");
  const [
    totalUsers,
    totalDocuments,
    totalVersions,
    totalChunks,
    totalAuditLogs,
    pendingVersions,
    failedVersions,
  ] = await Promise.all([
    adminQuery("count users", () => countTable("users"), 0),
    adminQuery("count technical_documents", () => countTable("technical_documents"), 0),
    adminQuery("count document_versions", () => countTable("document_versions"), 0),
    adminQuery("count document_chunks", () => countTable("document_chunks"), 0),
    adminQuery("count audit_logs", () => countTable("audit_logs"), 0),
    adminQuery(
      "count pending document_versions",
      () => countPendingVersions(),
      0,
    ),
    adminQuery(
      "count failed document_versions",
      () => countVersionsByProcessingStatus("FAILED"),
      0,
    ),
  ]);

  const recentDocuments = await adminQuery(
    "recent technical_documents",
    () => getAdminDocuments(5),
    [],
  );
  const queryIssues = [
    totalUsers,
    totalDocuments,
    totalVersions,
    totalChunks,
    totalAuditLogs,
    pendingVersions,
    failedVersions,
    recentDocuments,
  ].filter((result) => !result.ok);
  const warningDetails = [
    ...queryIssues.map(
      (issue) =>
        `Consulta ${issue.errorName} (${issue.errorCode}). Veja o Runtime Log da Vercel para o label exato.`,
    ),
    diagnostics.sameProjectHint === false
      ? "DATABASE_URL e SUPABASE_URL parecem apontar para projetos Supabase diferentes."
      : "",
  ].filter(Boolean);

  const metrics = [
    { label: "Usuarios", value: String(totalUsers.data), detail: "Usuarios reais sincronizados" },
    { label: "Documentos", value: String(totalDocuments.data), detail: "TechnicalDocument real" },
    { label: "Versoes", value: String(totalVersions.data), detail: "DocumentVersion real" },
    { label: "Chunks", value: String(totalChunks.data), detail: "DocumentChunk real" },
    { label: "Auditoria", value: String(totalAuditLogs.data), detail: "AuditLog real" },
    { label: "PDFs", value: "0", detail: "Modulo em preparacao" },
    { label: "Pendentes", value: String(pendingVersions.data), detail: "Aguardando processamento" },
    { label: "Erros", value: String(failedVersions.data), detail: "Falhas de processamento" },
  ];

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Admin interno"
          title="Operacao normativa PCM"
          description="Indicadores reais do banco quando disponiveis. Modulos futuros aparecem como zero ou em preparacao."
          actions={
            <Link
              className="rounded-xl bg-[#123C7C] px-4 py-3 text-sm font-semibold text-white"
              href="/admin/upload"
            >
              Enviar norma
            </Link>
          }
        />
        <AdminWarning
          title="Diagnostico controlado do banco"
          details={warningDetails}
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <DashboardSection title="Status da base normativa">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Documentos ativos"
                value={String(totalDocuments.data)}
                detail="Total real em TechnicalDocument"
              />
              <MetricCard
                label="Versoes pendentes"
                value={String(pendingVersions.data)}
                detail="Aguardando pipeline futuro"
              />
            </div>
          </DashboardSection>
          <DashboardSection title="Documentos recentes">
            {recentDocuments.data.length > 0 ? (
              <div className="space-y-3">
                {recentDocuments.data.map((document) => (
                  <div
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    key={document.id}
                  >
                    <p className="font-semibold text-[#0F172A]">{document.title}</p>
                    <p className="text-sm text-slate-500">
                      {document.concessionaire ?? "Sem concessionaria"} -{" "}
                      {document.stateCodes.join(", ") || "UF nao informada"} -{" "}
                      {document.versionLabel ?? "sem versao"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhum documento real cadastrado"
                description="Use o upload administrativo para iniciar a base normativa."
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
      </div>
    </AdminShell>
  );
}

async function countPendingVersions() {
  const rows = await import("@/lib/prisma").then(({ prisma }) =>
    prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
      select count(*)::bigint as count
      from document_versions
      where processing_status in ('PENDING', 'EXTRACTING', 'CHUNKING', 'EMBEDDING')
    `,
  );

  return Number(rows[0]?.count ?? 0);
}

async function countVersionsByProcessingStatus(status: string) {
  const rows = await import("@/lib/prisma").then(({ prisma }) =>
    prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
      select count(*)::bigint as count
      from document_versions
      where processing_status = ${status}
    `,
  );

  return Number(rows[0]?.count ?? 0);
}
