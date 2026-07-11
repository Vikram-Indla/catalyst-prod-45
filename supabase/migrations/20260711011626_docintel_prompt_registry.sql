-- CAT-DOCINTEL-V2-20260709-001 Slice 4 — prompt registry made real + truthful provenance.
--
-- Before: ai_agent_prompts held 10 placeholder rows ("PLACEHOLDER — set in slice 10");
-- edge functions used hardcoded inline prompts; ai_agent_runs never linked to a prompt.
-- After: placeholders deactivated; a partial-unique index enforces one active prompt per
-- agent slug; ai_agent_runs stamps the prompt_id + version actually used. The real prompt
-- text is self-seeded byte-faithfully from each edge function's inline default on first run
-- (see supabase/functions/_shared/prompts.ts) — no prompt wording is retyped in SQL, so
-- runtime behaviour cannot drift. Prompts become tunable thereafter (UPDATE + version bump,
-- no redeploy) — the fine-tuning enabler.
--
-- Additive + reversible-by-value. No existing row content changed except is_active on the
-- placeholder rows. Staging cyij target.

-- 1) Link every agent run to the prompt it actually used.
ALTER TABLE public.ai_agent_runs
  ADD COLUMN IF NOT EXISTS prompt_id uuid REFERENCES public.ai_agent_prompts(id);
ALTER TABLE public.ai_agent_runs
  ADD COLUMN IF NOT EXISTS prompt_version integer;

COMMENT ON COLUMN public.ai_agent_runs.prompt_id IS
  'FK to ai_agent_prompts — the exact prompt row used for this run (truthful provenance). Null only when no LLM prompt was involved or the registry was unreachable.';

-- 2) Retire the never-filled placeholder rows so they cannot shadow real prompts.
UPDATE public.ai_agent_prompts
  SET is_active = false
  WHERE prompt LIKE 'PLACEHOLDER%';

-- 3) One active prompt per agent slug. This is the ON CONFLICT target the self-seed helper
--    (loadActivePrompt) relies on to stay race-safe across concurrent edge-function invocations.
CREATE UNIQUE INDEX IF NOT EXISTS ai_agent_prompts_active_agent_uidx
  ON public.ai_agent_prompts (agent)
  WHERE is_active;
