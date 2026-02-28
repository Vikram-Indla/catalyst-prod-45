
-- Temporarily increase maintenance_work_mem for index creation
SET maintenance_work_mem = '128MB';

-- Index on kb_training_questions using ivfflat with cosine distance
CREATE INDEX IF NOT EXISTS idx_kb_training_embedding
  ON public.kb_training_questions
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- Index on kb_embeddings using ivfflat (hnsw requires too much memory)
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_vector
  ON public.kb_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 30);

-- Reset
RESET maintenance_work_mem;
