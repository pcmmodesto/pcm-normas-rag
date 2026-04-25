import type { DocumentChunkDraft } from "./chunk-document";

export type EmbeddingDraft = {
  chunk: DocumentChunkDraft;
  embedding: number[];
};

export async function createEmbeddings(
  chunks: DocumentChunkDraft[],
): Promise<EmbeddingDraft[]> {
  void chunks;
  throw new Error("Embeddings reais ainda nao conectados.");
}
