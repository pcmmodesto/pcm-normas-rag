import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  generateEmbedding,
  getEmbeddingModel,
  normalizeEmbeddingInput,
} from "@/features/rag/embedding/openai-embeddings";

export type VectorSearchFilters = {
  uf?: string | null;
  concessionaria?: string | null;
  documentId?: string | null;
  technicalIntent?: string | null;
};

export type VectorSearchResult = {
  chunk_id: string;
  chunk_text: string;
  page_number: number;
  chunk_index: number;
  chunk_type: string;
  section_number: string | null;
  section_title: string | null;
  table_number: string | null;
  table_title: string | null;
  page_type: string | null;
  technical_intent: string | null;
  topic: string | null;
  source_quality: string | null;
  is_table: boolean;
  is_figure: boolean;
  is_summary: boolean;
  is_cover: boolean;
  is_definition: boolean;
  is_requirement: boolean;
  is_procedure: boolean;
  is_sizing_criteria: boolean;
  document_title: string;
  version_label: string;
  concessionaire: string | null;
  state_codes: string[] | null;
  document_type: string;
  metadata: Prisma.JsonValue;
  embedding_model: string | null;
  vector_distance: number;
  vector_score: number;
};

export type VectorSearchDebug = {
  used: boolean;
  fallbackTextual: boolean;
  embeddingModel: string;
  embeddedChunkCount: number;
  error?: string;
};

export async function countEmbeddedChunks() {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    select count(*)::bigint as count
    from document_chunks
    where embedding is not null
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function ensureVectorSearchSchema() {
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
    ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL
  `).catch(async () => {
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS document_chunks_embedding_ivfflat_idx
      ON document_chunks
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
      WHERE embedding IS NOT NULL
    `).catch(() => undefined);
  });
}

export async function searchChunksByVector(params: {
  question: string;
  filters?: VectorSearchFilters;
  limit?: number;
}): Promise<{ results: VectorSearchResult[]; debug: VectorSearchDebug }> {
  const embeddingModel = getEmbeddingModel();
  const embeddedChunkCount = await countEmbeddedChunks().catch(() => 0);

  try {
    await ensureVectorSearchSchema();
    const embedding = await generateEmbedding(normalizeEmbeddingInput(params.question));
    const vectorLiteral = toPgVectorLiteral(embedding);
    const filters = buildFilters(params.filters);
    const limit = Math.max(1, Math.min(params.limit ?? 40, 80));

    const results = await prisma.$queryRaw<VectorSearchResult[]>(Prisma.sql`
      select
        dc.id            as chunk_id,
        dc.text          as chunk_text,
        dc.page_number,
        dc.chunk_index,
        dc.chunk_type,
        dc.section_number,
        dc.section_title,
        dc.table_number,
        dc.table_title,
        dc.page_type,
        dc.technical_intent,
        dc.topic,
        dc.metadata,
        dc.source_quality,
        dc.is_table,
        dc.is_figure,
        dc.is_summary,
        dc.is_cover,
        dc.is_definition,
        dc.is_requirement,
        dc.is_procedure,
        dc.is_sizing_criteria,
        td.title         as document_title,
        dv.version_label,
        td.concessionaire,
        td.state_codes,
        td.document_type,
        dc.embedding_model,
        (dc.embedding <=> ${vectorLiteral}::vector) as vector_distance,
        (1 - (dc.embedding <=> ${vectorLiteral}::vector)) as vector_score
      from document_chunks dc
      join document_versions dv on dv.id = dc.document_version_id
      join technical_documents td on td.id = dv.document_id
      where dv.processing_status = 'READY'
        and dv.status <> 'ARCHIVED'::version_status
        and dc.is_low_value = FALSE
        and dc.is_searchable = TRUE
        and dc.embedding is not null
        ${filters}
      order by dc.embedding <=> ${vectorLiteral}::vector
      limit ${limit}
    `);

    return {
      results,
      debug: {
        used: results.length > 0,
        fallbackTextual: results.length === 0,
        embeddingModel,
        embeddedChunkCount,
      },
    };
  } catch (error) {
    return {
      results: [],
      debug: {
        used: false,
        fallbackTextual: true,
        embeddingModel,
        embeddedChunkCount,
        error: error instanceof Error ? error.message : "Falha desconhecida na busca vetorial.",
      },
    };
  }
}

function buildFilters(filters: VectorSearchFilters | undefined) {
  const conditions: Prisma.Sql[] = [];
  if (filters?.uf) {
    conditions.push(Prisma.sql`${filters.uf} = any(td.state_codes)`);
  }
  if (filters?.concessionaria) {
    conditions.push(Prisma.sql`td.concessionaire ilike ${`%${filters.concessionaria}%`}`);
  }
  if (filters?.documentId) {
    conditions.push(Prisma.sql`td.id = ${filters.documentId}`);
  }
  if (filters?.technicalIntent) {
    conditions.push(Prisma.sql`dc.technical_intent = ${filters.technicalIntent}`);
  }

  if (conditions.length === 0) return Prisma.empty;
  return Prisma.sql`and ${Prisma.join(conditions, " and ")}`;
}

function toPgVectorLiteral(values: number[]) {
  return `[${values.map((value) => formatVectorNumber(value)).join(",")}]`;
}

function formatVectorNumber(value: number) {
  if (!Number.isFinite(value)) throw new Error("Valor invalido no vetor.");
  return Number(value.toFixed(8)).toString();
}
