import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Auth: must be admin
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return err('Unauthorized', 401);

  // User-scoped client for JWT verification (canonical Supabase edge function pattern —
  // service-role client's getUser(jwt) is unreliable in Deno edge function environments)
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: auth } },
    },
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    console.error('[deploy-control] auth.getUser failed:', authErr?.message ?? 'no user');
    return err('Unauthorized', 401);
  }

  // Service-role client for all DB operations (bypasses RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: role, error: roleErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();
  if (roleErr) {
    console.error('[deploy-control] user_roles query error:', roleErr.message, 'user:', user.id);
    return err('Server error', 500);
  }
  if (!role) {
    console.error('[deploy-control] role check failed: requires admin, user had:', role?.role, 'user:', user.id);
    return err('Forbidden', 403);
  }

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

  const gate = gateRes.data ?? { production_deploy_enabled: false };
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

  // Staging function deploy runs (deploy-functions.yml → staging job on main push)
  let staging_runs: unknown[] = [];
  if (settings.github_pat) {
    try {
      const sr = await fetch(
        `https://api.github.com/repos/${settings.github_repo}/actions/workflows/deploy-functions.yml/runs?per_page=8`,
        {
          headers: {
            Authorization: `Bearer ${settings.github_pat}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );
      if (sr.ok) {
        const body = await sr.json();
        staging_runs = (body.workflow_runs ?? []).map((r: Record<string, unknown>) => ({
          id: r.id,
          status: r.status,
          conclusion: r.conclusion,
          head_sha: (r.head_sha as string)?.slice(0, 7),
          head_commit_message: ((r.head_commit as Record<string, unknown>)?.message as string ?? '').split('\n')[0],
          created_at: r.created_at,
          updated_at: r.updated_at,
          run_started_at: r.run_started_at,
          html_url: r.html_url,
          trigger: (r.triggering_actor as Record<string, unknown>)?.login as string ?? '',
          duration_ms: r.run_started_at && r.updated_at
            ? new Date(r.updated_at as string).getTime() - new Date(r.run_started_at as string).getTime()
            : null,
        }));
      }
    } catch (e) {
      console.error('[deploy-control] staging_runs fetch failed:', e);
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
    staging_runs,
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
    const { data: gate } = await supabase
      .from('deploy_gate')
      .select('production_deploy_enabled')
      .eq('id', 1)
      .maybeSingle();
    if (!gate?.production_deploy_enabled) return err('Deploy gate is OFF. Enable it at /admin/connections/vercel before deploying.', 403);

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

    if (!res.ok) return ghErr(res);
    return json({ ok: true, message: 'Workflow dispatch triggered' });
  }

  if (body.action === 'get_run_jobs') {
    const { data: settings } = await supabase
      .from('deploy_settings')
      .select('github_pat, github_repo')
      .eq('id', 1)
      .maybeSingle();
    if (!settings?.github_pat) return err('GitHub PAT not configured', 400);

    const res = await fetch(
      `https://api.github.com/repos/${settings.github_repo}/actions/runs/${body.run_id}/jobs`,
      {
        headers: {
          Authorization: `Bearer ${settings.github_pat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
    if (!res.ok) return ghErr(res);
    const jobsBody = await res.json();
    const jobs = (jobsBody.jobs ?? []).map((j: Record<string, unknown>) => ({
      id: j.id,
      name: j.name,
      status: j.status,
      conclusion: j.conclusion,
      started_at: j.started_at,
      completed_at: j.completed_at,
      steps: ((j.steps ?? []) as Record<string, unknown>[]).map((s) => ({
        name: s.name,
        status: s.status,
        conclusion: s.conclusion,
        number: s.number,
        started_at: s.started_at,
        completed_at: s.completed_at,
      })),
    }));
    return json({ jobs });
  }

  if (body.action === 'save_config') {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: userId };
    if (body.github_pat !== undefined) update.github_pat = body.github_pat || null;
    if (body.vercel_token !== undefined) update.vercel_token = body.vercel_token || null;
    await supabase.from('deploy_settings').update(update).eq('id', 1);
    return json({ ok: true });
  }

  if (body.action === 'get_environments') {
    const { data: settings } = await supabase
      .from('deploy_settings')
      .select('github_pat, github_repo')
      .eq('id', 1)
      .maybeSingle();

    if (!settings?.github_pat) return json({ mainBranch: null, prodBranch: null });

    const ghHeaders = {
      Authorization: `Bearer ${settings.github_pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const [mainBranchRes, prodBranchRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${settings.github_repo}/branches/main`, { headers: ghHeaders }),
      fetch(`https://api.github.com/repos/${settings.github_repo}/branches/production`, { headers: ghHeaders }),
    ]);

    let mainBranch = null;
    let prodBranch = null;

    if (mainBranchRes.ok) {
      const b = await mainBranchRes.json();
      mainBranch = { sha: b.commit?.sha?.slice(0, 7), message: b.commit?.commit?.message?.split('\n')[0], date: b.commit?.commit?.committer?.date };
    }
    if (prodBranchRes.ok) {
      const b = await prodBranchRes.json();
      prodBranch = { sha: b.commit?.sha?.slice(0, 7), message: b.commit?.commit?.message?.split('\n')[0], date: b.commit?.commit?.committer?.date };
    }

    return json({ mainBranch, prodBranch });
  }

  if (body.action === 'get_branch_diff') {
    const sourceBranch = (body.source_branch as string) ?? 'main';

    const { data: settings } = await supabase
      .from('deploy_settings')
      .select('github_pat, github_repo')
      .eq('id', 1)
      .maybeSingle();
    if (!settings?.github_pat) return err('GitHub PAT not configured', 400);

    const res = await fetch(
      `https://api.github.com/repos/${settings.github_repo}/compare/production...${encodeURIComponent(sourceBranch)}`,
      {
        headers: {
          Authorization: `Bearer ${settings.github_pat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
    if (!res.ok) return ghErr(res);
    const cmp = await res.json();
    const commits = (cmp.commits ?? []).map((c: Record<string, unknown>) => ({
      sha: (c.sha as string)?.slice(0, 7),
      message: (c.commit as Record<string, unknown>)?.message as string,
      author: ((c.commit as Record<string, unknown>)?.author as Record<string, unknown>)?.name as string,
      date: ((c.commit as Record<string, unknown>)?.committer as Record<string, unknown>)?.date as string,
    })).reverse(); // newest first
    return json({ ahead_by: cmp.ahead_by ?? 0, behind_by: cmp.behind_by ?? 0, commits });
  }

  if (body.action === 'promote_to_production') {
    const sourceBranch = (body.source_branch as string) ?? 'main';

    const { data: settings } = await supabase
      .from('deploy_settings')
      .select('github_pat, github_repo')
      .eq('id', 1)
      .maybeSingle();
    if (!settings?.github_pat) return err('GitHub PAT not configured', 400);

    const ghHeaders = {
      Authorization: `Bearer ${settings.github_pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // Fetch commits ahead of production to build a meaningful message
    let commitMessage = `release: promote ${sourceBranch} → production`;
    try {
      const cmpRes = await fetch(
        `https://api.github.com/repos/${settings.github_repo}/compare/production...${encodeURIComponent(sourceBranch)}?per_page=50`,
        { headers: ghHeaders },
      );
      if (cmpRes.ok) {
        const cmp = await cmpRes.json();
        const commits = ((cmp.commits ?? []) as Record<string, unknown>[])
          .map((c) => ((c.commit as Record<string, unknown>)?.message as string ?? '').split('\n')[0])
          .reverse();
        const ahead = cmp.ahead_by ?? commits.length;
        if (ahead === 0) {
          // Already in sync — handled below by 204
        } else if (commits.length === 1) {
          commitMessage = `release: ${commits[0]}`;
        } else {
          const lines = commits.slice(0, 10).map((m) => `• ${m}`).join('\n');
          commitMessage = `release: promote ${ahead} commit${ahead !== 1 ? 's' : ''} to production\n\n${lines}`;
        }
      }
    } catch {
      // fallback to generic message
    }

    const res = await fetch(
      `https://api.github.com/repos/${settings.github_repo}/merges`,
      {
        method: 'POST',
        headers: { ...ghHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base: 'production',
          head: sourceBranch,
          commit_message: commitMessage,
        }),
      },
    );

    if (res.status === 204) return json({ ok: true, message: `Already up to date — production is at the same commit as ${sourceBranch}` });
    if (!res.ok) return ghErr(res);
    const merged = await res.json();
    return json({ ok: true, sha: (merged.sha as string)?.slice(0, 7), message: `Merged ${sourceBranch} → production. CI will now deploy to ksa-catalyst.com.` });
  }

  // ── list_branches: all repo branches sorted (main first) ─────────────────
  if (body.action === 'list_branches') {
    const { data: settings } = await supabase
      .from('deploy_settings')
      .select('github_pat, github_repo')
      .eq('id', 1)
      .maybeSingle();
    if (!settings?.github_pat) return err('GitHub PAT not configured', 400);

    const res = await fetch(
      `https://api.github.com/repos/${settings.github_repo}/branches?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${settings.github_pat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
    if (!res.ok) return ghErr(res);

    const raw = await res.json() as Record<string, unknown>[];
    const branches = raw.map((b) => ({
      name: b.name as string,
      sha: ((b.commit as Record<string, unknown>)?.sha as string)?.slice(0, 7) ?? null,
    }));

    const ORDER = ['main', 'production'];
    branches.sort((a, b) => {
      const ai = ORDER.indexOf(a.name), bi = ORDER.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    return json({ branches });
  }

  // ── get_branch_summary: diff + migration detection + AI plain-English summary
  if (body.action === 'get_branch_summary') {
    const sourceBranch = (body.source_branch as string) ?? 'main';

    const { data: settings } = await supabase
      .from('deploy_settings')
      .select('github_pat, github_repo')
      .eq('id', 1)
      .maybeSingle();
    if (!settings?.github_pat) return err('GitHub PAT not configured', 400);

    const ghHeaders = {
      Authorization: `Bearer ${settings.github_pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // compare includes both commits[] and files[]
    const res = await fetch(
      `https://api.github.com/repos/${settings.github_repo}/compare/production...${encodeURIComponent(sourceBranch)}?per_page=100`,
      { headers: ghHeaders },
    );
    if (!res.ok) return ghErr(res);

    const cmp = await res.json();
    const ahead_by: number = cmp.ahead_by ?? 0;
    const behind_by: number = cmp.behind_by ?? 0;

    const commits = ((cmp.commits ?? []) as Record<string, unknown>[]).map((c) => ({
      sha: (c.sha as string)?.slice(0, 7),
      message: ((c.commit as Record<string, unknown>)?.message as string ?? '').split('\n')[0],
      author: (((c.commit as Record<string, unknown>)?.author as Record<string, unknown>)?.name as string) ?? '',
      date: (((c.commit as Record<string, unknown>)?.committer as Record<string, unknown>)?.date as string) ?? '',
    })).reverse();

    // Group changed files
    const files = (cmp.files ?? []) as Record<string, unknown>[];
    const groups: Record<string, { count: number; emoji: string }> = {
      'DB migrations': { count: 0, emoji: '🗄' },
      'Edge functions': { count: 0, emoji: '⚡' },
      'UI': { count: 0, emoji: '🎨' },
      'App logic': { count: 0, emoji: '⚙' },
      'Config & CI': { count: 0, emoji: '🔧' },
      'Other': { count: 0, emoji: '📄' },
    };
    const migrationFiles: string[] = [];

    for (const f of files) {
      const fn = f.filename as string;
      if (fn.startsWith('supabase/migrations/')) {
        groups['DB migrations'].count++;
        migrationFiles.push(fn.split('/').pop() ?? fn);
      } else if (fn.startsWith('supabase/functions/')) {
        groups['Edge functions'].count++;
      } else if (/^src\/(pages|components|modules)\//.test(fn)) {
        groups['UI'].count++;
      } else if (/^src\/(hooks|lib|contexts|integrations|routes|stores)\//.test(fn)) {
        groups['App logic'].count++;
      } else if (/\.(yml|yaml|json|toml|env)$/.test(fn) || fn.startsWith('.github/') || fn.startsWith('design-governance/')) {
        groups['Config & CI'].count++;
      } else {
        groups['Other'].count++;
      }
    }

    const file_groups = Object.entries(groups)
      .filter(([, g]) => g.count > 0)
      .map(([label, g]) => ({ label, count: g.count, emoji: g.emoji }));

    const has_migrations = migrationFiles.length > 0;

    // AI plain-English summary via Claude Haiku
    let ai_summary: string | null = null;
    if (ahead_by > 0) {
      const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (anthropicKey) {
        try {
          const commitList = commits.slice(0, 20).map((c) => `• ${c.message}`).join('\n');
          const fileGroupDesc = file_groups.map((g) => `${g.label}: ${g.count} file${g.count !== 1 ? 's' : ''}`).join(', ');

          const prompt = `You are helping a non-technical product owner understand what a software update will change.

${commits.length} commit${commits.length !== 1 ? 's' : ''} are ready to deploy to production:
${commitList}

Files changed: ${fileGroupDesc}

Write 2-3 plain English sentences. Use "users can now...", "this fixes...", "this improves..." style. No technical jargon (no git, branch, commit, TypeScript, React, API, migration, deploy). Focus only on what the person using the product will notice.`;

          const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 200,
              messages: [{ role: 'user', content: prompt }],
            }),
          });
          if (aiRes.ok) {
            const aiBody = await aiRes.json();
            ai_summary = aiBody.content?.[0]?.text?.trim() ?? null;
          }
        } catch (e) {
          console.error('[deploy-control] AI summary failed:', e);
        }
      }
    }

    return json({ ahead_by, behind_by, commits, has_migrations, migration_files: migrationFiles, file_groups, total_files_changed: files.length, ai_summary });
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

async function ghErr(res: Response): Promise<Response> {
  if (res.status === 403) {
    return err(
      'GitHub PAT is missing repository access. Go to the Config tab and update the PAT — it needs "repo" scope (classic PAT) or "Contents: Read" permission (fine-grained PAT).',
      502,
    );
  }
  const txt = await res.text();
  return err(`GitHub API error ${res.status}: ${txt}`, 502);
}
