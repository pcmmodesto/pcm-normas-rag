import Link from "next/link";
import { PublicShell } from "@/components/layout/app-shell";

export default function LoginPage() {
  return (
    <PublicShell>
      <section className="mx-auto grid min-h-[72vh] max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#19A7E8]">
            Acesso ao SaaS
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Entre para acessar seu painel e o chat tecnico
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#CBD5E1]">
            Tela visual preparada para autenticacao futura com e-mail, senha,
            recuperacao de acesso, criacao de conta e Google.
          </p>
        </div>
        <form className="rounded-2xl border border-slate-400/15 bg-white p-6 text-[#0F172A] shadow-2xl shadow-cyan-950/20">
          <label className="block text-sm font-medium text-slate-700">
            E-mail
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none transition focus:border-[#19A7E8] focus:ring-4 focus:ring-[#19A7E8]/10"
              placeholder="voce@empresa.com"
              type="email"
            />
          </label>
          <label className="mt-5 block text-sm font-medium text-slate-700">
            Senha
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none transition focus:border-[#19A7E8] focus:ring-4 focus:ring-[#19A7E8]/10"
              placeholder="********"
              type="password"
            />
          </label>
          <button
            className="mt-6 w-full rounded-xl bg-[#123C7C] px-5 py-3 font-semibold text-white transition hover:bg-[#0A1633]"
            type="button"
          >
            Entrar
          </button>
          <button
            className="mt-3 w-full rounded-xl border border-slate-200 px-5 py-3 font-semibold text-[#123C7C]"
            type="button"
          >
            Entrar com Google futuramente
          </button>
          <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">
            <Link className="font-medium text-[#123C7C]" href="/dashboard">
              Criar conta
            </Link>
            <Link className="font-medium text-[#123C7C]" href="/login">
              Recuperar senha
            </Link>
          </div>
        </form>
      </section>
    </PublicShell>
  );
}
