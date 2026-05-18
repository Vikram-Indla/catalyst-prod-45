// supabase/functions/routing-taxonomy-scan/index.ts
//
// Routing Taxonomy Scanner — Cron Edge Function
//
// Triggered by pg_cron (via net.http_post with LIFECYCLE_CRON_SECRET).
// Fetches route files from GitHub repo, scans for taxonomy violations,
// and upserts results into routing_taxonomy_violations table.
//
// Can also be invoked manually: POST with { dry_run: true } to preview.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROUTE_FILES = [
  'src/App.tsx',
  'src/routes/FullAppRoutes.tsx',
];

const RULES = [
  {
    id: 'RT-001',
    name: 'camelCase path segment',
    description: 'Route paths must use kebab-case, not camelCase',
    severity: 'error',
    test: (pathStr: string) => {
      const segments = pathStr.split('/').filter((s: string) => s && !s.startsWith(':'));
      return segments.some((seg: string) => /[A-Z]/.test(seg) && !seg.includes('-'));
    },
    fix: (pathStr: string) => pathStr.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
  },
  {
    id: 'RT-003',
    name: 'Hardcoded Jira URL',
    description: 'Jira URLs must come from ph_jira_connection, not hardcoded strings',
    severity: 'error',
    testSource: (src: string) => {
      const matches: { line: number; text: string }[] = [];
      src.split('\n').forEach((line, i) => {
        if (/jira\.example\.com/.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
          matches.push({ line: i + 1, text: line.trim().substring(0, 200) });
        }
      });
      return matches;
    },
  },
  {
    id: 'RT-004',
    name: 'Missing /browse/:key canonical route',
    description: 'The universal /browse/:issueKey resolver must exist',
    severity: 'error',
    testRouteTree: (allRoutes: { path: string }[]) => {
      return !allRoutes.some(r => r.path.includes('browse/:issueKey'));
    },
  },
];

function extractRoutes(src: string, file: string) {
  const routes: { path: string; file: string; line: number }[] = [];
  const regex = /path=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    routes.push({
      path: match[1],
      file,
      line: src.substring(0, match.index).split('\n').length,
    });
  }
  return routes;
}

async function fetchFileFromGitHub(filePath: string): Promise<string | null> {
  const repo = 'Vikram-Indla/catalyst-prod-45';
  const branch = 'main';
  const url = `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('LIFECYCLE_CRON_SECRET');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dry_run === true;
  } catch { /* no body is fine */ }

  const violations: any[] = [];
  const allRoutes: { path: string; file: string; line: number }[] = [];

  for (const filePath of ROUTE_FILES) {
    const src = await fetchFileFromGitHub(filePath);
    if (!src) continue;

    const routes = extractRoutes(src, filePath);
    allRoutes.push(...routes);

    for (const route of routes) {
      for (const rule of RULES) {
        if ('test' in rule && rule.test && rule.test(route.path)) {
          violations.push({
            rule_id: rule.id,
            rule_name: rule.name,
            severity: rule.severity,
            file: route.file,
            line: route.line,
            path: route.path,
            fix: 'fix' in rule && rule.fix ? rule.fix(route.path) : null,
            description: rule.description,
          });
        }
      }
    }

    for (const rule of RULES) {
      if ('testSource' in rule && rule.testSource) {
        const matches = rule.testSource(src);
        for (const m of matches) {
          violations.push({
            rule_id: rule.id,
            rule_name: rule.name,
            severity: rule.severity,
            file: filePath,
            line: m.line,
            path: null,
            text: m.text,
            fix: null,
            description: rule.description,
          });
        }
      }
    }
  }

  for (const rule of RULES) {
    if ('testRouteTree' in rule && rule.testRouteTree && rule.testRouteTree(allRoutes)) {
      violations.push({
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        file: 'route-tree',
        line: 0,
        path: '/browse/:issueKey',
        text: null,
        fix: null,
        description: rule.description,
      });
    }
  }

  if (dryRun) {
    return new Response(JSON.stringify({ ok: true, dry_run: true, violations, count: violations.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, supabaseKey);

  await sb.from('routing_taxonomy_violations').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('resolved', false);

  if (violations.length > 0) {
    const rows = violations.map(v => ({
      ...v,
      scanned_at: new Date().toISOString(),
      resolved: false,
    }));
    const { error } = await sb.from('routing_taxonomy_violations').insert(rows);
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    violations_found: violations.length,
    scanned_files: ROUTE_FILES.length,
    timestamp: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
