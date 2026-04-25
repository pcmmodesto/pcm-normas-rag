"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AdminErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[admin] Route error boundary", {
      digest: error.digest,
      name: error.name,
    });
  }, [error]);

  return (
    <main className="min-h-screen bg-[#F1F5F9] px-5 py-10 text-[#0F172A]">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#123C7C]">
          Admin PCM
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Nao foi possivel carregar o painel agora
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          A autenticacao esta ativa, mas uma dependencia do servidor falhou ao
          montar esta tela. Tente recarregar; se persistir, consulte os logs da
          Vercel com o digest abaixo.
        </p>
        {error.digest ? (
          <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            Digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-[#123C7C] px-4 py-3 text-sm font-semibold text-white"
            onClick={() => unstable_retry()}
            type="button"
          >
            Recarregar painel
          </button>
          <Link
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#0F172A]"
            href="/"
          >
            Voltar ao inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
