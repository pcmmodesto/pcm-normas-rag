import type { DocumentChunkDraft } from "./chunk-document";
import { generateEmbedding } from "@/features/rag/embedding/openai-embeddings";

export type EmbeddingDraft = {
  chunk: DocumentChunkDraft;
  embedding: number[];
};

export async function createEmbeddings(
  chunks: DocumentChunkDraft[],
): Promise<EmbeddingDraft[]> {
  const results: EmbeddingDraft[] = [];
  for (const chunk of chunks) {
    results.push({
      chunk,
      embedding: await generateEmbedding(chunk.text),
    });
  }
  return results;
}
