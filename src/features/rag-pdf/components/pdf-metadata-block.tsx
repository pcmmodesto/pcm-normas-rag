import type { RagPdfPayload } from "../lib/types";

type PdfMetadataBlockProps = {
  payload: RagPdfPayload;
};

export function PdfMetadataBlock({ payload }: PdfMetadataBlockProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded border border-[#d8dde6] bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#657187]">
          Pergunta original
        </h2>
        <p className="mt-3 text-base leading-7 text-[#172033]">
          {payload.question}
        </p>
      </div>
      <div className="rounded border border-[#d8dde6] bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#657187]">
          Contexto
        </h2>
        <dl className="mt-3 space-y-2 text-sm text-[#384457]">
          <div>
            <dt className="font-semibold">Empresa</dt>
            <dd>{payload.companyName ?? "Nao informada"}</dd>
          </div>
          <div>
            <dt className="font-semibold">Documento principal</dt>
            <dd>{payload.documentTitle ?? "Aguardando fonte real do RAG"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

