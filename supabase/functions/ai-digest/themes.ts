/**
 * AI Theme Analyzer — `ai-digest` `mode: 'themes'` handler
 * ─────────────────────────────────────────────────────────
 * Separate concern from the existing daily-digest. The digest answers
 * "what should I act on today?" by reasoning over notifications / releases /
 * incidents / test fails. Themes answers "what is my backlog actually
 * about?" by clustering raw ph_issues rows into root-cause groupings.
 *
 * Shared with digest: auth, Supabase client, Lovable AI Gateway (Gemini 3
 * Flash), JSON-from-chat-completions parsing pattern, CORS headers.
 *
 * Unique to themes:
 *   - Source is ph_issues (not notifications).
 *   - Input is user-chosen: {scope: 'project', projectKey} OR {scope: 'personal'}.
 *   - Cache table is ai_theme_cache (10-min TTL, signature-invalidated).
 *   - Response is clustered themes, not action items.
 *
 * See /supabase/migrations/20260425090000_ai_theme_cache.sql for the cache
 * schema and /src/hooks/useAiThemes.ts for the consumer hook.
 */

export interface ThemesRequestBody {
  mode: 'themes';
  scope: 'project' | 'personal';
  projectKey?: string;
  limit?: number;          // default 50
  forceRefresh?: boolean;  // bypass cache, always re-run LLM
}

export interface Theme {
  id: string;
  name: string;
  summary: string;
  count: number;
  percentage: number;
  intent: 'bug' | 'feature' | 'infra' | 'ux' | 'data' | 'other';
  issueKeys: string[];
}

export interface ThemesResponse {
  themes: Theme[];
  generatedAt: string;
  totalIssuesAnalyzed: number;
  scope: { mode: 'project' | 'personal'; projectKey?: string };
  cached: boolean;
}

/**
 * Deterministic hash of (issue_key, summary, status, issue_type) tuples —
 * drives cache invalidation. We deliberately hash the SEMANTIC fields the
 * clustering actually consumes, NOT jira_updated_at: Jira bumps updated_at on
 * cosmetic re-syncs (re-index, watcher change, no-op webhook) which would
 * otherwise bust the cache and force a full Gemini re-run even when nothing
 * themable changed. The signature now diverges only when a clusterable field
 * (new/removed issue, status, summary, or type) actually changes. (2026-06-02)
 *
 * Exported for unit testing (src/test/edge/ai-digest-themes-signature.test.ts).
 */
export async function computeIssuesSignature(
  issues: Array<{ issue_key: string; summary: string; status: string; issue_type: string }>,
): Promise<string> {
  const parts = issues
    .map(i => `${i.issue_key}:${i.summary}:${i.status}:${i.issue_type}`)
    .sort()
    .join('|');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts));
  // Base16 short (first 16 hex chars) — collisions are fine here, we're
  // not signing, we're fingerprinting.
  return Array.from(new Uint8Array(buf).slice(0, 8))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Largest-remainder normalization: rounds each percentage to an integer while
 * preserving sum = 100. Prevents the Rovo-spec "27/27/26/20 rounds to
 * 30/30/30/20 = 110%" trap.
 */
function normalizePercentages(themes: Array<{ count: number } & Record<string, unknown>>, total: number): number[] {
  if (total === 0 || themes.length === 0) return themes.map(() => 0);
  const raw = themes.map(t => (t.count / total) * 100);
  const floored = raw.map(v => Math.floor(v));
  const remainder = 100 - floored.reduce((a, b) => a + b, 0);
  // Indices sorted by largest fractional part — those get the extra points.
  const fractional = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floored];
  for (let k = 0; k < remainder && k < fractional.length; k++) {
    result[fractional[k].i] += 1;
  }
  return result;
}

/**
 * Build the clustering prompt. Themed output is a strict JSON schema so we
 * can drop straight into the response without a markdown parse.
 */
