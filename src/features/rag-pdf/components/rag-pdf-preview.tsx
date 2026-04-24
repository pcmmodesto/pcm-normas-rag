import { ClientPdfTemplate } from "./client-pdf-template";
import { TechnicalPdfTemplate } from "./technical-pdf-template";
import type { RagPdfPayload } from "../lib/types";

type RagPdfPreviewProps = {
  payload: RagPdfPayload;
};

export function RagPdfPreview({ payload }: RagPdfPreviewProps) {
  return payload.kind === "technical" ? (
    <TechnicalPdfTemplate payload={payload} />
  ) : (
    <ClientPdfTemplate payload={payload} />
  );
}

