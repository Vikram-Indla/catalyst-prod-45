/**
 * ThemeDetailDrawer — Right-side slide-in panel with 6 tabs
 */
import { useEffect } from 'react';
import { X, Target, Zap, DollarSign, Milestone, Activity } from 'lucide-react';
import { useState } from 'react';
import type { StrategicTheme } from '@/types/strategic-themes';
import {
  STATUS_CONFIG, BSC_CONFIG, PRIORITY_CONFIG,
  deriveHealthStatus, formatBudget, getInitials, getAvatarColor,
} from './theme-utils';

interface Props {
  theme: StrategicTheme | null;
  open: boolean;
  onClose: () => void;
}

const TABS = ['Overview', 'Goals & KRs', 'Initiatives', 'Financials', 'Milestones', 'Activity'] as const;
type Tab = typeof TABS[number];

export function ThemeDetailDrawer({ theme, open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('Overview');

  useEffect(() => {
    if (open) setTab('Overview');
  }, [open, theme?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!theme) return null;

  const health = deriveHealthStatus(theme);
  const sc = STATUS_CONFIG[health];
  const bsc = theme.bsc_perspective ? BSC_CONFIG[theme.bsc_perspective] : null;
  const pri = theme.priority ? PRIORITY_CONFIG[theme.priority] : null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(15, 23, 42, 0.3)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 200ms',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
          width: 560, background: '#FFFFFF',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 rounded-full" style={{ width: 12, height: 12, background: theme.color }} />
            <h2 className="truncate" style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>{theme.title}</h2>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-md p-1 hover:bg-gray-100" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={18} color="#64748B" />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b overflow-x-auto" style={{ borderColor: '#E2E8F0', padding: '0 20px' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontSize: 12, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? '#2563EB' : '#64748B',
                padding: '10px 12px', border: 'none', background: 'none',
                borderBottom: tab === t ? '2px solid #2563EB' : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >{t}</button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
          {tab === 'Overview' && <OverviewTab theme={theme} sc={sc} bsc={bsc} pri={pri} />}
          {tab === 'Goals & KRs' && <GoalsTab theme={theme} />}
          {tab === 'Initiatives' && <InitiativesTab theme={theme} />}
          {tab === 'Financials' && <FinancialsTab theme={theme} />}
          {tab === 'Milestones' && <MilestonesTab theme={theme} />}
          {tab === 'Activity' && <ActivityTab theme={theme} />}
        </div>
      </div>
    </>
  );
}

// ═══ TAB COMPONENTS ═══

function KpiCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg border text-center" style={{ borderColor: '#E2E8F0', padding: '12px 8px' }}>
      <p style={{ fontSize: 20, fontWeight: 700, color: color || '#0F172A', marginBottom: 2 }}>{value}</p>
      <p style={{ fontSize: 11, color: '#64748B' }}>{label}</p>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2" style={{ padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
      <span className="shrink-0" style={{ width: 120, fontSize: 11, fontWeight: 500, color: '#64748B' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#0F172A', flex: 1 }}>{value || <span style={{ color: '#94A3B8' }}>—</span>}</span>
    </div>
  );
}

function OverviewTab({ theme, sc, bsc, pri }: { theme: StrategicTheme; sc: any; bsc: any; pri: any }) {
  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KpiCard label="Progress" value={`${theme.progress_pct}%`} />
        <KpiCard label="Goals" value={theme.goal_count} />
        <KpiCard label="Key Results" value={theme.kr_count} />
      </div>

      {/* AI Health Score */}
      {theme.ai_health_score !== null && (
        <div className="rounded-xl mb-5 overflow-hidden" style={{
          background: 'linear-gradient(135deg, #EDE9FE, #F5F3FF)',
          border: '1px solid #DDD6FE', padding: 16,
        }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center rounded px-1.5 py-0.5" style={{ fontSize: 10, fontWeight: 700, background: '#7C3AED', color: '#FFFFFF' }}>AI</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#5B21B6' }}>Strategy Health Score</span>
          </div>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#7C3AED', marginBottom: 8 }}>{theme.ai_health_score}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'OKR', value: Math.round(theme.ai_health_score * 0.9) },
              { label: 'Velocity', value: Math.round(theme.ai_health_score * 1.05) },
              { label: 'Alignment', value: Math.round(theme.ai_health_score * 0.85) },
            ].map(f => (
              <div key={f.label} className="rounded-md text-center" style={{ background: 'rgba(255,255,255,0.6)', padding: '6px 0' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#5B21B6' }}>{Math.min(f.value, 100)}</p>
                <p style={{ fontSize: 10, color: '#7C3AED' }}>{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field grid */}
      <div className="grid grid-cols-2 gap-x-4">
        <FieldRow label="Vision" value={theme.vision_statement} />
        <FieldRow label="Owner" value={theme.owner_name} />
        <FieldRow label="Fiscal Year" value={`FY${theme.fiscal_year}`} />
        <FieldRow label="Date Range" value={theme.start_date && theme.target_completion ? `${theme.start_date} → ${theme.target_completion}` : null} />
        <FieldRow label="BSC Perspective" value={bsc?.label} />
        <FieldRow label="Priority" value={pri ? <span style={{ color: pri.color, fontWeight: 600 }}>{pri.label}</span> : null} />
        <FieldRow label="Budget (SAR)" value={formatBudget(theme.planned_budget)} />
        <FieldRow label="Theme Group" value={theme.theme_group_name} />
        <FieldRow label="Milestones" value={theme.milestone_count} />
        <FieldRow label="Process Step" value={theme.process_step} />
      </div>
    </div>
  );
}

function GoalsTab({ theme }: { theme: StrategicTheme }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Goals ({theme.goal_count})</h3>
        <button style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Add Goal</button>
      </div>
      {theme.goal_count === 0 ? (
        <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 32 }}>No goals linked to this theme yet.</p>
      ) : (
        <p style={{ fontSize: 12, color: '#64748B', textAlign: 'center', padding: 32 }}>
          {theme.goal_count} goals with {theme.kr_count} key results. Detailed view coming in Stage D.
        </p>
      )}
    </div>
  );
}

function InitiativesTab({ theme }: { theme: StrategicTheme }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Linked Initiatives ({theme.initiative_count})</h3>
        <button style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Link Initiative</button>
      </div>
      {theme.initiative_count === 0 ? (
        <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 32 }}>No initiatives linked yet.</p>
      ) : (
        <p style={{ fontSize: 12, color: '#64748B', textAlign: 'center', padding: 32 }}>
          {theme.initiative_count} initiatives linked. Detailed view coming in Stage D.
        </p>
      )}
    </div>
  );
}

