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
 * Deterministic hash of (issue_key, updated_at) tuples — drives cache
 * invalidation. When a new issue arrives or an existing one's updated_at
 * changes, the signature diverges from cache's and we re-run.
 */
async function computeIssuesSignature(
  issues: Array<{ issue_key: string; updated_at: string }>,
): Promise<string> {
  const parts = issues
    .map(i => `${i.issue_key}:${i.updated_at}`)
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
  lovableApiKey: string;
  corsHeaders: Record<string, string>;
}): Promise<Response> {
  const { body, supabase, userId, lovableApiKey, corsHeaders } = args;
  const forceRefresh = body.forceRefresh === true;
  const scope = body.scope;
  const projectKey = body.projectKey ?? null;
  const limit = Math.min(Math.max(body.limit ?? 50, 10), 100);

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

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
    // Look up the user's Jira account ids (a single auth user can be mapped
    // to multiple Jira accounts — e.g. work + personal). Empty array = no
    // mapped Jira account, surfaces as the empty state.
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

    const jiraAccountIds = (mappings ?? [])
      .map((m: { jira_account_id: string | null }) => m.jira_account_id)
      .filter((id): id is string => Boolean(id));

    if (jiraAccountIds.length === 0) {
      // No Jira mapping for this user — return typed empty so UI shows
      // the "not enough activity to theme yet" state instead of a stack trace.
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
  // Adapt our row shape (jira_updated_at) to the signature helper's
  // generic {updated_at} contract — same hash semantics either way.
  const signature = await computeIssuesSignature(
    issueRows.map(i => ({ issue_key: i.issue_key, updated_at: i.jira_updated_at })),
  );
  if (!forceRefresh) {
    const cacheQuery = supabase
      .from('ai_theme_cache')
      .select('payload, issues_signature, expires_at')
      .eq('user_id', userId)
      .eq('scope_mode', scope);
    const { data: cached } = projectKey
      ? await cacheQuery.eq('project_key', projectKey).maybeSingle()
      : await cacheQuery.is('project_key', null).maybeSingle();

    if (
      cached &&
      cached.issues_signature === signature &&
      new Date(cached.expires_at).getTime() > Date.now()
    ) {
      console.log(`[themes] cache HIT user=${userId} scope=${scope} project=${projectKey ?? 'personal'}`);
      const payload = cached.payload as ThemesResponse;
      return new Response(
        JSON.stringify({ ...payload, cached: true }),
        { headers: jsonHeaders },
      );
    }
  }

  // ── 4. LLM call ─────────────────────────────────────────────────────────
  const { systemPrompt, userPrompt } = buildThemesPrompt({
    issues: issueRows,
    scope,
    projectKey: projectKey ?? undefined,
  });

  const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovableApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
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
  // 10-min TTL. The unique index on (user_id, scope_mode, COALESCE(project_key,''))
  // means one row per user-scope combo; upsert handles both INSERT and UPDATE.
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

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

  return new Response(JSON.stringify(response), { headers: jsonHeaders });
}
