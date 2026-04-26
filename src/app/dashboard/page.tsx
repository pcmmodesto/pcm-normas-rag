import Link from "next/link";
import { CustomerShell } from "@/components/layout/app-shell";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { adminQuery, countTable } from "@/features/admin/lib/admin-database";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RecentQuestion = {
  id: string;
  question: string;
  created_at: Date;
  status: string;
};

async function getRecentQuestions(userId: string): Promise<RecentQuestion[]> {
  try {
    return await prisma.$queryRaw<RecentQuestion[]>`
      select id, question, created_at, status
      from rag_questions
      where user_id = ${userId}
      order by created_at desc
      limit 5
    `;
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  const [totalChunks, totalDocuments] = await Promise.all([
    adminQuery("count chunks", () => countTable("document_chunks"), 0),
    adminQuery("count documents", () => countTable("technical_documents"), 0),
  ]);

  const recentQuestions = currentUser
    ? await getRecentQuestions(currentUser.id)
    : [];

  const displayName = currentUser?.name ?? currentUser?.email ?? "Usuario";
  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <CustomerShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow={isAdmin ? "Admin interno - Area do cliente" : "Painel do cliente"}
          title={`Bem-vindo, ${displayName}`}
          description="Consulte a base normativa tecnica com respostas baseadas em documentos reais."
          actions={
            <>
              <Link
                className="rounded-xl bg-[#123C7C] px-4 py-3 text-sm font-semibold text-white"
                href="/dashboard/chat"
              >
                Abrir chat tecnico
              </Link>
              {isAdmin && (
                <Link
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#123C7C]"
                  href="/admin"
                >
                  Voltar ao admin
                </Link>
              )}
            </>
          }
        />

        {!isAdmin && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Pagamentos ainda nao estao conectados. O acesso ao chat tecnico esta
            disponivel em modo de avaliacao.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Documentos na base"
            value={String(totalDocuments.data)}
            detail="Normas tecnicas indexadas"
          />
          <MetricCard
            label="Chunks indexados"
            value={String(totalChunks.data)}
            detail="Trechos pesquisaveis"
          />
          <MetricCard
            label="Consultas recentes"
            value={String(recentQuestions.length)}
            detail="Ultimas perguntas feitas"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DashboardSection title="Acesso rapido">
            <div className="grid gap-3">
              <Link
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-[#19A7E8] hover:shadow-sm"
                href="/dashboard/chat"
              >
                <div>
                  <p className="font-semibold text-[#0F172A]">Chat tecnico</p>
                  <p className="text-sm text-slate-500">
                    Consultas com fontes normativas reais
                  </p>
                </div>
                <span className="rounded-full bg-[#E0F2FE] px-3 py-1 text-xs font-semibold text-[#075985]">
                  Abrir
                </span>
              </Link>
              <Link
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-[#19A7E8] hover:shadow-sm"
                href="/dashboard/history"
              >
                <div>
                  <p className="font-semibold text-[#0F172A]">Historico</p>
                  <p className="text-sm text-slate-500">Consultas anteriores</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Ver
                </span>
              </Link>
            </div>
          </DashboardSection>

          <DashboardSection title="Historico recente">
            {recentQuestions.length > 0 ? (
              <div className="space-y-3">
                {recentQuestions.map((q) => (
                  <div
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    key={q.id}
                  >
                    <p className="font-medium text-[#0F172A] line-clamp-2">
                      {q.question}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(q.created_at))}{" "}
                      — {q.status}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                <p className="text-sm text-slate-500">
                  Nenhuma consulta ainda.
                </p>
                <Link
                  className="mt-3 inline-flex rounded-xl bg-[#123C7C] px-4 py-2 text-sm font-semibold text-white"
                  href="/dashboard/chat"
                >
                  Fazer primeira consulta
                </Link>
              </div>
            )}
          </DashboardSection>
        </div>
      </div>
    </CustomerShell>
  );
}
