import { CustomerShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { TechnicalChatWorkspace } from "@/features/dashboard/components/technical-chat-workspace";

export default function DashboardChatPage() {
  return (
    <CustomerShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Chat tecnico"
          title="Consulta tecnica autenticada"
          description="Fluxo visual com classificacao, contexto faltante, paywall e liberacao futura de resposta completa com fontes."
        />
        <TechnicalChatWorkspace />
      </div>
    </CustomerShell>
  );
}
