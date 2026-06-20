import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Auth: must be admin
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return err('Unauthorized', 401);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.slice(7));
  if (authErr || !user) return err('Unauthorized', 401);

  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!role || !['admin', 'super_admin'].includes(role.role)) return err('Forbidden', 403);

  try {
    if (req.method === 'GET') return await handleGet(supabase);
    if (req.method === 'POST') return await handlePost(supabase, req, user.id);
    return err('Method not allowed', 405);
  } catch (e) {
    console.error('[deploy-control]', e);
    return err(e instanceof Error ? e.message : 'Unknown error', 500);
  }
});

async function handleGet(supabase: ReturnType<typeof createClient>) {
  const [gateRes, settingsRes] = await Promise.all([
    supabase.from('deploy_gate').select('*').eq('id', 1).maybeSingle(),
    supabase.from('deploy_settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  const gate = gateRes.data ?? { production_deploy_enabled: true };
  const settings = settingsRes.data ?? {};

  // Fetch disabled_by email if present
  let disabledByEmail: string | null = null;
  if (gate.disabled_by) {
    const { data: p } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', gate.disabled_by)
      .maybeSingle();
    disabledByEmail = p?.email ?? null;
  }

  let runs: unknown[] = [];
  let deployments: unknown[] = [];

  // GitHub runs (requires PAT)
  if (settings.github_pat) {
    try {
      const gh = await fetch(
        `https://api.github.com/repos/${settings.github_repo}/actions/workflows/${settings.github_workflow_id}/runs?per_page=15`,
        {
          headers: {
            Authorization: `Bearer ${settings.github_pat}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );
      if (gh.ok) {
        const body = await gh.json();
        runs = (body.workflow_runs ?? []).map((r: Record<string, unknown>) => ({
          id: r.id,
          status: r.status,
          conclusion: r.conclusion,
          name: r.name,
          head_sha: (r.head_sha as string)?.slice(0, 7),
          head_commit_message: (r.head_commit as Record<string, unknown>)?.message as string ?? '',
          created_at: r.created_at,
          updated_at: r.updated_at,
          run_started_at: r.run_started_at,
          html_url: r.html_url,
          run_attempt: r.run_attempt,
          trigger: (r.triggering_actor as Record<string, unknown>)?.login as string ?? '',
          duration_ms: r.run_started_at && r.updated_at
            ? new Date(r.updated_at as string).getTime() - new Date(r.run_started_at as string).getTime()
            : null,
        }));
      }
    } catch (e) {
      console.error('[deploy-control] github runs fetch failed:', e);
    }
  }

  // Vercel deployments (requires token)
  if (settings.vercel_token) {
    try {
      const vr = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${settings.vercel_project_id}&teamId=${settings.vercel_org_id}&limit=10&target=production`,
        { headers: { Authorization: `Bearer ${settings.vercel_token}` } },
      );
      if (vr.ok) {
        const body = await vr.json();
        deployments = (body.deployments ?? []).map((d: Record<string, unknown>) => ({
          uid: d.uid,
          url: d.url,
          state: d.state,
          target: d.target,
          created_at: d.createdAt,
          ready_at: d.ready,
          build_duration_ms:
            d.ready && d.buildingAt
              ? (d.ready as number) - (d.buildingAt as number)
              : null,
          meta: {
            github_commit_sha: (d.meta as Record<string, unknown>)?.githubCommitSha,
            github_commit_message: (d.meta as Record<string, unknown>)?.githubCommitMessage,
            github_commit_author_name: (d.meta as Record<string, unknown>)?.githubCommitAuthorName,
          },
        }));
      }
    } catch (e) {
      console.error('[deploy-control] vercel deployments fetch failed:', e);
    }
  }

  // AI summaries — fetch cached, generate missing (max 3 per call to stay within timeout)
  const runIds = runs.map((r) => (r as Record<string, unknown>).id as number);
  const summaryMap = new Map<number, string>();
  if (runIds.length > 0) {
    const { data: cached } = await supabase
      .from('deploy_summaries')
      .select('run_id, summary')
      .in('run_id', runIds);
    for (const s of cached ?? []) summaryMap.set(s.run_id, s.summary);
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    const needsSummary = runs
      .filter((r) => {
        const run = r as Record<string, unknown>;
        return run.conclusion && run.head_commit_message && !summaryMap.has(run.id as number);
      })
      .slice(0, 3);

    if (needsSummary.length > 0) {
      const generated = await Promise.all(
        needsSummary.map(async (r) => {
          const run = r as Record<string, unknown>;
          try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': anthropicKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 100,
                messages: [{
                  role: 'user',
                  content: `Summarize this software deployment in 1 short sentence for a non-technical product owner. What changed for users? Commit: "${(run.head_commit_message as string).split('\n')[0]}"`,
                }],
              }),
            });
            if (!res.ok) return null;
            const body = await res.json();
            const summary: string = body.content?.[0]?.text?.trim() ?? '';
            if (!summary) return null;
            summaryMap.set(run.id as number, summary);
            return { run_id: run.id as number, summary, commit_sha: run.head_sha as string, commit_message: (run.head_commit_message as string).split('\n')[0] };
          } catch {
            return null;
          }
        }),
      );
      const toInsert = generated.filter(Boolean);
      if (toInsert.length > 0) {
        await supabase.from('deploy_summaries').upsert(toInsert);
      }
    }
  }

  const runsWithSummaries = runs.map((r) => ({
    ...(r as Record<string, unknown>),
    summary: summaryMap.get((r as Record<string, unknown>).id as number) ?? null,
  }));

  // Stats from GitHub runs
  const today = new Date().toISOString().slice(0, 10);
  const todayRuns = runs.filter((r) => (r as Record<string, unknown>).created_at?.toString().startsWith(today));
  const successRuns = runs.filter((r) => (r as Record<string, unknown>).conclusion === 'success');
  const failedRuns = runs.filter((r) => (r as Record<string, unknown>).conclusion === 'failure');
  const completedWithDuration = runs.filter((r) => (r as Record<string, unknown>).duration_ms != null);
  const avgDuration = completedWithDuration.length
    ? completedWithDuration.reduce((sum, r) => sum + ((r as Record<string, unknown>).duration_ms as number), 0) /
      completedWithDuration.length
    : null;

  return json({
    gate: {
      production_deploy_enabled: gate.production_deploy_enabled,
      disabled_at: gate.disabled_at ?? null,
      disabled_by_email: disabledByEmail,
      disabled_reason: gate.disabled_reason ?? null,
    },
    config: {
      github_pat_set: !!settings.github_pat,
      vercel_token_set: !!settings.vercel_token,
      github_repo: settings.github_repo ?? 'Vikram-Indla/catalyst-prod-45',
      github_workflow_id: settings.github_workflow_id ?? 'vercel-deploy.yml',
      vercel_project_id: settings.vercel_project_id ?? '',
      production_url: settings.production_url ?? 'https://ksa-catalyst.com',
    },
    runs: runsWithSummaries,
    deployments,
    stats: {
      today: todayRuns.length,
      total: runs.length,
      success: successRuns.length,
      failed: failedRuns.length,
      avg_duration_ms: avgDuration,
    },
  });
}

