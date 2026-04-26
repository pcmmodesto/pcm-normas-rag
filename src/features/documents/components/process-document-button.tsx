"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProcessDocumentButtonProps = {
  versionId: string;
};

type ProcessResult = {
  ok: boolean;
  message?: string;
  pages?: number;
  chunks?: number;
};

export function ProcessDocumentButton({ versionId }: ProcessDocumentButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);

  async function handleClick() {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/document-versions/${versionId}/process`, {
        method: "POST",
      });

      const data = (await response.json()) as ProcessResult;

      if (data.ok) {
        const extra =
          typeof data.pages === "number" && typeof data.chunks === "number"
            ? ` (${data.pages} pags, ${data.chunks} chunks)`
            : "";
        setFeedback({ type: "ok", message: `Processado com sucesso${extra}.` });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: data.message ?? "Erro ao processar o documento.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Nao foi possivel conectar ao servidor." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        className="rounded-lg bg-[#123C7C] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0A1633] disabled:opacity-60"
        disabled={isSubmitting}
        onClick={handleClick}
        type="button"
      >
        {isSubmitting ? "Processando..." : "Processar documento"}
      </button>
      {feedback && (
        <p
          className={`text-xs ${
            feedback.type === "ok" ? "text-green-600" : "text-red-500"
          }`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
