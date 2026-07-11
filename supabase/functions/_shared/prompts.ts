/**
 * _shared/prompts.ts — runtime prompt registry loader for the docintel-* agents.
 *
 * CAT-DOCINTEL-V2-20260709-001 Slice 4. Makes ai_agent_prompts the runtime source of
 * truth for agent system prompts AND makes ai_agent_runs.prompt_id truthful.
 *
 * Design — self-seeding, byte-faithful, resilient:
 *  - Each call site keeps its inline prompt string as `inlineDefault` (the canonical text).
 *  - On first call for a slug, that inline text is written into ai_agent_prompts verbatim
 *    (version 1, is_active) — so the registry is seeded FROM the shipped code, guaranteeing
 *    zero behaviour drift. No prompt wording is retyped in SQL.
 *  - Thereafter the active registry row is returned, so an operator can tune a prompt with a
 *    plain UPDATE (+ version bump) — no edge-function redeploy. This is the fine-tuning enabler.
 *  - If the registry is unreachable for any reason, the inline default is returned with a null
 *    id — ingestion / Q&A / generation NEVER break because the registry is down.
 *
 * Race-safety: the seed INSERT targets the partial unique index
 * `ai_agent_prompts_active_agent_uidx (agent) WHERE is_active`; a concurrent seed loses the
 * insert and we re-read the winner. Requires migration 20260709120000_docintel_prompt_registry.
 */
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export type ActivePrompt = {
  /** ai_agent_prompts.id, or null when the registry was unreachable (inline fallback). */
  id: string | null;
  /** ai_agent_prompts.version, or null on inline fallback. */
  version: number | null;
  /** The prompt text to actually use (registry text, or inlineDefault on miss/fallback). */
  prompt: string;
};

async function readActive(
  admin: SupabaseClient,
  slug: string,
): Promise<ActivePrompt | null> {
  const { data, error } = await admin
    .from("ai_agent_prompts")
    .select("id, version, prompt")
    .eq("agent", slug)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, version: data.version, prompt: data.prompt };
}

/**
 * Return the active prompt for `slug`, seeding it from `inlineDefault` on first use.
 * Never throws — falls back to `{ id: null, version: null, prompt: inlineDefault }`.
 */
export async function loadActivePrompt(
  admin: SupabaseClient,
  slug: string,
  inlineDefault: string,
): Promise<ActivePrompt> {
  try {
    const existing = await readActive(admin, slug);
    if (existing) return existing;

    // Not seeded yet — write the shipped inline text as version 1 (byte-faithful).
    const { data: inserted } = await admin
      .from("ai_agent_prompts")
      .insert({ agent: slug, version: 1, prompt: inlineDefault, is_active: true })
      .select("id, version, prompt")
      .maybeSingle();
    if (inserted) {
      return { id: inserted.id, version: inserted.version, prompt: inserted.prompt };
    }

    // Lost a concurrent seed race (unique-index conflict) — re-read the winner.
    const reread = await readActive(admin, slug);
    if (reread) return reread;
  } catch {
    // fall through to inline fallback
  }
  return { id: null, version: null, prompt: inlineDefault };
}
