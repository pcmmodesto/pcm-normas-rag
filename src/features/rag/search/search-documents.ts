import type { SourceCitation } from "./source-citation";

export type SearchDocumentsParams = {
  question: string;
  concessionaire?: string;
  stateCode?: string;
};

export async function searchDocuments(
  params: SearchDocumentsParams,
): Promise<SourceCitation[]> {
  void params;
  throw new Error("Busca RAG real ainda nao conectada.");
}
