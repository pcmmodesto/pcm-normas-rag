import { chunkDocument } from "./chunk-document";
import { createEmbeddings } from "./create-embeddings";
import { extractPdfText } from "./extract-pdf-text";

export async function indexDocumentVersion(documentVersionId: string) {
  void documentVersionId;
  const pages = await extractPdfText();
  const chunks = await chunkDocument(pages);
  await createEmbeddings(chunks);

  return {
    pages: pages.length,
    chunks: chunks.length,
  };
}