function buildThemesPrompt(args: {
  issues: Array<{
    issue_key: string;
    summary: string;
    // ph_issues schema: column is description_text (plain), description_adf
    // is the ADF JSON variant. We feed plain text to the LLM.
    description_text: string | null;
    issue_type: string;
    status: string;
    project_key: string;
  }>;
  scope: 'project' | 'personal';
  projectKey?: string;
}): { systemPrompt: string; userPrompt: string } {
  const { issues, scope, projectKey } = args;

  const systemPrompt = `You are the AI Theme Analyzer for Catalyst, Saudi Arabia Ministry of Industry's enterprise portfolio management platform. You cluster raw Jira issues into 3–6 distinct root-cause themes so portfolio managers can see what their backlog is really about at a glance.

Return ONLY valid JSON. No markdown. No preamble. No trailing prose.

CLUSTERING RULES
────────────────
- Group issues that share the same underlying root cause, feature area, or user pain point. Think "these 7 bugs are all the Senaei registration flow" — not "these are all bugs".
- Aim for 3–6 themes. If fewer genuine clusters exist, return fewer.
- If one theme dominates (≥50% of issues), that's fine — don't artificially split it to hit a target count.
- If many issues are true one-offs and don't cluster, emit a single "Other" theme to absorb them. Don't invent patterns that aren't there.
- Theme names: 3–5 words, Title Case, specific. GOOD: "Senaei Registration Defects", "Dashboard UI Mismatches", "Industrial License Data Errors". BAD: "Bugs", "Miscellaneous Issues", "Frontend".
- Summary: EXACTLY 2 sentences describing the shared cause and why these issues belong together. Do not just restate the name.
- Every issue must belong to exactly one theme — no overlaps, no omissions. Sum of counts must equal input total.
- intent: one of "bug" (defect-heavy cluster), "feature" (new-capability cluster), "infra" (backend/platform/DevOps), "ux" (UI/UX/design inconsistency), "data" (data quality/accuracy), "other" (genuinely miscellaneous). Pick the single best fit.

OUTPUT SHAPE
────────────
{
  "themes": [
    {
      "name": "Theme Name (3-5 words)",
      "summary": "Two sentence explanation. Why these issues share a cause.",
      "intent": "bug|feature|infra|ux|data|other",
      "issueKeys": ["BAU-1234", "BAU-5678"]
    }
  ]
}

Do NOT include count or percentage — the server computes those from issueKeys length. Do NOT wrap in a top-level object other than {themes}.`;

  const scopeDescription = scope === 'personal'
    ? 'These issues are all assigned to the current user across multiple projects.'
    : `These issues are all from project ${projectKey}.`;

  const issueLines = issues.map(i => {
    const desc = i.description_text ? ` — ${i.description_text.slice(0, 180).replace(/\s+/g, ' ').trim()}` : '';
    return `[${i.issue_key}] (${i.issue_type}, ${i.status}) ${i.summary}${desc}`;
  }).join('\n');

  const userPrompt = `INPUT
─────
${scopeDescription}
Total issues: ${issues.length}

${issueLines}

Return JSON with 3–6 root-cause themes. Every issue_key above must appear in exactly one theme's issueKeys array.`;

  return { systemPrompt, userPrompt };
}

const VALID_INTENTS = new Set(['bug', 'feature', 'infra', 'ux', 'data', 'other']);

/**
 * Sanitize LLM response into a typed Theme[]. Enforces: valid intents,
 * issueKey whitelist (no hallucinations), coverage (every input issue
 * assigned), percentage normalization.
 */
function normalizeThemes(
  raw: unknown,
  inputIssueKeys: string[],
): Theme[] {
  if (!raw || typeof raw !== 'object') return [];
  const rawThemes = (raw as { themes?: unknown }).themes;
  if (!Array.isArray(rawThemes)) return [];

  const inputSet = new Set(inputIssueKeys);
  const assigned = new Set<string>();

  const cleaned = rawThemes
    .map((t: unknown, idx: number): Theme | null => {
      if (!t || typeof t !== 'object') return null;
      const obj = t as Record<string, unknown>;
      const name = typeof obj.name === 'string' ? obj.name.trim() : '';
      const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';
      const intent = typeof obj.intent === 'string' && VALID_INTENTS.has(obj.intent)
        ? (obj.intent as Theme['intent'])
        : 'other';
      if (!Array.isArray(obj.issueKeys)) return null;
      // Filter to input whitelist AND dedupe (so a hallucinated key or a
      // double-assignment can't poison counts).
      const keys = (obj.issueKeys as unknown[])
        .filter((k): k is string => typeof k === 'string' && inputSet.has(k))
        .filter(k => {
          if (assigned.has(k)) return false;
          assigned.add(k);
          return true;
        });
      if (keys.length === 0) return null;
      if (!name || !summary) return null;
      return {
        id: `theme_${idx}_${keys.length}`,
        name,
        summary,
        intent,
        issueKeys: keys,
        count: keys.length,
        percentage: 0, // filled by normalizePercentages below
      };
    })
    .filter((t): t is Theme => t !== null);

  // Orphan bucket — any input issue not assigned by the LLM gets swept into
  // an "Unclustered" theme so the UI doesn't silently lose issues.
  const orphans = inputIssueKeys.filter(k => !assigned.has(k));
  if (orphans.length > 0) {
    cleaned.push({
      id: `theme_orphan`,
      name: 'Unclustered',
      summary: 'Issues that did not cluster into any of the themes above. Treat as a residual bucket while the model builds confidence.',
      intent: 'other',
      issueKeys: orphans,
      count: orphans.length,
      percentage: 0,
    });
  }

  const total = cleaned.reduce((sum, t) => sum + t.count, 0);
  const percentages = normalizePercentages(cleaned, total);
  cleaned.forEach((t, i) => { t.percentage = percentages[i]; });

  // Sort largest → smallest so the UI reads in severity order.
  cleaned.sort((a, b) => b.count - a.count);
  return cleaned;
}

