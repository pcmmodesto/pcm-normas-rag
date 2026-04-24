import type { RagPdfGenerationResult, RagPdfPayload } from "./types";

export async function generateRagPdf(
  payload: RagPdfPayload,
): Promise<RagPdfGenerationResult> {
  return {
    ok: true,
    status: "preview-only",
    payload,
    fileName: buildPdfFileName(payload),
    message:
      "Renderizacao real de PDF sera conectada em etapa futura com Playwright ou Puppeteer no ambiente server-side.",
  };
}

function buildPdfFileName(payload: RagPdfPayload) {
  const suffix = payload.kind === "technical" ? "tecnico" : "cliente";
  const date = payload.generatedAt.slice(0, 10);
  return `pcm-normas-rag-${suffix}-${date}.pdf`;
}

