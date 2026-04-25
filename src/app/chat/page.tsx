import Link from "next/link";
import { PublicShell } from "@/components/layout/app-shell";
import { FreeChatWidget } from "@/features/dashboard/components/free-chat-widget";

export default function ChatPage() {
  return (
    <PublicShell>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#19A7E8]">
            Chat publico
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Comece pela consulta gratuita
          </h1>
          <p className="mt-5 text-base leading-7 text-[#CBD5E1]">
            O chat tecnico completo fica dentro da area do cliente em
            `/dashboard/chat`. Consultas avancadas exigem compra avulsa ou
            assinatura.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="rounded-xl bg-[#19A7E8] px-5 py-3 text-center font-semibold text-[#050B1F]" href="/login">
              Entrar para chat tecnico
            </Link>
            <Link className="rounded-xl border border-white/15 px-5 py-3 text-center font-semibold text-white" href="/pricing">
              Ver planos
            </Link>
          </div>
        </div>
        <FreeChatWidget />
      </section>
    </PublicShell>
  );
}
