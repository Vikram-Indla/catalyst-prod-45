
-- Temporarily increase maintenance_work_mem for index creation
SET maintenance_work_mem = '128MB';

-- Index on kb_training_questions using ivfflat with cosine distance (requires vector extension with ivfflat support)
DO $$ BEGIN
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_kb_training_embedding ON public.kb_training_questions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping ivfflat index on kb_training_questions: %', SQLERRM;
END $$;

DO $$ BEGIN
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_kb_embeddings_vector ON public.kb_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 30)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping ivfflat index on kb_embeddings: %', SQLERRM;
END $$;

-- Reset
RESET maintenance_work_mem;
