export type SourceCitation = {
  documentTitle: string;
  concessionaire: string | null;
  stateCode: string | null;
  documentVersion: string | null;
  pageNumber: number;
  itemReference?: string;
  tableReference?: string;
  quotedText: string;
  relevanceScore?: number;
};

export function assertSourceCitation(source: SourceCitation) {
  if (!source.documentTitle || !source.pageNumber || !source.quotedText) {
    throw new Error("Fonte RAG incompleta: documento, pagina e trecho sao obrigatorios.");
  }

  return source;
}
