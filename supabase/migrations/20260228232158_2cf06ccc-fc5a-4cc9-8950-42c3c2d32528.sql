-- Drop kb_match_training to allow return type change
DROP FUNCTION IF EXISTS public.kb_match_training(vector, double precision, integer);

-- Recreate kb_match_training with explicit ::vector casts (matching original return type)
CREATE OR REPLACE FUNCTION public.kb_match_training(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.85,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  question_number integer,
  question text,
  category text,
  expected_answer text,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.question_number,
    t.question,
    t.category,
    t.expected_answer,
    (1 - (t.embedding::vector(1536) <=> query_embedding::vector(1536)))::double precision AS similarity
  FROM public.kb_training_questions t
  WHERE t.embedding IS NOT NULL
    AND (1 - (t.embedding::vector(1536) <=> query_embedding::vector(1536))) > match_threshold
  ORDER BY t.embedding::vector(1536) <=> query_embedding::vector(1536)
  LIMIT match_count;
END;
$$;