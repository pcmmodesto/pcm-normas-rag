import type { RagPdfPayload } from "../lib/types";

type PdfCoverProps = {
  payload: RagPdfPayload;
};

export function PdfCover({ payload }: PdfCoverProps) {
  const generatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(payload.generatedAt));

  return (
    <section className="border-b border-[#d8dde6] bg-white p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b88405]">
            PCM Normas RAG
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[#172033]">
            {payload.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#5a667a]">
            Documento demonstrativo gerado a partir de uma resposta RAG e suas
            fontes associadas.
          </p>
        </div>
        <div className="rounded border border-[#d8dde6] bg-[#f8fafc] p-4 text-sm text-[#384457]">
          <p className="font-semibold text-[#172033]">Gerado em</p>
          <p className="mt-1">{generatedAt}</p>
          <p className="mt-3 font-semibold text-[#172033]">Tipo</p>
          <p className="mt-1">
            {payload.kind === "technical" ? "Tecnico" : "Cliente comum"}
          </p>
        </div>
      </div>
    </section>
  );
}

