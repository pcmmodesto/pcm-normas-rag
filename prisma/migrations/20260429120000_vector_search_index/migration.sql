CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
  BEGIN
    CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
    ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    CREATE INDEX IF NOT EXISTS document_chunks_embedding_ivfflat_idx
    ON document_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
    WHERE embedding IS NOT NULL;
  END;
END
$$;
