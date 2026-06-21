import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/test-management/useProjects';
import { useNavigate } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import {
  CaseStatus, CycleStatus, RunStatus, DefectStatus, DefectSeverity,
  TMTestCase, TMCycle, TMDefect,
} from '@/types/test-management';

// ── Tab bar ───────────────────────────────────────────────────────────────────

type Tab = 'cases' | 'cycles' | 'defects';

// ── Constants ─────────────────────────────────────────────────────────────────

const RUN_STATUS_COLORS: Record<RunStatus, string> = {
  PASSED:      'var(--ds-background-success-bold, #1F845A)',
  FAILED:      'var(--ds-background-danger-bold, #CA3521)',
  BLOCKED:     'var(--ds-background-warning-bold, #E2B203)',
  IN_PROGRESS: 'var(--ds-background-brand-bold, #0052CC)',
  NOT_RUN:     'var(--ds-background-neutral, #F1F2F4)',
  SKIPPED:     'var(--ds-background-neutral-bold, #626F86)',
};

// ── Main component ────────────────────────────────────────────────────────────

export default function MyWorkPage() {
  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id;
  const [tab, setTab] = useState<Tab>('cases');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'var(--ds-font-family-body)', paddingTop: 16 }}>
      <ProjectPageHeader hubType="testhub" />
      <div style={{ padding: '0 24px 0' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--ds-border, #DFE1E6)' }}>
          {(['cases', 'cycles', 'defects'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 16px', border: 'none', cursor: 'pointer',
                background: 'transparent', fontSize: 13, fontWeight: 500,
                color: tab === t ? 'var(--ds-text-brand, #0052CC)' : 'var(--ds-text-subtle, #42526E)',
                borderBottom: tab === t ? '2px solid var(--ds-border-brand, #0052CC)' : '2px solid transparent',
                marginBottom: -2,
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {!userId || !projectId ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner size="large" />
          </div>
        ) : tab === 'cases' ? (
          <MyCasesTab projectId={projectId} userId={userId} />
        ) : tab === 'cycles' ? (
          <MyCyclesTab projectId={projectId} userId={userId} />
        ) : (
          <MyDefectsTab projectId={projectId} userId={userId} />
        )}
      </div>
    </div>
  );
}

// ── Cases tab ─────────────────────────────────────────────────────────────────

function MyCasesTab({ projectId, userId }: { projectId: string; userId: string }) {
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['my-cases', projectId, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_test_cases')
        .select(`
          id, key, title, status, priority_id, created_at, updated_at, assigned_to,
          priority_ref:tm_case_priorities(name, color)
        `)
        .eq('project_id', projectId)
        .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
        .order('updated_at', { ascending: false })
        .limit(100);
      return (data ?? []) as unknown as TMTestCase[];
    },
    enabled: !!projectId && !!userId,
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" /></div>;
  if (cases.length === 0) return <EmptyState message="No test cases found assigned to or created by you." />;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
      <thead>
        <tr style={{ borderBottom: '2px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface-sunken, #F7F8F9)' }}>
          <th style={TH}>Key</th>
          <th style={TH}>Title</th>
          <th style={TH}>Status</th>
          <th style={TH}>Priority</th>
        </tr>
      </thead>
      <tbody>
        {cases.map(c => (
          <tr key={c.id} style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
            <td style={{ ...TD, fontFamily: 'var(--ds-font-family-code)', fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', whiteSpace: 'nowrap' }}>
              {c.key ?? '—'}
            </td>
            <td style={{ ...TD, color: 'var(--ds-text, #172B4D)', fontWeight: 500 }}>{c.title}</td>
            <td style={TD}><CaseStatusPill status={c.status} /></td>
            <td style={TD}>
              {c.priority_ref ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.priority_ref.color ?? 'var(--ds-background-neutral, #F1F2F4)', flexShrink: 0 }} />
                  {c.priority_ref.name}
                </span>
              ) : (
                <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Cycles tab ────────────────────────────────────────────────────────────────

interface CycleWithCounts {
  cycle: { id: string; key: string; name: string; status: CycleStatus; planned_start_date?: string; planned_end_date?: string };
  overall: Record<RunStatus, number>;
  mine: Record<RunStatus, number>;
  overallTotal: number;
  mineTotal: number;
}

function MyCyclesTab({ projectId, userId }: { projectId: string; userId: string }) {
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery<CycleWithCounts[]>({
    queryKey: ['my-cycles', projectId, userId],
    queryFn: async () => {
      // Load cycles + their scope items together
      const { data: cycles } = await supabase
        .from('tm_cycles')
        .select('id, key, name, status, planned_start_date, planned_end_date')
        .eq('project_id', projectId)
        .in('status', ['IN_PROGRESS', 'PLANNED'])
        .order('created_at', { ascending: false });

      if (!cycles || cycles.length === 0) return [];

      const cycleIds = cycles.map(c => c.id);

      const { data: scope } = await supabase
        .from('tm_cycle_scope')
        .select('cycle_id, status, assigned_to')
        .in('cycle_id', cycleIds);

      const items = scope ?? [];

      const zero: Record<RunStatus, number> = { PASSED: 0, FAILED: 0, BLOCKED: 0, IN_PROGRESS: 0, NOT_RUN: 0, SKIPPED: 0 };

      return cycles.map(cycle => {
        const cycleItems = items.filter(i => i.cycle_id === cycle.id);
        const overall: Record<RunStatus, number> = { ...zero };
        const mine: Record<RunStatus, number> = { ...zero };

        for (const item of cycleItems) {
          const s = (item.status ?? 'NOT_RUN') as RunStatus;
          overall[s] = (overall[s] ?? 0) + 1;
          if (item.assigned_to === userId) {
            mine[s] = (mine[s] ?? 0) + 1;
          }
        }

        return {
          cycle: cycle as CycleWithCounts['cycle'],
          overall,
          mine,
          overallTotal: cycleItems.length,
          mineTotal: cycleItems.filter(i => i.assigned_to === userId).length,
        };
      }).filter(r => r.mineTotal > 0 || r.overallTotal > 0);
    },
    enabled: !!projectId && !!userId,
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" /></div>;
  if (rows.length === 0) return <EmptyState message="No active cycles found for this project." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {rows.map(({ cycle, overall, mine, overallTotal, mineTotal }) => (
        <div
          key={cycle.id}
          style={{
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 8,
            padding: '16px 20px',
            background: 'var(--ds-surface, #FFFFFF)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <button
                onClick={() => navigate(`/testhub/cycles/${cycle.id}`)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 15, fontWeight: 600, color: 'var(--ds-link, #0052CC)',
                  textAlign: 'left',
                }}
              >
                {cycle.key} — {cycle.name}
              </button>
              <div style={{ marginTop: 4, display: 'flex', gap: 12, fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                <CycleStatusPill status={cycle.status} />
                {cycle.planned_start_date && <span>Start: {fmtDate(cycle.planned_start_date)}</span>}
                {cycle.planned_end_date && <span>End: {fmtDate(cycle.planned_end_date)}</span>}
              </div>
            </div>
            <button
              onClick={() => navigate(`/testhub/cycles/${cycle.id}/execute`)}
              style={{
                fontSize: 12, padding: '4px 12px',
                background: 'var(--ds-background-brand-bold, #0052CC)',
                color: '#FFFFFF', border: 'none', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Execute
            </button>
          </div>

          {/* Overall progress */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4 }}>
              Overall ({overallTotal} cases)
            </div>
            <ProgressBar counts={overall} total={overallTotal} />
          </div>

          {/* Assigned-to-me progress */}
          {mineTotal > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4 }}>
                Assigned to me ({mineTotal} cases)
              </div>
              <ProgressBar counts={mine} total={mineTotal} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Defects tab ───────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<DefectSeverity, string> = {
  CRITICAL: 'var(--ds-background-danger-bold, #CA3521)',
  MAJOR:    'var(--ds-background-warning-bold, #E2B203)',
  MINOR:    'var(--ds-background-information-bold, #0055CC)',
  TRIVIAL:  'var(--ds-background-neutral-bold, #626F86)',
};

function MyDefectsTab({ projectId, userId }: { projectId: string; userId: string }) {
  const { data: defects = [], isLoading } = useQuery({
    queryKey: ['my-defects', projectId, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_defects')
        .select('id, key, title, severity, status, created_at')
        .eq('project_id', projectId)
        .or(`reported_by.eq.${userId},assigned_to.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(100);
      return (data ?? []) as TMDefect[];
    },
    enabled: !!projectId && !!userId,
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" /></div>;
  if (defects.length === 0) return <EmptyState message="No defects reported by or assigned to you." />;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
      <thead>
        <tr style={{ borderBottom: '2px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface-sunken, #F7F8F9)' }}>
          <th style={TH}>Key</th>
          <th style={TH}>Title</th>
          <th style={TH}>Severity</th>
          <th style={TH}>Status</th>
          <th style={TH}>Created</th>
        </tr>
      </thead>
      <tbody>
        {defects.map(d => (
          <tr key={d.id} style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
            <td style={{ ...TD, fontFamily: 'var(--ds-font-family-code)', fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', whiteSpace: 'nowrap' }}>
              {d.key ?? '—'}
            </td>
            <td style={{ ...TD, color: 'var(--ds-text, #172B4D)', fontWeight: 500 }}>{d.title}</td>
            <td style={TD}>
              <SeverityPill severity={d.severity} />
            </td>
            <td style={TD}><DefectStatusPill status={d.status} /></td>
            <td style={{ ...TD, color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 12 }}>{fmtDate(d.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

const STATUS_ORDER: RunStatus[] = ['PASSED', 'FAILED', 'BLOCKED', 'IN_PROGRESS', 'NOT_RUN', 'SKIPPED'];

function ProgressBar({ counts, total }: { counts: Record<RunStatus, number>; total: number }) {
  if (total === 0) return <div style={{ height: 8, background: 'var(--ds-background-neutral, #F1F2F4)', borderRadius: 4 }} />;

  return (
    <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
      {STATUS_ORDER.map(s => {
        const n = counts[s] ?? 0;
        if (!n) return null;
        const pct = (n / total) * 100;
        return (
          <div
            key={s}
            title={`${s.replace('_', ' ')}: ${n}`}
            style={{ width: `${pct}%`, background: RUN_STATUS_COLORS[s] }}
          />
        );
      })}
    </div>
  );
}

// ── Pill / status helpers ─────────────────────────────────────────────────────

function CaseStatusPill({ status }: { status: CaseStatus }) {
  const map: Record<CaseStatus, { appearance: 'success' | 'moved' | 'removed' | 'inprogress' | 'default'; label: string }> = {
    APPROVED:   { appearance: 'success',   label: 'Approved' },
    REVIEW:     { appearance: 'moved',     label: 'Review' },
    DEPRECATED: { appearance: 'removed',   label: 'Deprecated' },
    DRAFT:      { appearance: 'default',   label: 'Draft' },
  };
  const cfg = map[status] ?? { appearance: 'default' as const, label: status };
  return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
}

function CycleStatusPill({ status }: { status: CycleStatus }) {
  const map: Record<CycleStatus, { appearance: 'success' | 'moved' | 'removed' | 'inprogress' | 'default'; label: string }> = {
    COMPLETED:   { appearance: 'success',    label: 'Completed' },
    IN_PROGRESS: { appearance: 'inprogress', label: 'In progress' },
    PLANNED:     { appearance: 'default',    label: 'Planned' },
    CANCELLED:   { appearance: 'removed',    label: 'Cancelled' },
  };
  const cfg = map[status] ?? { appearance: 'default' as const, label: status };
  return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
}

function DefectStatusPill({ status }: { status: DefectStatus }) {
  const map: Record<DefectStatus, { appearance: 'success' | 'moved' | 'removed' | 'inprogress' | 'default'; label: string }> = {
    OPEN:        { appearance: 'removed',    label: 'Open' },
    IN_PROGRESS: { appearance: 'inprogress', label: 'In progress' },
    FIXED:       { appearance: 'moved',      label: 'Fixed' },
    VERIFIED:    { appearance: 'success',    label: 'Verified' },
    CLOSED:      { appearance: 'success',    label: 'Closed' },
    WONT_FIX:    { appearance: 'default',    label: "Won't fix" },
    DUPLICATE:   { appearance: 'default',    label: 'Duplicate' },
  };
  const cfg = map[status] ?? { appearance: 'default' as const, label: status };
  return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
}

function SeverityPill({ severity }: { severity: DefectSeverity }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12,
      fontSize: 11, fontWeight: 500, color: '#FFFFFF',
      background: SEVERITY_COLORS[severity] ?? 'var(--ds-background-neutral-bold, #626F86)',
    }}>
      {severity.charAt(0) + severity.slice(1).toLowerCase()}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14 }}>
      {message}
    </div>
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left',
  fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)',
};
const TD: React.CSSProperties = { padding: '10px 12px' };
