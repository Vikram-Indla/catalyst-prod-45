/**
 * replay-narrate
 *
 * POST body: { issue_key: string }
 *
 * 1. Loads ph_issues hierarchy + work_item_transitions for the key
 * 2. Builds a compact narrative prompt from real transition data
 * 3. Calls Gemini 2.5 Flash to produce a plain-English lifecycle story
 * 4. Returns { narrative: string, lanes: number, transitions: number }
 *
 * Auth: anon key accepted — the Supabase RLS on ph_issues / work_item_transitions
 * already gates reads to authenticated sessions. The edge function
 * uses the service role to bypass RLS only for aggregation; the caller
 * must have a valid Supabase JWT (passed via Authorization header).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const MODEL = 'gemini-2.5-flash';
const JIRA_KEY_RE = /^[A-Z]+-\d+$/;

const SUBTASK_TYPES = new Set(['Sub-task', 'Backend', 'Frontend', 'Integration', 'API Requirement', 'BRD Task']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function msToReadable(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor(ms / 60_000);
  return `${mins}m`;
}

function buildNarrativePrompt(
  rootKey: string,
  issues: any[],
  transitions: any[],
): string {
  const issueMap = new Map(issues.map((i: any) => [i.id, i]));
  const byIssue = new Map<string, any[]>();
  for (const t of transitions) {
    const bucket = byIssue.get(t.work_item_id) ?? [];
    bucket.push(t);
    byIssue.set(t.work_item_id, bucket);
  }

  const lines: string[] = [
    `Lifecycle narrative for Jira issue ${rootKey} and its hierarchy.`,
    `You are a project analyst summarising what actually happened to this work — not what was planned.`,
    `Be precise, chronological, and concise. Reference people by first name only.`,
    `Highlight: delays (>3 days in a single status), backward moves (Done → In Progress etc), handovers, and scope-creep items.`,
    ``,
    `=== HIERARCHY (${issues.length} issues) ===`,
  ];

  for (const issue of issues) {
    if (SUBTASK_TYPES.has(issue.issue_type)) continue;
    const ts = (byIssue.get(issue.id) ?? []).sort(
      (a: any, b: any) => new Date(a.transitioned_at).getTime() - new Date(b.transitioned_at).getTime()
    );

    lines.push(`\n[${issue.issue_key}] ${issue.issue_type} — "${issue.summary}"`);
    if (issue.parent_key) lines.push(`  Parent: ${issue.parent_key}`);
    if (issue.jira_created_at) lines.push(`  Created: ${new Date(issue.jira_created_at).toDateString()}`);

    if (ts.length === 0) {
      lines.push(`  No transitions recorded.`);
      continue;
    }

    for (const t of ts) {
      const when = new Date(t.transitioned_at).toDateString();
      const who = t.transitioned_by ?? 'Unknown';
      const dur = t.time_in_from_status_ms ? ` (spent ${msToReadable(t.time_in_from_status_ms)} in ${t.from_status})` : '';
      lines.push(`  ${when} · ${who}: ${t.from_status ?? 'Created'} → ${t.to_status}${dur}`);
    }
  }

  lines.push(`\n=== END ===`);
  lines.push(`\nWrite a narrative paragraph per main issue (not sub-tasks), then a 2-sentence executive summary at the end. Use plain English. No markdown headers. No bullet lists.`);

  return lines.join('\n');
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: { issue_key?: string };
  try { body = await req.json(); } catch { body = {}; }

  const rawKey = (body.issue_key ?? '').trim().toUpperCase();
  if (!JIRA_KEY_RE.test(rawKey)) {
    return new Response(JSON.stringify({ error: `Invalid issue key: ${rawKey}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Load hierarchy ────────────────────────────────────────────────────────
  const allIssues: any[] = [];
  const visited = new Set<string>();
  const queue: string[] = [rawKey];

  while (queue.length > 0) {
    const batch = queue.splice(0, 50).filter((k) => !visited.has(k));
    if (!batch.length) continue;
    batch.forEach((k) => visited.add(k));

    const { data, error } = await supabase
      .from('ph_issues')
      .select('id,issue_key,issue_type,summary,parent_key,project_key,jira_created_at')
      .in('issue_key', batch);
    if (error) return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    if (!data?.length) continue;

    for (const row of data) allIssues.push(row);

    const { data: children } = await supabase
      .from('ph_issues')
      .select('id,issue_key,issue_type,summary,parent_key,project_key,jira_created_at')
      .in('parent_key', batch);
    for (const child of children ?? []) {
      if (!visited.has(child.issue_key)) queue.push(child.issue_key);
    }
  }

  if (!allIssues.length) {
    return new Response(JSON.stringify({ error: `Issue ${rawKey} not found in ph_issues` }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Load transitions ──────────────────────────────────────────────────────
  const ids = allIssues.map((i) => i.id);
  const { data: transitions, error: tErr } = await supabase
    .from('work_item_transitions')
    .select('id,work_item_id,from_status,to_status,transitioned_by,transitioned_at,time_in_from_status_ms')
    .in('work_item_id', ids)
    .order('transitioned_at', { ascending: true });
  if (tErr) {
    return new Response(JSON.stringify({ error: tErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Build prompt ──────────────────────────────────────────────────────────
  const prompt = buildNarrativePrompt(rawKey, allIssues, transitions ?? []);

  // ── Call Gemini ───────────────────────────────────────────────────────────
  const geminiRes = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${geminiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.4,
    }),
  });

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => '');
    return new Response(JSON.stringify({ error: `Gemini error ${geminiRes.status}: ${errText.slice(0, 300)}` }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const geminiData = await geminiRes.json();
  const narrative = geminiData.choices?.[0]?.message?.content?.trim() ?? '';

  return new Response(
    JSON.stringify({
      narrative,
      lanes: allIssues.filter((i) => !SUBTASK_TYPES.has(i.issue_type)).length,
      transitions: (transitions ?? []).length,
      issues_total: allIssues.length,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
