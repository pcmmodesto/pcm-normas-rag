import { CustomerShell } from "@/components/layout/app-shell";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { PageHeader } from "@/components/ui/page-header";

export default function DashboardSettingsPage() {
  return (
    <CustomerShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Configuracoes"
          title="Conta e empresa"
          description="Dados do usuario, empresa, plano, preferencias, informacoes fiscais futuras e seguranca."
        />
        <div className="grid gap-6 xl:grid-cols-2">
          {["Dados do usuario", "Empresa", "Plano", "Preferencias", "Informacoes fiscais futuras", "Seguranca"].map((title) => (
            <DashboardSection key={title} title={title}>
              <div className="grid gap-3">
                <input className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-[#0F172A]" placeholder={title} />
                <button className="w-fit rounded-xl bg-[#123C7C] px-4 py-2 text-sm font-semibold text-white">
                  Salvar depois
                </button>
              </div>
            </DashboardSection>
          ))}
        </div>
      </div>
    </CustomerShell>
  );
}
