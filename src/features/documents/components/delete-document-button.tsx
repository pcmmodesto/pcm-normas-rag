"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  documentId: string;
  documentTitle: string;
};

export function DeleteDocumentButton({ documentId, documentTitle }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/documents/${documentId}/delete`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { ok: boolean; message?: string };

      if (!data.ok) {
        setError(data.message ?? "Erro ao excluir documento.");
        setConfirming(false);
      } else {
        router.refresh();
      }
    } catch {
      setError("Nao foi possivel conectar ao servidor.");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-xs text-red-700">
          Excluir &quot;{documentTitle.slice(0, 40)}&quot;?
        </p>
        <div className="flex gap-2">
          <button
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            disabled={loading}
            onClick={handleDelete}
            type="button"
          >
            {loading ? "Excluindo..." : "Confirmar"}
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50"
            disabled={loading}
            onClick={() => setConfirming(false)}
            type="button"
          >
            Cancelar
          </button>
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <button
      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
      onClick={() => setConfirming(true)}
      type="button"
    >
      Excluir
    </button>
  );
}
