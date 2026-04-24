-- Enable pgvector before any table uses vector(1536).
-- In Supabase this is usually also available through Dashboard > Database > Extensions
-- or by running this SQL in the SQL Editor.
CREATE EXTENSION IF NOT EXISTS vector;

