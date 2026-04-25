import { PdfChecklist } from "./pdf-checklist";
import { PdfSection } from "./pdf-section";
import { PdfSourceList } from "./pdf-source-list";
import { PdfTemplateFrame } from "./pdf-template-frame";
import type { RagPdfPayload } from "../lib/types";

type ClientPdfTemplateProps = {
  payload: RagPdfPayload;
};

export function ClientPdfTemplate({ payload }: ClientPdfTemplateProps) {
  const checklist = payload.sections.find((section) =>
    section.title.toLowerCase().includes("checklist"),
  );
  const regularSections = payload.sections.filter(
    (section) => section !== checklist,
  );

  return (
    <PdfTemplateFrame payload={payload}>
      <section className="rounded border border-[#cfe3d5] bg-[#f0fbf3] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#28633a]">
          Leitura para atendimento
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#2f4d38]">
          Este template prioriza linguagem simples, proximos passos e cuidados
          para orientar o solicitante sem transformar a resposta em projeto.
        </p>
      </section>
      {regularSections.map((section) => (
        <PdfSection key={section.title} section={section} />
      ))}
      {checklist?.items ? (
        <PdfChecklist title={checklist.title} items={checklist.items} />
      ) : null}
      <PdfSourceList sources={payload.sources} />
    </PdfTemplateFrame>
  );
}
