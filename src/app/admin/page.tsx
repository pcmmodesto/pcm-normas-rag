import Link from "next/link";
import { AdminShell } from "@/components/layout/app-shell";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { safePrisma } from "@/lib/prisma-safe";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [
    totalUsers,
    totalDocuments,
    totalVersions,
    totalQuestions,
    totalAnswers,
    pendingVersions,
    failedVersions,
  ] = await Promise.all([
    safePrisma(() => prisma.user.count(), 0),
    safePrisma(() => prisma.technicalDocument.count(), 0),
    safePrisma(() => prisma.documentVersion.count(), 0),
    safePrisma(() => prisma.ragQuestion.count(), 0),
    safePrisma(() => prisma.ragAnswer.count(), 0),
    safePrisma(
      () =>
        prisma.documentVersion.count({
          where: {
            processingStatus: {
              in: ["PENDING", "EXTRACTING", "CHUNKING", "EMBEDDING"],
            },
          },
        }),
      0,
    ),
    safePrisma(
      () => prisma.documentVersion.count({ where: { processingStatus: "FAILED" } }),
      0,
    ),
  ]);

  const recentDocuments = await safePrisma(
    () =>
      prisma.technicalDocument.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          concessionaire: true,
          stateCodes: true,
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              versionLabel: true,
            },
          },
        },
      }),
    [],
  );

  const metrics = [
    { label: "Usuarios", value: String(totalUsers), detail: "Usuarios reais sincronizados" },
    { label: "Documentos", value: String(totalDocuments), detail: "Normas cadastradas" },
    { label: "Versoes", value: String(totalVersions), detail: "Arquivos enviados" },
    { label: "Consultas", value: String(totalQuestions), detail: "Perguntas registradas" },
    { label: "Respostas RAG", value: String(totalAnswers), detail: "Respostas geradas" },
    { label: "PDFs", value: "0", detail: "Modulo em preparacao" },
    { label: "Pendentes", value: String(pendingVersions), detail: "Processamento futuro" },
    { label: "Erros", value: String(failedVersions), detail: "Falhas de processamento" },
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
                value={String(totalDocuments)}
                detail="Total real em TechnicalDocument"
              />
              <MetricCard
                label="Versoes pendentes"
                value={String(pendingVersions)}
                detail="Aguardando pipeline futuro"
              />
            </div>
          </DashboardSection>
          <DashboardSection title="Documentos recentes">
            {recentDocuments.length > 0 ? (
              <div className="space-y-3">
                {recentDocuments.map((document) => {
                  const version = document.versions[0];

                  return (
                    <div
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      key={document.id}
                    >
                      <p className="font-semibold text-[#0F172A]">{document.title}</p>
                      <p className="text-sm text-slate-500">
                        {document.concessionaire ?? "Sem concessionaria"} -{" "}
                        {document.stateCodes.join(", ") || "UF nao informada"} -{" "}
                        {version?.versionLabel ?? "sem versao"}
                      </p>
                    </div>
                  );
                })}
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
