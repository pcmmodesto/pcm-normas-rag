import type { RagPdfPayload, RagPdfSource } from "./types";

export type RagAnswerForPdfDto = {
  id: string;
  answer: string;
  question: string;
  companyName?: string;
  documentTitle?: string;
  sources: RagPdfSource[];
};

export async function getRagAnswerForPdf(answerId: string) {
  void answerId;
  throw new Error(
    "getRagAnswerForPdf will be connected to RagAnswer in a future database stage.",
  );
}

export function mapRagAnswerToPdfPayloadInput(
  answer: RagAnswerForPdfDto,
): Pick<
  RagPdfPayload,
  "answer" | "question" | "companyName" | "documentTitle" | "sources"
> {
  return {
    answer: answer.answer,
    question: answer.question,
    companyName: answer.companyName,
    documentTitle: answer.documentTitle,
    sources: answer.sources,
  };
}

export async function getRagSourcesForPdf(
  answerId: string,
): Promise<RagPdfSource[]> {
  void answerId;
  throw new Error(
    "getRagSourcesForPdf will be connected to RagAnswerSource and DocumentChunk in a future RAG stage.",
  );
}

export async function createPdfGenerationLog(payload: RagPdfPayload) {
  void payload;
  // Future: write an AuditLog entry with entityType "RagPdf".
  return { logged: false, reason: "database-not-connected" };
}

export async function incrementPdfUsage(payload: RagPdfPayload) {
  void payload;
  // Future: increment PlanUsage with a dedicated PDF metric or premium feature.
  return { incremented: false, reason: "billing-not-connected" };
}
