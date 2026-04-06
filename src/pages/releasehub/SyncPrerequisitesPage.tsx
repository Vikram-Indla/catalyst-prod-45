import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type CheckStatus = 'checking' | 'pass' | 'fail' | 'warn';

interface CheckResult {
  label: string;
  status: CheckStatus;
  detail: string;
}

const STATUS_STYLES: Record<Exclude<CheckStatus, 'checking'>, { bg: string; text: string; label: string }> = {
  pass: { bg: 'var(--status-ok-bg, #E3FCEF)', text: '#006644', label: 'PASS' },
  fail: { bg: '#FFEBE6', text: '#BF2600', label: 'FAIL' },
  warn: { bg: '#FFF3E0', text: '#B45309', label: 'WARN' },
};

function StatusPill({ status }: { status: CheckStatus }) {
  if (status === 'checking') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-500">
        CHECKING…
      </span>
    );
  }
  const s = STATUS_STYLES[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

const INITIAL: CheckResult[] = [
  { label: 'Jira API credentials', status: 'checking', detail: '' },
  { label: 'Jira project connection', status: 'checking', detail: '' },
  { label: 'sync_connections table', status: 'checking', detail: '' },
  { label: 'sync_events table', status: 'checking', detail: '' },
  { label: 'pg_cron processor job', status: 'checking', detail: '' },
  { label: 'rh_import_jira_versions RPC', status: 'checking', detail: '' },
  { label: 'jira-webhook-receiver edge function', status: 'checking', detail: '' },
];

export default function SyncPrerequisitesPage() {
  const [checks, setChecks] = useState<CheckResult[]>(INITIAL);
  const [running, setRunning] = useState(false);

  const update = (idx: number, patch: Partial<CheckResult>) =>
    setChecks(prev => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const runChecks = useCallback(async () => {
    setRunning(true);
    setChecks(INITIAL);

    // CHECK 1 — Jira API credentials
    try {
      const { data, error } = await (supabase as any).from('jira_auth_credentials').select('id, jira_url, created_at').limit(1).maybeSingle();
      if (error) throw error;
      if (data && data.jira_url) {
        update(0, { status: 'pass', detail: data.jira_url });
      } else {
        update(0, { status: 'fail', detail: 'No credentials found' });
      }
    } catch {
      update(0, { status: 'fail', detail: 'Table missing or query error' });
    }

    // CHECK 2 — Jira project connection
    try {
      const { data, error } = await (supabase as any).from('jira_connections').select('id, project_key, project_name').limit(1).maybeSingle();
      if (error) throw error;
      if (data && data.project_key) {
        update(1, { status: 'pass', detail: `${data.project_key}${data.project_name ? ' — ' + data.project_name : ''}` });
      } else {
        update(1, { status: 'fail', detail: 'No connection found' });
      }
    } catch {
      update(1, { status: 'fail', detail: 'Table missing or query error' });
    }

    // CHECK 3 — sync_connections table
    try {
      const { count, error } = await supabase.from('sync_connections').select('id', { count: 'exact', head: true });
      if (error) throw error;
      const n = count ?? 0;
      if (n > 0) {
        update(2, { status: 'pass', detail: `${n} connection${n === 1 ? '' : 's'}` });
      } else {
        update(2, { status: 'warn', detail: 'Table exists, no connections yet' });
      }
    } catch {
      update(2, { status: 'fail', detail: 'Table missing — run migration P0' });
    }

    // CHECK 4 — sync_events table
    try {
      const { count, error } = await supabase.from('sync_events').select('id', { count: 'exact', head: true });
      if (error) throw error;
      update(3, { status: 'pass', detail: `${count ?? 0} total events` });
    } catch {
      update(3, { status: 'fail', detail: 'Table missing or query error' });
    }

    // CHECK 5 — pg_cron jobs
    try {
      const { data, error } = await supabase.rpc('get_cron_sync_jobs' as any);
      if (error) throw error;
      const rows = (data as any[]) || [];
      if (rows.length === 0) {
        update(4, { status: 'fail', detail: 'No sync-related cron jobs found' });
      } else {
        const hasActive = rows.some((r: any) => r.active);
        const detail = rows.map((r: any) => `${r.jobname} (${r.schedule}) ${r.active ? '✓' : '✗'}`).join(' · ');
        update(4, { status: hasActive ? 'pass' : 'warn', detail });
      }
    } catch {
      update(4, { status: 'warn', detail: 'Cannot query cron.job — check permissions' });
    }

    // CHECK 6 — rh_import_jira_versions RPC
    try {
      const { data, error } = await supabase.rpc('check_function_exists' as any, { fn_name: 'rh_import_jira_versions' });
      if (error) throw error;
      if (data) {
        update(5, { status: 'pass', detail: 'RPC function deployed' });
      } else {
        update(5, { status: 'fail', detail: 'RPC function not deployed' });
      }
    } catch {
      // Fallback: try calling it with dry params
      update(5, { status: 'warn', detail: 'Cannot verify — helper RPC missing' });
    }

    // CHECK 7 — webhook (static)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '[Your Supabase URL]';
    update(6, {
      status: 'warn',
      detail: `Must be verified manually — ${supabaseUrl}/functions/v1/jira-webhook-receiver`,
    });

    setRunning(false);
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-slate-600" />
          <h1 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            Sync Prerequisites
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runChecks}
          disabled={running}
          className="gap-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 outline-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
          Re-run checks
        </Button>
      </div>

      <div className="border border-slate-200 rounded-md bg-white">
        {checks.map((check, idx) => (
          <div
            key={check.label}
            className="flex items-center gap-3 px-4"
            style={{
              height: 48,
              borderBottom: idx < checks.length - 1 ? '0.5px solid #F1F5F9' : 'none',
            }}
          >
            <div className="w-20 flex-shrink-0">
              <StatusPill status={check.status} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-800">{check.label}</span>
              {check.detail && (
                <span className="ml-2 text-xs text-slate-500 truncate">{check.detail}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
