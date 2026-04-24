import Link from "next/link";
import { mainNavigation, productDisclaimer } from "@/lib/navigation";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#18202f]">
      <header className="border-b border-[#d8dde6] bg-white/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-[#123c69] text-sm font-bold text-white">
              PCM
            </span>
            <span>
              <span className="block text-base font-semibold">
                PCM Normas RAG
              </span>
              <span className="block text-xs text-[#657187]">
                Consulta técnica independente
              </span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            {mainNavigation.map((item) => (
              <Link
                className="rounded border border-transparent px-3 py-2 text-[#384457] transition hover:border-[#c8d0dc] hover:bg-[#f2f5f9]"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
            <Link
              className="rounded bg-[#f5c542] px-3 py-2 font-semibold text-[#172033] transition hover:bg-[#e7b82f]"
              href="/login"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#d8dde6] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-[#657187] md:flex-row md:items-center md:justify-between">
          <p>{productDisclaimer}</p>
          <p>Base estrutural sem banco, IA ou upload real nesta etapa.</p>
        </div>
      </footer>
    </div>
  );
}
