import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatCard } from "@/components/ui/stat-card";

const queue = [
  "Modelar usuários, perfis e permissões",
  "Conectar Supabase Auth e Storage",
  "Criar schema Prisma para normas, páginas e chunks",
  "Habilitar pgvector e pipeline de embeddings",
];

export default function AdminPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Painel administrativo"
            title="Governança do acervo técnico"
            description="Visão inicial para acompanhar normas, processamento e integrações planejadas. Nenhuma operação de banco ou IA está ativa nesta etapa."
          />
          <Link
            className="rounded bg-[#123c69] px-5 py-3 text-center font-semibold text-white transition hover:bg-[#0f3156]"
            href="/admin/upload"
          >
            Nova norma
          </Link>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <StatCard detail="Aguardando uploads reais." label="Documentos" value="0" />
          <StatCard detail="Pipeline ainda não implementado." label="Processados" value="0%" />
          <StatCard detail="Auditoria será adicionada depois." label="Alertas" value="0" />
        </div>

        <div className="mt-10 rounded border border-[#d8dde6] bg-white">
          <div className="border-b border-[#d8dde6] p-5">
            <h2 className="text-xl font-semibold text-[#172033]">
              Próximas entregas técnicas
            </h2>
          </div>
          <ul className="divide-y divide-[#e5e9f0]">
            {queue.map((item) => (
              <li className="flex items-center justify-between gap-4 p-5" key={item}>
                <span className="text-sm text-[#384457]">{item}</span>
                <span className="rounded bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-[#657187]">
                  Planejado
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
