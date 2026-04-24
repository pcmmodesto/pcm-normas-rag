import { PdfChecklist } from "./pdf-checklist";
import { PdfCover } from "./pdf-cover";
import { PdfDisclaimer } from "./pdf-disclaimer";
import { PdfMetadataBlock } from "./pdf-metadata-block";
import { PdfSection } from "./pdf-section";
import { PdfSourceList } from "./pdf-source-list";
import type { RagPdfPayload } from "../lib/types";

type TechnicalPdfTemplateProps = {
  payload: RagPdfPayload;
};

export function TechnicalPdfTemplate({ payload }: TechnicalPdfTemplateProps) {
  const checklist = payload.sections.find((section) =>
    section.title.toLowerCase().includes("checklist"),
  );
  const regularSections = payload.sections.filter(
    (section) => section !== checklist,
  );

  return (
    <article className="overflow-hidden rounded border border-[#d8dde6] bg-[#f6f7f9] shadow-sm">
      <PdfCover payload={payload} />
      <div className="space-y-6 p-6 md:p-8">
        <PdfMetadataBlock payload={payload} />
        {regularSections.map((section) => (
          <PdfSection key={section.title} section={section} />
        ))}
        {checklist?.items ? (
          <PdfChecklist title={checklist.title} items={checklist.items} />
        ) : null}
        <PdfSourceList sources={payload.sources} />
        <PdfDisclaimer disclaimer={payload.disclaimer} />
      </div>
    </article>
  );
}

