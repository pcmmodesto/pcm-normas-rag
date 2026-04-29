import "server-only";

import { normalizeEmbeddingInput } from "./openai-embeddings";

export type ChunkEmbeddingContext = {
  documentTitle: string;
  concessionaire: string | null;
  stateCodes: string[] | null;
  versionLabel: string;
  pageNumber: number;
  chunkType: string | null;
  topic: string | null;
  sectionNumber: string | null;
  sectionTitle: string | null;
  technicalIntent: string | null;
  technicalTerms: string[] | null;
  text: string;
  searchText?: string | null;
};

export function buildChunkEmbeddingInput(ctx: ChunkEmbeddingContext) {
  const topic =
    ctx.topic ??
    ([ctx.sectionNumber, ctx.sectionTitle].filter(Boolean).join(" ").trim() || "");
  const parts = [
    `Documento: ${ctx.documentTitle}`,
    ctx.concessionaire ? `Concessionaria: ${ctx.concessionaire}` : null,
    ctx.stateCodes?.length ? `UF: ${ctx.stateCodes.join(", ")}` : null,
    `Versao: ${ctx.versionLabel}`,
    `Pagina: ${ctx.pageNumber}`,
    ctx.chunkType ? `Tipo: ${ctx.chunkType}` : null,
    topic ? `Topico: ${topic}` : null,
    ctx.technicalIntent ? `Intencao: ${ctx.technicalIntent}` : null,
    ctx.technicalTerms?.length ? `Termos tecnicos: ${ctx.technicalTerms.join(", ")}` : null,
    `Texto: ${ctx.searchText?.trim() || ctx.text}`,
  ];

  return normalizeEmbeddingInput(parts.filter(Boolean).join(". "));
}
