SET maintenance_work_mem = '128MB';
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_fts_ar ON kb_embeddings USING gin (fts_ar);
RESET maintenance_work_mem;