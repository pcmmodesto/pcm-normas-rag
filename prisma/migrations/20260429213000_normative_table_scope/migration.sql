ALTER TABLE normative_tables
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'STATE_SPECIFIC',
  ADD COLUMN IF NOT EXISTS utility_group TEXT,
  ADD COLUMN IF NOT EXISTS applicable_ufs TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS service_type TEXT,
  ADD COLUMN IF NOT EXISTS revision_label TEXT,
  ADD COLUMN IF NOT EXISTS source_document_title TEXT;

CREATE INDEX IF NOT EXISTS normative_tables_scope_utility_group_idx
ON normative_tables(scope, utility_group);

UPDATE normative_tables nt
SET
  scope = 'CORPORATE_GROUP',
  utility_group = 'EQUATORIAL',
  applicable_ufs = ARRAY['PA', 'MA']::TEXT[],
  service_type = coalesce(service_type, applicable_supply_type, category),
  revision_label = coalesce(revision_label, dv.version_label),
  source_document_title = coalesce(source_document_title, td.title)
FROM document_versions dv
JOIN technical_documents td ON td.id = dv.document_id
WHERE nt.document_version_id = dv.id
  AND (
    nt.concessionaire ILIKE '%EQUATORIAL%'
    OR td.concessionaire ILIKE '%EQUATORIAL%'
    OR td.title ILIKE '%EQTL%'
  );
