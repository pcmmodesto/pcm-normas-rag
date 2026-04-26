import { AdminShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { RagDebugClient } from "./rag-debug-client";

export const dynamic = "force-dynamic";

export default function AdminRagDebugPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Diagnostico"
          title="Debug RAG"
          description="Inspecione como a busca normativa classifica a intencao, extrai termos, pontua e filtra chunks para qualquer pergunta."
        />
        <RagDebugClient />
      </div>
    </AdminShell>
  );
}
