-- ai_generated_artifacts.artifact_type CHECK was missing the S4 grounded types.
-- docintel-generate + the frontend registry now offer business_process,
-- acceptance_criteria, test_cases and release_notes; inserting one would have
-- hit a constraint violation. Keeps every existing value (incl. 'traceability').
ALTER TABLE public.ai_generated_artifacts
  DROP CONSTRAINT IF EXISTS ai_generated_artifacts_artifact_type_check;

ALTER TABLE public.ai_generated_artifacts
  ADD CONSTRAINT ai_generated_artifacts_artifact_type_check
  CHECK (artifact_type IN (
    'summary_ar',
    'summary_en',
    'epic',
    'story',
    'brd',
    'gap_analysis',
    'open_questions',
    'traceability',
    'business_process',
    'acceptance_criteria',
    'test_cases',
    'release_notes'
  ));
