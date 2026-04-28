"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ArchiveVersionButtonProps = {
  versionId: string;
  isArchived: boolean;
};

type ArchiveResult = {
  ok: boolean;
  message?: string;
  version?: {
    status?: string;
  };
};

export function ArchiveVersionButton({ versionId, isArchived }: ArchiveVersionButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);

  async function handleClick() {
    if (isArchived || isSubmitting) return;

    const confirmed = window.confirm(
      "Arquivar esta versao remove seus chunks e ativos da busca ativa, mas preserva o historico. Continuar?",
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/document-versions/${versionId}/archive`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: "Versao substituida por revisao normativa mais recente.",
        }),
      });
      const data = (await response.json()) as ArchiveResult;

      if (response.ok && data.ok) {
        setFeedback({ type: "ok", message: data.message ?? "Versao arquivada." });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: data.message ?? `Erro HTTP ${response.status} ao arquivar a versao.`,
        });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Nao foi possivel conectar ao servidor.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        disabled={isArchived || isSubmitting}
        onClick={handleClick}
        type="button"
      >
        {isArchived ? "Arquivada" : isSubmitting ? "Arquivando..." : "Arquivar versao"}
      </button>
      {feedback && (
        <p className={`text-xs ${feedback.type === "ok" ? "text-green-600" : "text-red-500"}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}
