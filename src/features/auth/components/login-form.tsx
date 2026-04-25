"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "signup" | "recover";

type AuthSessionResponse = {
  ok: boolean;
  redirectTo?: string;
  message?: string;
};

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function resolveSessionRedirect() {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      cache: "no-store",
    });
    const result = (await response.json()) as AuthSessionResponse;

    if (!response.ok || !result.ok) {
      throw new Error(result.message ?? "Nao foi possivel sincronizar o usuario.");
    }

    return result.redirectTo || "/dashboard";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "recover") {
        const { error: recoverError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/login`
                : undefined,
          },
        );

        if (recoverError) {
          throw recoverError;
        }

        setMessage("Enviamos as instrucoes de recuperacao para o e-mail informado.");
        return;
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          throw signUpError;
        }

        if (!data.session) {
          setMessage(
            "Conta criada. Confira seu e-mail se a confirmacao estiver habilitada no Supabase.",
          );
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }
      }

      const redirectTo = await resolveSessionRedirect();
      router.push(redirectTo);
      router.refresh();
    } catch (authError) {
      setError(getFriendlyAuthError(authError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="rounded-2xl border border-slate-400/15 bg-white p-6 text-[#0F172A] shadow-2xl shadow-cyan-950/20"
      onSubmit={handleSubmit}
    >
      <div className="mb-5 flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
        <button
          className={`flex-1 rounded-lg px-3 py-2 ${
            mode === "login" ? "bg-white text-[#123C7C] shadow-sm" : "text-slate-500"
          }`}
          onClick={() => setMode("login")}
          type="button"
        >
          Entrar
        </button>
        <button
          className={`flex-1 rounded-lg px-3 py-2 ${
            mode === "signup" ? "bg-white text-[#123C7C] shadow-sm" : "text-slate-500"
          }`}
          onClick={() => setMode("signup")}
          type="button"
        >
          Criar conta
        </button>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        E-mail
        <input
          autoComplete="email"
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none transition focus:border-[#19A7E8] focus:ring-4 focus:ring-[#19A7E8]/10"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@empresa.com"
          required
          type="email"
          value={email}
        />
      </label>

      {mode !== "recover" ? (
        <label className="mt-5 block text-sm font-medium text-slate-700">
          Senha
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none transition focus:border-[#19A7E8] focus:ring-4 focus:ring-[#19A7E8]/10"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
            required
            type="password"
            value={password}
          />
        </label>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <button
        className="mt-6 w-full rounded-xl bg-[#123C7C] px-5 py-3 font-semibold text-white transition hover:bg-[#0A1633] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting
          ? "Processando..."
          : mode === "recover"
            ? "Enviar recuperacao"
            : mode === "signup"
              ? "Criar conta"
              : "Entrar"}
      </button>

      <button
        className="mt-3 w-full rounded-xl border border-slate-200 px-5 py-3 font-semibold text-[#123C7C]"
        disabled
        type="button"
      >
        Entrar com Google futuramente
      </button>

      <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">
        <button
          className="font-medium text-[#123C7C]"
          onClick={() => setMode(mode === "recover" ? "login" : "recover")}
          type="button"
        >
          {mode === "recover" ? "Voltar para login" : "Recuperar senha"}
        </button>
        <button
          className="font-medium text-[#123C7C]"
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
          type="button"
        >
          {mode === "signup" ? "Ja tenho conta" : "Criar conta"}
        </button>
      </div>
    </form>
  );
}

function getFriendlyAuthError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Nao foi possivel concluir a autenticacao.";
  }

  if (error.message.toLowerCase().includes("invalid login credentials")) {
    return "E-mail ou senha invalidos.";
  }

  return error.message || "Nao foi possivel concluir a autenticacao.";
}
