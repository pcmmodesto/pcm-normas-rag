import Link from "next/link";
import { CustomerShell } from "@/components/layout/app-shell";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { UsageBar } from "@/components/ui/usage-bar";
import { dashboardMetrics, historyRows } from "@/features/dashboard/mock-data";

export default function DashboardPage() {
  return (
    <CustomerShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Painel do cliente"
          title="Seu uso normativo"
          description="Ambiente pos-login com plano atual, assinatura, consultas usadas, creditos, PDFs e historico recente."
          actions={
            <>
              <Link className="rounded-xl bg-[#123C7C] px-4 py-3 text-sm font-semibold text-white" href="/dashboard/chat">
                Nova consulta tecnica
              </Link>
              <Link className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#123C7C]" href="/pricing">
                Comprar ou assinar
              </Link>
            </>
          }
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboardMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <DashboardSection title="Consumo do mes">
            <div className="space-y-5">
              <UsageBar label="Consultas usadas" value={54} />
              <UsageBar label="PDFs gerados" value={31} />
              <UsageBar label="Consultas gratuitas" value={62} />
              <UsageBar label="Consultas tecnicas" value={38} />
            </div>
          </DashboardSection>
          <DashboardSection title="Historico recente">
            <div className="space-y-3">
              {historyRows.map((row) => (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={row[0]}>
                  <p className="font-semibold text-[#0F172A]">{row[0]}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {row[1]} - {row[2]} - {row[3]}
                  </p>
                </div>
              ))}
            </div>
          </DashboardSection>
        </div>
      </div>
    </CustomerShell>
  );
}
