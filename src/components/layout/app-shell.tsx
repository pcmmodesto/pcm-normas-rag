import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireAdmin, requireCustomer } from "@/lib/auth/session";
import {
  adminNavigation,
  dashboardNavigation,
  productDisclaimer,
  publicNavigation,
} from "@/lib/navigation";

type ShellProps = {
  children: React.ReactNode;
};

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#123C7C] to-[#19A7E8] text-sm font-bold text-white shadow-lg shadow-cyan-950/30">
        PCM
      </span>
      <span>
        <span
          className={`block text-base font-semibold tracking-tight ${
            inverse ? "text-[#0F172A]" : "text-white"
          }`}
        >
          PCM Normas RAG
        </span>
        <span className={`block text-xs ${inverse ? "text-slate-500" : "text-[#CBD5E1]"}`}>
          Inteligencia normativa para engenharia
        </span>
      </span>
    </Link>
  );
}

export function PublicShell({ children }: ShellProps) {
  return (
    <div className="min-h-screen bg-[#050B1F] text-[#F8FAFC]">
      <header className="sticky top-0 z-40 border-b border-slate-400/15 bg-[#050B1F]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Brand />
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            {publicNavigation.map((item) => (
              <Link
                className={
                  item.href === "/login"
                    ? "rounded-xl bg-[#19A7E8] px-4 py-2.5 font-semibold text-[#050B1F] transition hover:bg-[#8EDBFF]"
                    : "rounded-xl px-3 py-2.5 font-medium text-[#CBD5E1] transition hover:bg-white/10 hover:text-white"
                }
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-slate-400/15 bg-[#050B1F]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-[#94A3B8] md:flex-row md:items-center md:justify-between">
          <p>{productDisclaimer}</p>
          <p>Consultas tecnicas avancadas exigem compra avulsa ou assinatura.</p>
        </div>
      </footer>
    </div>
  );
}

export async function CustomerShell({ children }: ShellProps) {
  const currentUser = await requireCustomer();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Brand inverse />
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#E0F2FE] px-3 py-1 text-xs font-semibold text-[#075985]">
              {currentUser.role === "ADMIN" ? "Admin autenticado" : "Cliente autenticado"}
            </span>
            {currentUser.role === "ADMIN" ? (
              <Link
                className="rounded-xl bg-[#123C7C] px-3 py-2 text-sm font-semibold text-white"
                href="/admin"
              >
                Ir para admin
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#123C7C]">
            Cliente
          </p>
          <nav className="mt-4 grid gap-1">
            {dashboardNavigation.map((item) => (
              <Link
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-[#E0F2FE] hover:text-[#0F172A]"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
            <LogoutButton />
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-5 text-sm text-slate-500">
          {productDisclaimer}
        </div>
      </footer>
    </div>
  );
}

export async function AdminShell({ children }: ShellProps) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A]">
      <header className="border-b border-slate-200 bg-[#050B1F]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Brand />
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold text-[#F8E7A1]">
              Admin interno
            </span>
            <Link
              className="rounded-xl border border-[#19A7E8]/40 bg-[#19A7E8]/10 px-3 py-1.5 text-xs font-semibold text-[#8EDBFF] transition hover:bg-[#19A7E8]/20"
              href="/dashboard/chat"
            >
              Testar chat tecnico
            </Link>
            <Link
              className="rounded-xl border border-slate-400/30 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
              href="/dashboard"
            >
              Area do cliente
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#123C7C]">
            Admin
          </p>
          <nav className="mt-4 grid gap-1">
            {adminNavigation.map((item) => (
              <Link
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-[#E0F2FE] hover:text-[#0F172A]"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
            <LogoutButton />
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-5 text-sm text-slate-500">
          {productDisclaimer}
        </div>
      </footer>
    </div>
  );
}

export function AppShell({ children }: ShellProps) {
  return <PublicShell>{children}</PublicShell>;
}
