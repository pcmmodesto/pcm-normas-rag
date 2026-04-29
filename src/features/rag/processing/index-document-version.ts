import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { smartChunkDocument } from "./smart-chunker";
import { extractPdfText } from "./extract-pdf-text";
import { classifyStructuredChunk } from "./classify-chunk";
import { saveGenericNormativeTables } from "./normative-generic-structure";
import { saveKnownNormativeFiguresAndNotes, saveKnownNormativeTables } from "./normative-table-2";
import { buildChunkEmbeddingInput } from "@/features/rag/embedding/chunk-embedding-input";
import { generateEmbedding, getEmbeddingModel } from "@/features/rag/embedding/openai-embeddings";
import { ensureVectorSearchSchema } from "@/features/rag/retrieval/vector-search";

type VersionRow = {
  id: string;
  storage_path: string | null;
  metadata: Record<string, unknown>;
  version_label: string;
  document_id: string;
  document_title: string;
  concessionaire: string | null;
  state_codes: string[] | null;
};

export async function indexDocumentVersion(documentVersionId: string) {
  const rows = await prisma.$queryRaw<VersionRow[]>`
    select
      dv.id,
      dv.storage_path,
      dv.metadata,
      dv.version_label,
      td.id as document_id,
      td.title as document_title,
      td.concessionaire,
      td.state_codes
    from document_versions dv
    join technical_documents td on td.id = dv.document_id
    where dv.id = ${documentVersionId}
    limit 1
  `;

  const version = rows[0];
  if (!version) throw new Error(`Versao ${documentVersionId} nao encontrada.`);
  if (!version.storage_path) throw new Error("Versao nao possui storage_path.");

  const bucket =
    (version.metadata?.storageBucket as string | undefined) ??
    process.env.SUPABASE_DOCUMENTS_BUCKET ??
    "technical-documents";

  const docContext = {
    documentTitle: version.document_title,
    concessionaria: version.concessionaire,
    stateCodes: version.state_codes,
    versionLabel: version.version_label,
  };

  // Run schema adjustments before the download to avoid concurrent DB work in the session pool.
  await ensureStructuredChunkSchema();
  const pdfBytes = await downloadFromStorage(bucket, version.storage_path);

  await prisma.$executeRaw`
    update document_versions
    set processing_status = ${"EXTRACTING"}::processing_status, updated_at = now()
    where id = ${documentVersionId}
  `;

  const pages = await extractPdfText(pdfBytes);

  await prisma.$executeRaw`
    update document_versions
    set processing_status = ${"CHUNKING"}::processing_status, updated_at = now()
    where id = ${documentVersionId}
  `;

  const chunks = await smartChunkDocument(pages, docContext);

  await savePages(documentVersionId, pages);
  await prisma.$executeRaw`
    update document_versions
    set processing_status = ${"EMBEDDING"}::processing_status, updated_at = now()
    where id = ${documentVersionId}
  `;
  await saveChunks(documentVersionId, chunks, docContext);

  const normCtx = {
    documentVersionId,
    documentId: version.document_id,
    concessionaire: version.concessionaire,
    stateCodes: version.state_codes,
  };

  // Sequential to avoid exhausting the Supabase session-mode connection pool
  await saveKnownNormativeTables(pages, normCtx);
  await saveGenericNormativeTables(pages, normCtx);
  await saveKnownNormativeFiguresAndNotes(pages, normCtx);

  await prisma.$executeRaw`
    update document_versions
    set
      status = ${"READY"}::version_status,
      processing_status = ${"READY"}::processing_status,
      page_count = ${pages.length},
      chunk_count = ${chunks.length},
      processing_error = null,
      processed_at = now(),
      updated_at = now()
    where id = ${documentVersionId}
  `;

  const embeddedRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    select count(*)::bigint as count
    from document_chunks
    where document_version_id = ${documentVersionId}
      and embedding is not null
  `;

  return { pages: pages.length, chunks: chunks.length, embeddings: Number(embeddedRows[0]?.count ?? 0) };
}

async function ensureStructuredChunkSchema() {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chunk_type') THEN
        CREATE TYPE "chunk_type" AS ENUM (
          'TEXT',
          'SECTION',
          'TABLE',
          'TABLE_ROW',
          'DEFINITION',
          'REQUIREMENT',
          'PROCEDURE',
          'FORMULA',
          'ANNEX',
          'HEADER_FOOTER',
          'SUMMARY',
          'ADMINISTRATIVE',
          'NORMATIVE_DRAWING',
          'NORMATIVE_TABLE',
          'NORMATIVE_NOTE',
          'PAGE_HEADER'
        );
      END IF;
    END
    $$;
  `);

  for (const value of [
    "TEXT",
    "SECTION",
    "TABLE",
    "TABLE_ROW",
    "DEFINITION",
    "REQUIREMENT",
    "PROCEDURE",
    "FORMULA",
    "ANNEX",
    "HEADER_FOOTER",
    "SUMMARY",
    "ADMINISTRATIVE",
    "NORMATIVE_DRAWING",
    "NORMATIVE_TABLE",
    "NORMATIVE_NOTE",
    "PAGE_HEADER",
  ]) {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'chunk_type'
            AND e.enumlabel = '${value}'
        ) THEN
          ALTER TYPE "chunk_type" ADD VALUE '${value}';
        END IF;
      END
      $$;
    `);
  }

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "document_chunks"
      ADD COLUMN IF NOT EXISTS "normalized_text" TEXT,
      ADD COLUMN IF NOT EXISTS "chunk_type" "chunk_type" NOT NULL DEFAULT 'TEXT',
      ADD COLUMN IF NOT EXISTS "page_type" TEXT,
      ADD COLUMN IF NOT EXISTS "section_number" TEXT,
      ADD COLUMN IF NOT EXISTS "section_title" TEXT,
      ADD COLUMN IF NOT EXISTS "parent_section_number" TEXT,
      ADD COLUMN IF NOT EXISTS "table_number" TEXT,
      ADD COLUMN IF NOT EXISTS "table_title" TEXT,
      ADD COLUMN IF NOT EXISTS "technical_intent" TEXT,
      ADD COLUMN IF NOT EXISTS "technical_terms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      ADD COLUMN IF NOT EXISTS "voltage_level" TEXT,
      ADD COLUMN IF NOT EXISTS "topic" TEXT,
      ADD COLUMN IF NOT EXISTS "is_table" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "is_figure" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "is_summary" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "is_cover" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "is_definition" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "is_requirement" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "is_procedure" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "is_sizing_criteria" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "source_quality" TEXT,
      ADD COLUMN IF NOT EXISTS "is_searchable" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "is_low_value" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "search_text" TEXT,
      ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  `);

  for (const statement of [
    `CREATE INDEX IF NOT EXISTS "document_chunks_is_low_value_is_searchable_idx" ON "document_chunks"("is_low_value", "is_searchable")`,
    `CREATE INDEX IF NOT EXISTS "document_chunks_chunk_type_idx" ON "document_chunks"("chunk_type")`,
    `CREATE INDEX IF NOT EXISTS "document_chunks_page_type_idx" ON "document_chunks"("page_type")`,
    `CREATE INDEX IF NOT EXISTS "document_chunks_technical_intent_idx" ON "document_chunks"("technical_intent")`,
    `CREATE INDEX IF NOT EXISTS "document_chunks_topic_idx" ON "document_chunks"("topic")`,
  ]) {
    await prisma.$executeRawUnsafe(statement);
  }
}

