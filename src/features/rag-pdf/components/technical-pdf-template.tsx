import { PdfChecklist } from "./pdf-checklist";
import { PdfSection } from "./pdf-section";
import { PdfSourceList } from "./pdf-source-list";
import { PdfTemplateFrame } from "./pdf-template-frame";
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
    <PdfTemplateFrame payload={payload}>
      <section className="rounded border border-[#bfd0e6] bg-[#eef5ff] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#123c69]">
          Leitura tecnica
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#28384f]">
          Este template prioriza rastreabilidade normativa, criterios de
          verificacao e decisao tecnica documentavel.
        </p>
      </section>
      {regularSections.map((section) => (
        <PdfSection key={section.title} section={section} />
      ))}
      <PdfSourceList sources={payload.sources} />
      {checklist?.items ? (
        <PdfChecklist title={checklist.title} items={checklist.items} />
      ) : null}
    </PdfTemplateFrame>
  );
}
