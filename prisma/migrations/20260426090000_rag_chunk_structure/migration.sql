-- Idempotent compatibility layer for structured normative RAG chunks.
-- Safe to run after older deployments where document_chunks existed without
-- chunk_type/page_type/technical metadata columns.

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

DO $$
DECLARE
  enum_value text;
BEGIN
  FOREACH enum_value IN ARRAY ARRAY[
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
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'chunk_type'
        AND e.enumlabel = enum_value
    ) THEN
      EXECUTE format('ALTER TYPE "chunk_type" ADD VALUE %L', enum_value);
    END IF;
  END LOOP;
END
$$;

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

CREATE INDEX IF NOT EXISTS "document_chunks_is_low_value_is_searchable_idx"
  ON "document_chunks"("is_low_value", "is_searchable");

CREATE INDEX IF NOT EXISTS "document_chunks_chunk_type_idx"
  ON "document_chunks"("chunk_type");

CREATE INDEX IF NOT EXISTS "document_chunks_page_type_idx"
  ON "document_chunks"("page_type");

CREATE INDEX IF NOT EXISTS "document_chunks_technical_intent_idx"
  ON "document_chunks"("technical_intent");

CREATE INDEX IF NOT EXISTS "document_chunks_topic_idx"
  ON "document_chunks"("topic");
