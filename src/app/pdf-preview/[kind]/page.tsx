import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { RagPdfPreview } from "@/features/rag-pdf/components/rag-pdf-preview";
import { getDemoRagPdfPayload } from "@/features/rag-pdf/lib/demo-data";
import type { RagPdfKind } from "@/features/rag-pdf/lib/types";

type PdfPreviewPageProps = {
  params: Promise<{
    kind: string;
  }>;
};

export function generateStaticParams() {
  return [{ kind: "technical" }, { kind: "client" }];
}

export default async function PdfPreviewPage({ params }: PdfPreviewPageProps) {
  const { kind } = await params;

  if (kind !== "technical" && kind !== "client") {
    notFound();
  }

  const payload = getDemoRagPdfPayload(kind as RagPdfKind);

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-6 flex flex-col gap-4 rounded border border-[#d8dde6] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#b88405]">
              Previa demonstrativa
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[#172033]">
              {kind === "technical"
                ? "PDF tecnico"
                : "PDF explicativo para cliente"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5a667a]">
              Esta previa usa dados simulados enquanto o RAG real, as fontes do
              banco e a renderizacao final em PDF ainda nao estao conectados.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="rounded border border-[#c8d0dc] px-4 py-2 text-center text-sm font-semibold text-[#172033] transition hover:bg-[#f2f5f9]"
              href="/chat"
            >
              Voltar ao chat
            </Link>
            <button
              className="rounded bg-[#123c69] px-4 py-2 text-sm font-semibold text-white opacity-70"
              type="button"
            >
              Download futuro
            </button>
          </div>
        </div>

        <RagPdfPreview payload={payload} />
      </section>
    </AppShell>
  );
}