function FinancialsTab({ theme }: { theme: StrategicTheme }) {
  const allocated = theme.budget_allocated || 0;
  const spent = theme.budget_spent || 0;
  const remaining = allocated > 0 ? Math.round(((allocated - spent) / allocated) * 100) : 0;
  const utilization = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KpiCard label="Allocated" value={formatBudget(allocated)} />
        <KpiCard label="Spent" value={formatBudget(spent)} />
        <KpiCard label="Remaining" value={`${remaining}%`} color={remaining < 20 ? '#DC2626' : undefined} />
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontSize: 11, color: '#64748B' }}>Budget Utilization</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{utilization}%</span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 8, background: '#E2E8F0' }}>
          <div className="h-full rounded-full" style={{
            width: `${Math.min(utilization, 100)}%`,
            background: utilization > 90 ? '#DC2626' : utilization > 70 ? '#D97706' : '#2563EB',
          }} />
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#64748B', marginTop: 12 }}>
        Planned budget: <strong>{formatBudget(theme.planned_budget)}</strong> SAR for FY{theme.fiscal_year}.
      </p>
    </div>
  );
}

function MilestonesTab({ theme }: { theme: StrategicTheme }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Milestones ({theme.milestone_count} / 20)</h3>
        <button style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Add Milestone</button>
      </div>
      {theme.milestone_count === 0 ? (
        <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 32 }}>No milestones added yet.</p>
      ) : (
        <p style={{ fontSize: 12, color: '#64748B', textAlign: 'center', padding: 32 }}>
          {theme.milestone_count} milestones. Detailed view coming in Stage D.
        </p>
      )}
    </div>
  );
}

function ActivityTab({ theme }: { theme: StrategicTheme }) {
  const activities = [
    { color: '#2563EB', text: 'Theme created', time: theme.created_at },
    { color: '#16A34A', text: 'Last updated', time: theme.updated_at },
  ];

  return (
    <div>
      {activities.map((a, i) => (
        <div key={i} className="flex items-start gap-2.5" style={{ padding: '10px 0', borderBottom: '1px solid #F8FAFC' }}>
          <div className="shrink-0 rounded-full mt-0.5" style={{ width: 8, height: 8, background: a.color }} />
          <div>
            <p style={{ fontSize: 12, color: '#0F172A' }}>{a.text}</p>
            <p style={{ fontSize: 10, color: '#94A3B8' }}>{new Date(a.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