async function handlePost(
  supabase: ReturnType<typeof createClient>,
  req: Request,
  userId: string,
) {
  const body = await req.json();

  if (body.action === 'toggle') {
    const enabled = Boolean(body.enabled);
    await supabase.from('deploy_gate').update({
      production_deploy_enabled: enabled,
      disabled_at: enabled ? null : new Date().toISOString(),
      disabled_by: enabled ? null : userId,
      disabled_reason: body.reason ?? null,
    }).eq('id', 1);
    return json({ ok: true, production_deploy_enabled: enabled });
  }

  if (body.action === 'trigger') {
    const { data: settings } = await supabase
      .from('deploy_settings')
      .select('github_pat, github_repo, github_workflow_id')
      .eq('id', 1)
      .maybeSingle();

    if (!settings?.github_pat) return err('GitHub PAT not configured', 400);

    const res = await fetch(
      `https://api.github.com/repos/${settings.github_repo}/actions/workflows/${settings.github_workflow_id}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.github_pat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      },
    );

    if (!res.ok) {
      const txt = await res.text();
      return err(`GitHub API error ${res.status}: ${txt}`, 502);
    }
    return json({ ok: true, message: 'Workflow dispatch triggered' });
  }

  if (body.action === 'save_config') {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: userId };
    if (body.github_pat !== undefined) update.github_pat = body.github_pat || null;
    if (body.vercel_token !== undefined) update.vercel_token = body.vercel_token || null;
    await supabase.from('deploy_settings').update(update).eq('id', 1);
    return json({ ok: true });
  }

  return err('Unknown action', 400);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function err(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
