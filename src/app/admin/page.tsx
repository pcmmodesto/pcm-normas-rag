import Link from "next/link";
import { AdminShell } from "@/components/layout/app-shell";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { UsageBar } from "@/components/ui/usage-bar";
import { adminKpis, adminMetrics, documentRows } from "@/features/dashboard/mock-data";

export default function AdminPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Admin interno"
          title="Operacao normativa PCM"
          description="Painel reservado para administradores: documentos, usuarios, assinaturas, financeiro, PDFs, logs e processamento."
          actions={
            <Link className="rounded-xl bg-[#123C7C] px-4 py-3 text-sm font-semibold text-white" href="/admin/upload">
              Enviar norma
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {adminMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
        <DashboardSection title="Indicadores comerciais e tecnicos">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {adminKpis.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>
        </DashboardSection>
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <DashboardSection title="Uso operacional">
            <div className="space-y-5">
              <UsageBar label="Consultas tecnicas no limite mensal" value={54} />
              <UsageBar label="Storage do bucket tecnico" value={38} />
              <UsageBar label="PDFs exportados no mes" value={61} />
              <UsageBar label="Conversao gratuito para pago" value={12} />
            </div>
          </DashboardSection>
          <DashboardSection title="Documentos pendentes">
            <div className="space-y-3">
              {documentRows.slice(0, 3).map((row) => (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={row[0]}>
                  <p className="font-semibold text-[#0F172A]">{row[0]}</p>
                  <p className="text-sm text-slate-500">
                    {row[1]} - {row[2]} - {row[4]}
                  </p>
                </div>
              ))}
            </div>
          </DashboardSection>
        </div>
      </div>
    </AdminShell>
  );
}
