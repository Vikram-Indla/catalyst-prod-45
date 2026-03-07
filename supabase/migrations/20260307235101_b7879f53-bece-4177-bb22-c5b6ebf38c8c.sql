SET maintenance_work_mem = '128MB';
ALTER TABLE kb_embeddings ADD COLUMN IF NOT EXISTS fts_ar tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED;
COMMENT ON COLUMN kb_embeddings.fts_ar IS 'Simple-stemmer FTS for Arabic and multilingual BRD content. Uses simple (not english) to avoid Arabic token stripping.';
RESET maintenance_work_mem;