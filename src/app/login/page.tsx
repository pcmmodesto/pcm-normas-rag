import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

export default function LoginPage() {
  return (
    <AppShell>
      <section className="mx-auto grid min-h-[70vh] max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#b88405]">
            Acesso administrativo
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#172033] md:text-5xl">
            Entre para gerenciar o acervo técnico
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#5a667a]">
            Esta tela está pronta para autenticação futura com Supabase. Por
            enquanto, os campos são visuais e não enviam credenciais.
          </p>
        </div>

        <form className="rounded border border-[#d8dde6] bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-[#384457]">
            E-mail
            <input
              className="mt-2 w-full rounded border border-[#c8d0dc] px-3 py-3 outline-none transition focus:border-[#123c69] focus:ring-2 focus:ring-[#123c69]/15"
              placeholder="admin@empresa.com"
              type="email"
            />
          </label>
          <label className="mt-5 block text-sm font-medium text-[#384457]">
            Senha
            <input
              className="mt-2 w-full rounded border border-[#c8d0dc] px-3 py-3 outline-none transition focus:border-[#123c69] focus:ring-2 focus:ring-[#123c69]/15"
              placeholder="********"
              type="password"
            />
          </label>
          <button
            className="mt-6 w-full rounded bg-[#123c69] px-5 py-3 font-semibold text-white transition hover:bg-[#0f3156]"
            type="button"
          >
            Entrar
          </button>
          <Link
            className="mt-4 block text-center text-sm font-medium text-[#123c69]"
            href="/"
          >
            Voltar para início
          </Link>
        </form>
      </section>
    </AppShell>
  );
}
