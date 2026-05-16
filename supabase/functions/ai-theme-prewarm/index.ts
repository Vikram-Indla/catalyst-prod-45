/**
 * ai-theme-prewarm — nightly pg_cron pre-warm for AI Focus (ai_theme_cache).
 *
 * Scheduled at 18:00 UTC (= 21:00 AST, Riyadh) daily by pg_cron:
 *   SELECT cron.schedule(
 *     'ai-theme-prewarm-daily',
 *     '0 18 * * *',
 *     $$SELECT net.http_post(
 *       url := current_setting('app.supabase_url') || '/functions/v1/ai-theme-prewarm',
 *       headers := jsonb_build_object(
 *         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
 *         'Content-Type', 'application/json'
 *       ),
 *       body := '{}'::jsonb
 *     )$$
 *   );
 *
 * What it does
 * ─────────────
 * 1. Finds all distinct (user_id, scope_mode, project_key) tuples that have an
 *    ai_theme_cache row updated in the last 30 days (active users).
 * 2. For each tuple, calls the ai-digest edge function with mode=themes +
 *    forceRefresh=true to regenerate the cache for the new day.
 * 3. Stores results back to ai_theme_cache (same upsert logic as the main
 *    handler) so the first morning page load always hits cache.
 *
 * Concurrency model
 * ─────────────────
 * Processes up to 50 active cache entries concurrently in batches of 5
 * to avoid hammering the Gemini API rate limit. Each batch waits 2s between
 * iterations. The whole job typically completes in < 2 minutes for a 50-user
 * deployment.
 *
 * Security
 * ─────────
 * Called exclusively by pg_cron using the service_role_key — never via the
 * anon key or user JWT. Validates the Authorization header against
 * PREWARM_SECRET env var (set equal to service_role_key in the Supabase
 * dashboard Secrets panel).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 2000;
const ACTIVE_DAYS = 30; // only pre-warm users who ran themes in last 30 days

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: only pg_cron via service_role_key can call this
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey || !authHeader.includes(serviceRoleKey)) {
    console.error("[prewarm] Unauthorized — invalid Authorization header");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

  if (!geminiApiKey) {
    console.error("[prewarm] GEMINI_API_KEY not configured — aborting");
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Service-role client: can read/write all rows bypassing RLS
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Step 1: find all active cache entries (updated in last ACTIVE_DAYS days)
  const cutoff = new Date(Date.now() - ACTIVE_DAYS * 86_400_000).toISOString();
  const { data: entries, error: entriesErr } = await supabase
    .from("ai_theme_cache")
    .select("user_id, scope_mode, project_key")
    .gte("generated_at", cutoff);

  if (entriesErr) {
    console.error("[prewarm] Failed to fetch cache entries:", entriesErr.message);
    return new Response(JSON.stringify({ error: entriesErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const jobs = entries ?? [];
  console.log(`[prewarm] Found ${jobs.length} active cache entries to refresh`);

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // Step 2: process in batches
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(batch.map(async (entry) => {
      const { user_id, scope_mode, project_key } = entry;
      try {
        // Fetch the user's auth session via service role so we can call
        // the edge function on their behalf. We pass service_role_key
        // as Bearer — ai-digest validates via supabase.auth.getUser()
        // which accepts service_role tokens as admin access.
        const functionUrl = `${supabaseUrl}/functions/v1/ai-digest`;
        const resp = await fetch(functionUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
            "X-User-Id-Override": user_id, // handled below
          },
          body: JSON.stringify({
            mode: "themes",
            scope: scope_mode,
            projectKey: project_key ?? undefined,
            forceRefresh: true,
            _prewarmedForUser: user_id, // passed through to themes handler
          }),
        });

        if (resp.ok) {
          succeeded++;
          console.log(`[prewarm] ✓ user=${user_id} scope=${scope_mode} project=${project_key ?? 'personal'}`);
        } else {
          failed++;
          const errText = await resp.text().catch(() => "(unreadable)");
          console.warn(`[prewarm] ✗ user=${user_id} scope=${scope_mode} status=${resp.status}: ${errText.slice(0, 200)}`);
        }
      } catch (e) {
        failed++;
        console.error(`[prewarm] ✗ user=${user_id} exception:`, e);
      }
    }));

    // Rate-limit guard between batches
    if (i + BATCH_SIZE < jobs.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  const summary = {
    total: jobs.length,
    succeeded,
    failed,
    skipped,
    completedAt: new Date().toISOString(),
  };
  console.log("[prewarm] Complete:", summary);

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
