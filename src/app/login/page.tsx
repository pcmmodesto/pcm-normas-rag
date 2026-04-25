import { redirect } from "next/navigation";
import { PublicShell } from "@/components/layout/app-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser?.role === "ADMIN") {
    redirect("/admin");
  }

  if (currentUser) {
    redirect("/dashboard");
  }

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
        <LoginForm />
      </section>
    </PublicShell>
  );
}
