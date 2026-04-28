"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProcessDocumentButtonProps = {
  versionId: string;
  disabled?: boolean;
};

type ProcessResult = {
  ok: boolean;
  message?: string;
  pages?: number;
  chunks?: number;
};

export function ProcessDocumentButton({ versionId, disabled = false }: ProcessDocumentButtonProps) {
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

      const data = await parseProcessResponse(response);

      if (response.ok && data.ok) {
        const extra =
          typeof data.pages === "number" && typeof data.chunks === "number"
            ? ` (${data.pages} pags, ${data.chunks} chunks)`
            : "";
        setFeedback({ type: "ok", message: `Processado com sucesso${extra}.` });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: data.message ?? `Erro HTTP ${response.status} ao processar o documento.`,
        });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? `Nao foi possivel concluir a chamada: ${error.message}`
            : "Nao foi possivel conectar ao servidor.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        className="rounded-lg bg-[#123C7C] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0A1633] disabled:opacity-60"
        disabled={disabled || isSubmitting}
        onClick={handleClick}
        type="button"
      >
        {disabled ? "Arquivado" : isSubmitting ? "Processando..." : "Processar documento"}
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

async function parseProcessResponse(response: Response): Promise<ProcessResult> {
  const text = await response.text();
  if (!text) {
    return {
      ok: response.ok,
      message: response.ok ? undefined : `Servidor respondeu HTTP ${response.status} sem detalhes.`,
    };
  }

  try {
    return JSON.parse(text) as ProcessResult;
  } catch {
    const compact = text.replace(/\s+/g, " ").trim().slice(0, 240);
    return {
      ok: false,
      message:
        response.status === 504
          ? "Tempo limite do servidor ao processar o PDF. Tente novamente; se persistir, reprocesse em partes ou verifique os logs da Vercel."
          : `Servidor respondeu HTTP ${response.status} sem JSON: ${compact}`,
    };
  }
}