async function downloadFromStorage(
  bucket: string,
  storagePath: string,
): Promise<Uint8Array> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variaveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias.");
  }

  const url = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${storagePath}`;
  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Nao foi possivel baixar o PDF do Storage (HTTP ${response.status}). Bucket: ${bucket}, path: ${storagePath}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

type PageId = { pageNumber: number; id: string };

async function savePages(
  documentVersionId: string,
  pages: Awaited<ReturnType<typeof extractPdfText>>,
): Promise<PageId[]> {
  if (pages.length === 0) return [];

  const pageIds: PageId[] = pages.map((p) => ({ pageNumber: p.pageNumber, id: randomUUID() }));
  const emptyMeta = JSON.stringify({});

  const values = pageIds.map((pid, i) =>
    Prisma.sql`(${pid.id}, ${documentVersionId}, ${pid.pageNumber}, ${pages[i].text}, ${emptyMeta}::jsonb, now(), now())`,
  );

  await prisma.$executeRaw`
    insert into document_pages (id, document_version_id, page_number, text, metadata, created_at, updated_at)
    values ${Prisma.join(values)}
    on conflict (document_version_id, page_number) do update
      set text = excluded.text, updated_at = now()
  `;

  return pageIds;
}

async function saveChunks(
  documentVersionId: string,
  chunks: Awaited<ReturnType<typeof smartChunkDocument>>,
  docContext: {
    documentTitle: string;
    concessionaria: string | null;
    stateCodes: string[] | null;
    versionLabel: string;
  },
): Promise<void> {
  if (chunks.length === 0) return;

  await ensureVectorSearchSchema();

  const pageRows = await prisma.$queryRaw<Array<{ page_number: number; id: string }>>`
    select page_number, id from document_pages
    where document_version_id = ${documentVersionId}
  `;

  const pageIdMap = new Map(pageRows.map((r) => [r.page_number, r.id]));

  type ChunkInsertRow = {
    id: ReturnType<typeof randomUUID>;
    chunk: (typeof chunks)[number];
    structured: ReturnType<typeof classifyStructuredChunk>;
    metadata: Record<string, unknown>;
    sql: Prisma.Sql;
  };

  const rows = chunks
    .map((chunk) => {
      const pageId = pageIdMap.get(chunk.pageNumber);
      if (!pageId) return null;

      const metadata: Record<string, unknown> = {};
      if (chunk.sectionTitle) metadata.sectionTitle = chunk.sectionTitle;
      if (chunk.sectionNumber) metadata.sectionNumber = chunk.sectionNumber;
      if (chunk.tableNumber) metadata.tableNumber = chunk.tableNumber;
      if (chunk.tableTitle) metadata.tableTitle = chunk.tableTitle;
      Object.assign(metadata, chunk.metadata ?? {});
      const s = classifyStructuredChunk(chunk);
      const id = randomUUID();

      const sql = Prisma.sql`(
        ${id},
        ${documentVersionId},
        ${pageId},
        ${chunk.pageNumber},
        ${chunk.chunkIndex},
        ${chunk.text},
        ${s.normalizedText},
        ${JSON.stringify(metadata)}::jsonb,
        ${chunk.chunkType}::"chunk_type",
        ${chunk.sectionNumber},
        ${chunk.sectionTitle},
        ${chunk.parentSectionNumber},
        ${chunk.tableNumber},
        ${chunk.tableTitle},
        ${s.pageType},
        ${s.technicalIntent},
        ${s.technicalTerms},
        ${s.voltageLevel},
        ${s.topic},
        ${s.isTable},
        ${s.isFigure},
        ${s.isSummary},
        ${s.isCover},
        ${s.isDefinition},
        ${s.isRequirement},
        ${s.isProcedure},
        ${s.isSizingCriteria},
        ${s.sourceQuality},
        ${chunk.isSearchable},
        ${chunk.isLowValue},
        ${chunk.searchText},
        now(),
        now()
      )`;
      return { id, chunk, structured: s, metadata, sql };
    })
    .filter((r): r is ChunkInsertRow => r !== null);

  if (rows.length === 0) return;

  // Vercel limits payload size; insert in batches of 200 chunks
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await prisma.$executeRaw`
      insert into document_chunks (
        id, document_version_id, document_page_id, page_number,
        chunk_index, text, normalized_text, metadata,
        chunk_type, section_number, section_title, parent_section_number,
        table_number, table_title, page_type, technical_intent, technical_terms,
        voltage_level, topic, is_table, is_figure, is_summary, is_cover,
        is_definition, is_requirement, is_procedure, is_sizing_criteria,
        source_quality, is_searchable, is_low_value, search_text,
        created_at, updated_at
      )
      values ${Prisma.join(batch.map((row) => row.sql))}
      on conflict (document_version_id, chunk_index) do update
        set
          text = excluded.text,
          normalized_text = excluded.normalized_text,
          metadata = excluded.metadata,
          chunk_type = excluded.chunk_type,
          section_number = excluded.section_number,
          section_title = excluded.section_title,
          parent_section_number = excluded.parent_section_number,
          table_number = excluded.table_number,
          table_title = excluded.table_title,
          page_type = excluded.page_type,
          technical_intent = excluded.technical_intent,
          technical_terms = excluded.technical_terms,
          voltage_level = excluded.voltage_level,
          topic = excluded.topic,
          is_table = excluded.is_table,
          is_figure = excluded.is_figure,
          is_summary = excluded.is_summary,
          is_cover = excluded.is_cover,
          is_definition = excluded.is_definition,
          is_requirement = excluded.is_requirement,
          is_procedure = excluded.is_procedure,
          is_sizing_criteria = excluded.is_sizing_criteria,
          source_quality = excluded.source_quality,
          is_searchable = excluded.is_searchable,
          is_low_value = excluded.is_low_value,
          search_text = excluded.search_text,
          embedding = null,
          embedding_model = null,
          embedded_at = null,
          updated_at = now()
    `;
  }

  const savedRows = await prisma.$queryRaw<Array<{
    id: string;
    chunk_index: number;
  }>>`
    select id, chunk_index
    from document_chunks
    where document_version_id = ${documentVersionId}
  `;
  const idByChunkIndex = new Map(savedRows.map((row) => [row.chunk_index, row.id]));
  const embeddingModel = getEmbeddingModel();

  for (const row of rows) {
    const chunkId = idByChunkIndex.get(row.chunk.chunkIndex);
    if (!chunkId || row.chunk.isLowValue || !row.chunk.isSearchable) continue;

    try {
      const embeddingInput = buildChunkEmbeddingInput({
        documentTitle: docContext.documentTitle,
        concessionaire: docContext.concessionaria,
        stateCodes: docContext.stateCodes,
        versionLabel: docContext.versionLabel,
        pageNumber: row.chunk.pageNumber,
        chunkType: row.chunk.chunkType,
        topic: row.structured.topic,
        sectionNumber: row.chunk.sectionNumber,
        sectionTitle: row.chunk.sectionTitle,
        technicalIntent: row.structured.technicalIntent,
        technicalTerms: row.structured.technicalTerms,
        text: row.chunk.text,
        searchText: row.chunk.searchText,
      });
      const embedding = await generateEmbedding(embeddingInput);
      const vectorLiteral = toPgVectorLiteral(embedding);

      await prisma.$executeRaw`
        update document_chunks
        set
          embedding = ${vectorLiteral}::vector,
          embedding_model = ${embeddingModel},
          embedded_at = now(),
          metadata = metadata - 'embeddingError'
        where id = ${chunkId}
      `;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida ao gerar embedding.";
      console.warn("[rag] embedding skipped", {
        documentVersionId,
        chunkIndex: row.chunk.chunkIndex,
        message,
      });
      await prisma.$executeRaw`
        update document_chunks
        set
          embedding = null,
          embedding_model = null,
          embedded_at = null,
          metadata = jsonb_set(metadata, '{embeddingError}', to_jsonb(${message}::text), true)
        where id = ${chunkId}
      `.catch(() => undefined);
    }
  }
}

function toPgVectorLiteral(values: number[]) {
  return `[${values.map((value) => formatVectorNumber(value)).join(",")}]`;
}

function formatVectorNumber(value: number) {
  if (!Number.isFinite(value)) throw new Error("Valor invalido no vetor.");
  return Number(value.toFixed(8)).toString();
}
