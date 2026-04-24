import type { RagPdfSource } from "../lib/types";

type PdfSourceListProps = {
  sources: RagPdfSource[];
};

export function PdfSourceList({ sources }: PdfSourceListProps) {
  return (
    <section className="rounded border border-[#d8dde6] bg-white p-6">
      <h2 className="text-xl font-semibold text-[#172033]">
        Fontes consultadas
      </h2>
      <div className="mt-5 space-y-4">
        {sources.map((source, index) => (
          <article
            className="rounded border border-[#e5e9f0] bg-[#f8fafc] p-4"
            key={source.id ?? `${source.documentTitle}-${source.pageNumber}`}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h3 className="font-semibold text-[#172033]">
                {index + 1}. {source.documentTitle}
              </h3>
              <span className="rounded bg-white px-3 py-1 text-xs font-semibold text-[#384457]">
                Pagina {source.pageNumber}
              </span>
            </div>
            {source.normativeItem ? (
              <p className="mt-2 text-sm font-medium text-[#123c69]">
                Item: {source.normativeItem}
              </p>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-[#5a667a]">
              {source.excerpt}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

