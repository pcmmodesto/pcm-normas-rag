"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProcessDocumentButtonProps = {
  versionId: string;
};

export function ProcessDocumentButton({ versionId }: ProcessDocumentButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);

    try {
      await fetch(`/api/admin/document-versions/${versionId}/process`, {
        method: "POST",
      });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      className="rounded-lg bg-[#123C7C] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0A1633] disabled:opacity-60"
      disabled={isSubmitting}
      onClick={handleClick}
      type="button"
    >
      {isSubmitting ? "Processando..." : "Processar documento"}
    </button>
  );
}
