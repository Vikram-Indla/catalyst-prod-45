-- Drop kb_match_training to allow return type change (handle vector type gracefully)
DO $outer$ BEGIN
  EXECUTE 'DROP FUNCTION IF EXISTS public.kb_match_training(extensions.vector, double precision, integer)';
EXCEPTION WHEN OTHERS THEN NULL; END $outer$;

-- Recreate kb_match_training (skip if vector extension not available)
DO $outer$ BEGIN
  EXECUTE $func$
    CREATE OR REPLACE FUNCTION public.kb_match_training(
      query_embedding extensions.vector(1536),
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
    AS $body$
    BEGIN
      RETURN QUERY
      SELECT
        t.id,
        t.question_number,
        t.question,
        t.category,
        t.expected_answer,
        (1 - (t.embedding <=> query_embedding))::double precision AS similarity
      FROM public.kb_training_questions t
      WHERE t.embedding IS NOT NULL
        AND (1 - (t.embedding <=> query_embedding)) > match_threshold
      ORDER BY t.embedding <=> query_embedding
      LIMIT match_count;
    END;
    $body$
  $func$;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping kb_match_training: %', SQLERRM;
END $outer$;
