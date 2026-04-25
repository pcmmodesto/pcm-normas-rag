import type { ExtractedPdfPage } from "./extract-pdf-text";

export type DocumentChunkDraft = {
  pageNumber: number;
  chunkIndex: number;
  text: string;
  sectionTitle?: string;
  itemReference?: string;
  tableReference?: string;
};

export async function chunkDocument(
  pages: ExtractedPdfPage[],
): Promise<DocumentChunkDraft[]> {
  void pages;
  throw new Error("Chunking real ainda nao conectado.");
}
