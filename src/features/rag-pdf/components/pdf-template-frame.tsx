import type { ReactNode } from "react";
import { PdfCover } from "./pdf-cover";
import { PdfDisclaimer } from "./pdf-disclaimer";
import { PdfMetadataBlock } from "./pdf-metadata-block";
import type { RagPdfPayload } from "../lib/types";

type PdfTemplateFrameProps = {
  payload: RagPdfPayload;
  children: ReactNode;
};

export function PdfTemplateFrame({ payload, children }: PdfTemplateFrameProps) {
  return (
    <article className="overflow-hidden rounded border border-[#d8dde6] bg-[#f6f7f9] shadow-sm">
      <PdfCover payload={payload} />
      <div className="space-y-6 p-6 md:p-8">
        <PdfMetadataBlock payload={payload} />
        {children}
        <PdfDisclaimer disclaimer={payload.disclaimer} />
      </div>
    </article>
  );
}
