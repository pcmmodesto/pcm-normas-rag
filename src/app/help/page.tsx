import { PublicShell } from "@/components/layout/app-shell";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { HelpAccordion } from "@/components/ui/help-accordion";
import { PageHeader } from "@/components/ui/page-header";
import { helpSections } from "@/features/dashboard/mock-data";

export default function HelpPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-5xl px-5 py-12">
        <PageHeader
          eyebrow="Central de ajuda"
          title="Como usar o PCM Normas RAG"
          description="Guia publico para perguntas basicas, consultas tecnicas, fontes, PDFs, limites da IA e assinaturas futuras."
          tone="dark"
        />
        <div className="mt-8">
          <DashboardSection title="Perguntas frequentes" tone="dark">
            <HelpAccordion sections={helpSections} />
          </DashboardSection>
        </div>
      </section>
    </PublicShell>
  );
}
