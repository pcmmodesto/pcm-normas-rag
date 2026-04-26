import { CustomerShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { TechnicalChatWorkspace } from "@/features/dashboard/components/technical-chat-workspace";

export const dynamic = "force-dynamic";

export default function DashboardChatPage() {
  return (
    <CustomerShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Chat tecnico"
          title="Consulta na base normativa"
          description="Respostas baseadas exclusivamente nos documentos indexados. Fontes citadas com documento, versao, pagina e trecho."
        />
        <TechnicalChatWorkspace />
      </div>
    </CustomerShell>
  );
}