/**
 * Main entry — called from ai-digest/index.ts when body.mode === 'themes'.
 */
export async function handleThemesRequest(args: {
  body: ThemesRequestBody;
  supabase: any;     // SupabaseClient — typing across the Deno/ESM boundary
  userId: string;
  geminiApiKey: string;
  corsHeaders: Record<string, string>;
}): Promise<Response> {
  const { body, supabase, userId, geminiApiKey, corsHeaders } = args;
  const forceRefresh = body.forceRefresh === true;
  // Pre-warm calls (the pg_cron path) tag the body so they never consume the
  // user's manual budget — only genuine user-initiated forceRefresh counts
  // against the 3/day quota.
  const isPrewarm = Boolean((body as { _prewarmedForUser?: string })._prewarmedForUser);
  const scope = body.scope;
  const projectKey = body.projectKey ?? null;
  const limit = Math.min(Math.max(body.limit ?? 50, 10), 100);

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  // Riyadh calendar day (UTC+3, no DST) — the daily reset boundary shared by
  // the quota counter and the cache TTL / 06:00 pre-warm.
  const riyadhDay = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
  const THEME_DAILY_LIMIT = 3;

  // ── Daily re-analyze quota (user-initiated forceRefresh only) ───────────
  // Block before any expensive work if the user has spent today's budget.
  if (forceRefresh && !isPrewarm) {
    const { data: qRow } = await supabase
      .from('ai_theme_quota')
      .select('used')
      .eq('user_id', userId)
      .eq('day_riyadh', riyadhDay)
      .maybeSingle();
    if ((qRow?.used ?? 0) >= THEME_DAILY_LIMIT) {
      return new Response(
        JSON.stringify({
          error: 'daily_limit',
          message: 'Daily re-analyze limit reached. Fresh themes return at 6:00 AM.',
        }),
        { status: 429, headers: jsonHeaders },
      );
    }
  }

  // ── 1. Fetch input issues from ph_issues ────────────────────────────────
  // Schema reminders (verified against ph_issues 2026-04):
  //   • Time column is `jira_updated_at` (NOT updated_at — that doesn't exist).
  //   • Assignee linkage is `assignee_account_id` (Jira account id), NOT a
  //     supabase auth user id. The user's auth.users.id maps to one or more
  //     Jira account ids via ph_user_mapping. We mirror useForYouData here.
  //   • Filter out archived rows (`archived_at IS NULL`) to match what the
  //     user actually sees in the rest of For You.
  // Time window widened to 90 days (from 7) so personal-scope analysis has
  // enough material to cluster — Catalyst portfolios update slowly and 7d
  // routinely returned <5 issues, falling into the empty-state branch.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('ph_issues')
    .select('issue_key, summary, description_text, issue_type, project_key, status, jira_updated_at, assignee_account_id')
    .is('archived_at', null)
    .gte('jira_updated_at', ninetyDaysAgo)
    .order('jira_updated_at', { ascending: false })
    .limit(limit);

  if (scope === 'personal') {
    // Step 1: fetch the user's profile (jira_account_id is the primary fallback
    // used by useAgeingItems — we mirror it here for consistency).
    const { data: profile } = await supabase
      .from('profiles')
      .select('jira_account_id')
      .eq('id', userId)
      .single();

    // Step 2: Look up the user's Jira account ids from ph_user_mapping.
    // A single auth user can be mapped to multiple Jira accounts.
    const { data: mappings, error: mapErr } = await supabase
      .from('ph_user_mapping')
      .select('jira_account_id')
      .eq('catalyst_profile_id', userId)
      .eq('is_mapped', true);

    if (mapErr) {
      console.error('[themes] ph_user_mapping error:', mapErr);
      return new Response(
        JSON.stringify({ error: 'query_failed', message: mapErr.message }),
        { status: 500, headers: jsonHeaders },
      );
    }

    let jiraAccountIds = (mappings ?? [])
      .map((m: { jira_account_id: string | null }) => m.jira_account_id)
      .filter((id): id is string => Boolean(id));

    // Step 3: Fallback to profiles.jira_account_id if ph_user_mapping has no
    // entry for this user. Mirrors the fix applied to useForYouData.fetchUserMapping
    // (commit 1eab16df6) — both hooks must stay in sync with each other and with
    // useAgeingItems which reads profiles.jira_account_id directly.
    if (jiraAccountIds.length === 0 && profile?.jira_account_id) {
      console.log(`[themes] ph_user_mapping empty — using profiles.jira_account_id fallback: ${profile.jira_account_id}`);
      jiraAccountIds = [profile.jira_account_id];
    }

    if (jiraAccountIds.length === 0) {
      // No Jira mapping for this user — return typed empty so UI shows
      // the "not enough activity to theme yet" state instead of a stack trace.
      console.warn(`[themes] No jira_account_id found for userId=${userId} — aborting`);
      const empty: ThemesResponse = {
        themes: [],
        generatedAt: new Date().toISOString(),
        totalIssuesAnalyzed: 0,
        scope: { mode: scope, projectKey: undefined },
        cached: false,
      };
      return new Response(JSON.stringify(empty), { headers: jsonHeaders });
    }

    query = query.in('assignee_account_id', jiraAccountIds);
  } else {
    if (!projectKey) {
      return new Response(
        JSON.stringify({ error: 'project_key_required', message: 'scope=project requires projectKey' }),
        { status: 400, headers: jsonHeaders },
      );
    }
    query = query.eq('project_key', projectKey);
  }

  const { data: issues, error: issuesErr } = await query;
  if (issuesErr) {
    console.error('[themes] ph_issues query error:', issuesErr);
    return new Response(
      JSON.stringify({ error: 'query_failed', message: issuesErr.message }),
      { status: 500, headers: jsonHeaders },
    );
  }
  const issueRows = (issues ?? []) as Array<{
    issue_key: string;
    summary: string;
    description_text: string | null;
    issue_type: string;
    project_key: string;
    status: string;
    jira_updated_at: string;
    assignee_account_id: string | null;
  }>;

  // ── 2. Min-dataset guard ────────────────────────────────────────────────
  // Below 5 issues the LLM invents patterns. Return a typed empty response
  // so the UI can render its "not enough activity to theme yet" state.
  if (issueRows.length < 5) {
    const empty: ThemesResponse = {
      themes: [],
      generatedAt: new Date().toISOString(),
      totalIssuesAnalyzed: issueRows.length,
      scope: { mode: scope, projectKey: projectKey ?? undefined },
      cached: false,
    };
    return new Response(JSON.stringify(empty), { headers: jsonHeaders });
  }

  // ── 3. Cache check via (user_id, scope_mode, project_key) ───────────────
  // Signature hashes the SEMANTIC fields clustering consumes (summary, status,
  // issue_type) — NOT jira_updated_at — so cosmetic Jira re-syncs don't bust
  // the cache. See computeIssuesSignature for rationale. (2026-06-02)
  const signature = await computeIssuesSignature(
    issueRows.map(i => ({
      issue_key: i.issue_key,
      summary: i.summary,
      status: i.status,
      issue_type: i.issue_type,
    })),
  );
  // Cache check — runs for both normal loads AND forceRefresh.
  // forceRefresh bypasses TTL but NOT the no-delta guard: if the user hits
  // Re-analyze but nothing in their issue set has changed (same signature),
  // we return the existing cache entry instead of burning a Gemini call.
  // The `no_delta` flag in the response tells the client why.
  const cacheQuery = supabase
    .from('ai_theme_cache')
    .select('payload, issues_signature, expires_at')
    .eq('user_id', userId)
    .eq('scope_mode', scope);
  const { data: cached } = projectKey
    ? await cacheQuery.eq('project_key', projectKey).maybeSingle()
    : await cacheQuery.is('project_key', null).maybeSingle();

  if (cached && cached.issues_signature === signature) {
    // No-delta: data hasn't changed since the last LLM run.
    // Serve the existing cache regardless of forceRefresh or TTL.
    console.log(`[themes] no-delta cache HIT user=${userId} scope=${scope} project=${projectKey ?? 'personal'} forceRefresh=${forceRefresh}`);
    const payload = cached.payload as ThemesResponse;
    return new Response(
      JSON.stringify({ ...payload, cached: true, no_delta: true }),
      { headers: jsonHeaders },
    );
  }

  if (!forceRefresh && cached && new Date(cached.expires_at).getTime() > Date.now()) {
    // TTL cache HIT (different signature but not expired) — should not happen
    // in practice since signature change invalidates, but belt-and-suspenders.
    console.log(`[themes] TTL cache HIT user=${userId}`);
    const payload = cached.payload as ThemesResponse;
    return new Response(
      JSON.stringify({ ...payload, cached: true }),
      { headers: jsonHeaders },
    );
  }

  // ── 4. LLM call ─────────────────────────────────────────────────────────
  const { systemPrompt, userPrompt } = buildThemesPrompt({
    issues: issueRows,
    scope,
    projectKey: projectKey ?? undefined,
  });

  // Gemini direct (rewired 2026-05-16 — Lovable gateway deprecated).
  // Same endpoint and model as the ai-digest default-mode handler in index.ts.
  const aiResp = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${geminiApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    console.error('[themes] Lovable AI error:', aiResp.status, errText);
    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: jsonHeaders });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: 'credits_exhausted' }), { status: 402, headers: jsonHeaders });
    }
    return new Response(JSON.stringify({ error: 'themes_unavailable' }), { status: 500, headers: jsonHeaders });
  }

  const aiData = await aiResp.json();
  let rawText = aiData.choices?.[0]?.message?.content ?? '';
  rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error('[themes] JSON parse failed. Raw text (first 500 chars):', rawText.slice(0, 500));
    return new Response(
      JSON.stringify({ error: 'themes_unavailable', reason: 'parse_failed' }),
      { status: 500, headers: jsonHeaders },
    );
  }

  const inputKeys = issueRows.map(i => i.issue_key);
  const themes = normalizeThemes(parsed, inputKeys);

  const response: ThemesResponse = {
    themes,
    generatedAt: new Date().toISOString(),
    totalIssuesAnalyzed: issueRows.length,
    scope: { mode: scope, projectKey: projectKey ?? undefined },
    cached: false,
  };

  // ── 5. Upsert cache ─────────────────────────────────────────────────────
  // Daily-refresh policy (retimed 2026-06-18): cache stays valid until the
  // next 06:00 Asia/Riyadh (AST = UTC+3). A pg_cron job at 06:00 AST pre-warms
  // active caches with forceRefresh=true, so the morning's first page load is
  // served warm. Signature mismatch still re-runs intra-day if the input issue
  // set drifts (new issue, status update, etc.).
  function nextSixAmRiyadhUtc(now: Date): Date {
    // 06:00 AST == 03:00 UTC. Build today's 03:00 UTC; if past, use tomorrow.
    const target = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 0, 0, 0,
    ));
    if (target.getTime() <= now.getTime()) {
      target.setUTCDate(target.getUTCDate() + 1);
    }
    return target;
  }
  const expiresAt = nextSixAmRiyadhUtc(new Date()).toISOString();

  // Two-step: DELETE existing row for this scope (RLS-safe), then INSERT.
  // Simpler than matching PostgREST upsert semantics across null project_key.
  const deleteQuery = supabase
    .from('ai_theme_cache')
    .delete()
    .eq('user_id', userId)
    .eq('scope_mode', scope);
  await (projectKey
    ? deleteQuery.eq('project_key', projectKey)
    : deleteQuery.is('project_key', null));

  const { error: insertErr } = await supabase.from('ai_theme_cache').insert({
    user_id: userId,
    scope_mode: scope,
    project_key: projectKey,
    payload: response,
    issues_signature: signature,
    generated_at: response.generatedAt,
    expires_at: expiresAt,
  });

  if (insertErr) {
    console.error('[themes] cache insert error:', insertErr.message);
    // Still return the computed response — cache failure is non-fatal.
  } else {
    console.log(`[themes] cache STORED user=${userId} scope=${scope} project=${projectKey ?? 'personal'} themes=${themes.length}`);
  }

  // ── 6. Consume one unit of the daily quota ──────────────────────────────
  // Only after a real LLM run by a user (not pre-warm, not a no-delta/cache
  // serve — those return earlier). Atomic increment via SECURITY DEFINER RPC.
  if (forceRefresh && !isPrewarm) {
    const { error: quotaErr } = await supabase.rpc('increment_theme_quota', {
      p_user_id: userId,
      p_day: riyadhDay,
    });
    if (quotaErr) console.error('[themes] quota increment failed:', quotaErr.message);
  }

  return new Response(JSON.stringify(response), { headers: jsonHeaders });
}
