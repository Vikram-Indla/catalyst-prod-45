/**
 * ThemeDetailDrawer — 560px right-side overlay with 6 tabs
 * Fixes: Financials uses planned_budget, enhanced empty states, activity tab, Linear badges
 * Dark mode: uses isDark prop for Nocturne surface (#1A1A1A)
 */
import { useEffect, useState } from 'react';
import { X, Pencil, Trash2, Plus, Loader2, Target, Rocket, Flag, Clock } from 'lucide-react';
import type { StrategicTheme, ThemeMilestone } from '@/types/strategic-themes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone,
  useGoalsForTheme, useInitiativesForTheme,
} from '@/hooks/use-strategic-themes';
import {
  STATUS_CONFIG, STATUS_CONFIG_DARK, BSC_CONFIG, PRIORITY_CONFIG,
  deriveHealthStatus, formatBudget, getInitials, getAvatarColor, formatDate, capitalize,
  formatRelativeTime, getProgressColor, DK,
} from './theme-utils';

interface Props {
  theme: StrategicTheme | null;
  open: boolean;
  onClose: () => void;
  onEdit: (theme: StrategicTheme) => void;
  onDelete: (theme: StrategicTheme) => void;
  isDark?: boolean;
}

const TABS = ['Overview', 'Goals & KRs', 'Initiatives', 'Financials', 'Milestones', 'Activity'] as const;
type Tab = typeof TABS[number];

export function ThemeDetailDrawer({ theme, open, onClose, onEdit, onDelete, isDark = false }: Props) {
  const [tab, setTab] = useState<Tab>('Overview');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) { setTab('Overview'); setConfirmDelete(false); }
  }, [open, theme?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!theme) return null;

  const health = deriveHealthStatus(theme);
  const sc = isDark ? STATUS_CONFIG_DARK[health] : STATUS_CONFIG[health];
  const bsc = theme.bsc_perspective ? BSC_CONFIG[theme.bsc_perspective] : null;
  const pri = theme.priority ? PRIORITY_CONFIG[theme.priority] : null;

  // Dark palette shortcuts
  const bg = isDark ? '#1A1A1A' : 'var(--bg-app)';
  const t1 = isDark ? DK.t1 : 'var(--fg-1)';
  const t2 = isDark ? DK.t2 : 'var(--fg-3)';
  const t3 = isDark ? DK.t3 : 'var(--fg-4)';
  const border = isDark ? 'rgba(255,255,255,0.10)' : 'var(--divider)';
  const borderSubtle = isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-1)';
  const hoverBg = isDark ? 'rgba(255,255,255,0.05)' : 'var(--bg-1)';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'var(--bg-1)';
  const linkBlue = isDark ? '#60A5FA' : 'var(--cp-blue)';

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(15, 23, 42, 0.3)',
          }}
        />
      )}

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 210,
          width: 560, maxWidth: '90vw', background: bg,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', flexDirection: 'column',
          boxShadow: isDark ? '-4px 0 20px rgba(0,0,0,0.3)' : '-4px 0 20px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 shrink-0" style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
          <div className="shrink-0 rounded-full" style={{ width: 12, height: 12, background: theme.color }} />
          <h2 className="truncate flex-1" style={{ fontSize: 16, fontWeight: 700, color: t1 }}>{theme.title}</h2>
          <button onClick={() => onEdit(theme)} style={{ fontSize: 12, color: linkBlue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Edit</button>
          <button onClick={() => setConfirmDelete(true)} style={{ fontSize: 12, color: isDark ? '#F87171' : 'var(--sem-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Delete</button>
          <button onClick={onClose} className="flex items-center justify-center rounded" style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={18} color={t3} />
          </button>
        </div>

        {/* Delete Confirmation */}
        {confirmDelete && (
          <div style={{ padding: '12px 20px', background: isDark ? 'rgba(220,38,38,0.12)' : 'rgba(248,113,113,0.06)', borderBottom: `1px solid ${isDark ? 'rgba(220,38,38,0.25)' : '#FECACA'}` }}>
            <p style={{ fontSize: 12, color: isDark ? '#FCA5A5' : '#F87171', marginBottom: 8 }}>Delete "<strong>{theme.title}</strong>"? This will also remove all milestones and links.</p>
            <div className="flex gap-2">
              <button onClick={() => { onDelete(theme); setConfirmDelete(false); }} style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 4, border: 'none', background: 'var(--sem-danger)', color: '#FFF', cursor: 'pointer' }}>Delete</button>
              <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 4, border: `1px solid ${border}`, background: isDark ? 'transparent' : 'var(--bg-app)', color: isDark ? DK.t1 : 'var(--fg-2)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="shrink-0 flex overflow-x-auto" style={{ borderBottom: `1px solid ${border}`, padding: '0 20px' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontSize: 12, fontWeight: tab === t ? 600 : 500,
                color: tab === t ? 'var(--cp-blue)' : (isDark ? DK.t3 : 'var(--fg-3)'),
                padding: '10px 12px', border: 'none', background: 'none',
                borderBottom: tab === t ? '2px solid var(--cp-blue)' : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >{t}</button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
          {tab === 'Overview' && <OverviewTab theme={theme} sc={sc} bsc={bsc} pri={pri} isDark={isDark} />}
          {tab === 'Goals & KRs' && <GoalsTab theme={theme} isDark={isDark} />}
          {tab === 'Initiatives' && <InitiativesTab theme={theme} isDark={isDark} />}
          {tab === 'Financials' && <FinancialsTab theme={theme} isDark={isDark} />}
          {tab === 'Milestones' && <MilestonesTab theme={theme} isDark={isDark} />}
          {tab === 'Activity' && <ActivityTab theme={theme} isDark={isDark} />}
        </div>
      </div>
    </>
  );
}

// ═══ DARK HELPERS ═══
function dk(isDark: boolean) {
  return {
    t1: isDark ? DK.t1 : 'var(--fg-1)',
    t2: isDark ? DK.t2 : 'var(--fg-3)',
    t3: isDark ? DK.t3 : 'var(--fg-4)',
    border: isDark ? 'rgba(255,255,255,0.10)' : 'var(--divider)',
    borderSubtle: isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-1)',
    cardBg: isDark ? 'rgba(255,255,255,0.04)' : 'var(--bg-1)',
    hoverBg: isDark ? 'rgba(255,255,255,0.05)' : 'var(--bg-1)',
    linkBlue: isDark ? '#60A5FA' : 'var(--cp-blue)',
  };
}

// ═══ SHARED ═══
function KpiCard({ label, value, color, isDark = false }: { label: string; value: string | number; color?: string; isDark?: boolean }) {
  const d = dk(isDark);
  return (
    <div className="rounded-lg border text-center" style={{ borderColor: d.border, padding: '12px 8px', background: isDark ? 'transparent' : undefined }}>
      <p style={{ fontSize: 20, fontWeight: 700, color: color || d.t1, marginBottom: 2 }}>{value}</p>
      <p style={{ fontSize: 10, fontWeight: 600, color: d.t3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
    </div>
  );
}

function FieldRow({ label, value, isDark = false }: { label: string; value: React.ReactNode; isDark?: boolean }) {
  const d = dk(isDark);
  return (
    <div className="flex items-start gap-2" style={{ padding: '8px 0', borderBottom: `1px solid ${d.borderSubtle}` }}>
      <span className="shrink-0" style={{ width: 120, fontSize: 10, fontWeight: 600, color: d.t3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: d.t1, flex: 1 }}>{value || <span style={{ color: d.t3 }}>—</span>}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, cta, isDark = false }: { icon: any; title: string; description: string; cta?: string; isDark?: boolean }) {
  const d = dk(isDark);
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ padding: '48px 24px' }}>
      <div className="rounded-xl flex items-center justify-center mb-4" style={{ width: 48, height: 48, background: isDark ? 'rgba(255,255,255,0.06)' : '#1A1A1A' }}>
        <Icon size={22} color={d.t3} strokeWidth={1.5} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: d.t1, marginBottom: 4 }}>{title}</p>
      <p style={{ fontSize: 12, color: d.t3, maxWidth: 280, lineHeight: 1.5 }}>{description}</p>
      {cta && (
        <button style={{ fontSize: 12, fontWeight: 500, color: d.linkBlue, background: 'none', border: 'none', cursor: 'pointer', marginTop: 12 }}>
          + {cta}
        </button>
      )}
    </div>
  );
}

// ═══ OVERVIEW ═══
function OverviewTab({ theme, sc, bsc, pri, isDark = false }: { theme: StrategicTheme; sc: any; bsc: any; pri: any; isDark?: boolean }) {
  const d = dk(isDark);
  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KpiCard label="Progress" value={`${theme.progress_pct}%`} isDark={isDark} />
        <KpiCard label="Goals" value={theme.goal_count} isDark={isDark} />
        <KpiCard label="Key Results" value={theme.kr_count} isDark={isDark} />
      </div>

      {/* AI Health Score Card */}
      {theme.ai_health_score != null && (
        <div className="rounded-lg mb-5 overflow-hidden" style={{
          background: isDark
            ? 'rgba(59, 130, 246, 0.12)'
            : 'linear-gradient(135deg, #DBEAFE, rgba(59,130,246,0.06))',
          border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE'}`,
          padding: 16,
        }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', background: '#3B82F6', color: '#FFFFFF', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AI
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#93C5FD' : '#1D4ED8' }}>Strategy Health Score</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: isDark ? '#60A5FA' : 'var(--cp-blue)', marginBottom: 8 }}>
            {theme.ai_health_score}<span style={{ fontSize: 14, fontWeight: 500, color: d.t3 }}>/100</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'OKR', value: Math.round(theme.ai_health_score * 0.3) },
              { label: 'Velocity', value: Math.round(theme.ai_health_score * 0.25) },
              { label: 'Alignment', value: Math.round(theme.ai_health_score * 0.2) },
            ].map(f => (
              <div key={f.label} className="rounded-md text-center" style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : 'none',
                padding: '6px 0',
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: isDark ? DK.t1 : '#7DB8FC' }}>{f.value}</p>
                <p style={{ fontSize: 10, color: isDark ? DK.t3 : '#2563EB' }}>{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field grid */}
      <div className="grid grid-cols-2 gap-x-4">
        <FieldRow label="Vision" value={theme.vision_statement} isDark={isDark} />
        <FieldRow label="Owner" value={theme.owner_name || 'Unassigned'} isDark={isDark} />
        <FieldRow label="Fiscal Year" value={`FY${theme.fiscal_year}`} isDark={isDark} />
        <FieldRow label="Date Range" value={
          theme.start_date && theme.target_completion
            ? `${formatDate(theme.start_date)} – ${formatDate(theme.target_completion)}`
            : null
        } isDark={isDark} />
        <FieldRow label="BSC Perspective" value={bsc?.label} isDark={isDark} />
        <FieldRow label="Priority" value={pri ? <span style={{ color: isDark ? '#F87171' : pri.color, fontWeight: 600 }}>{pri.label}</span> : null} isDark={isDark} />
        <FieldRow label="Budget (SAR)" value={theme.planned_budget > 0 ? formatBudget(theme.planned_budget) : null} isDark={isDark} />
        <FieldRow label="Theme Group" value={theme.theme_group_name || 'None'} isDark={isDark} />
        <FieldRow label="Milestones" value={`${theme.milestone_count ?? 0} / 20`} isDark={isDark} />
        <FieldRow label="Process Step" value={theme.process_step} isDark={isDark} />
      </div>
    </div>
  );
}

// ═══ GOALS & KRS ═══
function GoalsTab({ theme, isDark = false }: { theme: StrategicTheme; isDark?: boolean }) {
  const { data: goals = [], isLoading } = useGoalsForTheme(theme.id);
  const d = dk(isDark);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontSize: 13, fontWeight: 600, color: d.t1 }}>Goals ({goals.length})</h3>
        <button style={{ fontSize: 12, color: d.linkBlue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Add Goal</button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" color={d.t3} /></div>
      ) : goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals linked yet" description="Goals define measurable objectives under this theme. Add your first goal to start tracking progress." cta="Add Goal" isDark={isDark} />
      ) : (
        <div className="space-y-2">
          {goals.map((g: any) => {
            const statusColor = g.status === 'completed' ? 'var(--sem-success)' : g.status === 'at_risk' ? 'var(--sem-warning)' : 'var(--cp-blue)';
            return (
              <div key={g.id} className="rounded-lg border p-3" style={{ borderColor: d.border, background: isDark ? 'transparent' : undefined }}>
                <div className="flex items-start justify-between mb-2">
                  <span style={{ fontSize: 12, fontWeight: 600, color: d.t1 }}>{g.title}</span>
                  <span className="inline-flex rounded-full px-2 py-0.5 shrink-0 ml-2" style={{ fontSize: 10, fontWeight: 500, background: statusColor + (isDark ? '25' : '18'), color: isDark ? statusColor + 'CC' : statusColor }}>{g.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: isDark ? 'rgba(255,255,255,0.12)' : 'var(--divider)' }}>
                    <div className="h-full rounded-full" style={{ width: `${g.progress_pct}%`, background: statusColor }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: d.t2 }}>{g.progress_pct}%</span>
                  <span className="rounded px-1.5 py-0.5" style={{ fontSize: 9, fontWeight: 500, background: isDark ? 'rgba(255,255,255,0.06)' : '#1A1A1A', color: d.t2 }}>{g.kr_count} KRs</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══ INITIATIVES ═══
function InitiativesTab({ theme, isDark = false }: { theme: StrategicTheme; isDark?: boolean }) {
  const { data: initiatives = [], isLoading } = useInitiativesForTheme(theme.id);
  const d = dk(isDark);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontSize: 13, fontWeight: 600, color: d.t1 }}>Linked Initiatives ({initiatives.length})</h3>
        <button style={{ fontSize: 12, color: d.linkBlue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Link Initiative</button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" color={d.t3} /></div>
      ) : initiatives.length === 0 ? (
        <EmptyState icon={Rocket} title="No initiatives linked" description="Initiatives are actionable projects that contribute to this theme's goals. Link an initiative to connect execution to strategy." cta="Link Initiative" isDark={isDark} />
      ) : (
        <div className="space-y-2">
          {initiatives.map((ini: any) => (
            <div key={ini.id} className="rounded-lg border p-3" style={{ borderColor: d.border, background: isDark ? 'transparent' : undefined }}>
              <div className="flex items-start justify-between mb-1">
                <span style={{ fontSize: 12, fontWeight: 600, color: d.t1 }}>{ini.title}</span>
                <span className="inline-flex rounded-full px-2 py-0.5 shrink-0 ml-2" style={{ fontSize: 10, fontWeight: 500, background: isDark ? 'rgba(255,255,255,0.06)' : '#1A1A1A', color: d.t2 }}>{ini.status}</span>
              </div>
              <div className="flex items-center gap-3" style={{ fontSize: 10, color: d.t2 }}>
                <span>Budget: {formatBudget(ini.budget_allocated)}</span>
                <span>Spent: {formatBudget(ini.budget_spent)}</span>
                <span>Progress: {ini.progress_pct}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ FINANCIALS ═══
function FinancialsTab({ theme, isDark = false }: { theme: StrategicTheme; isDark?: boolean }) {
  const d = dk(isDark);
  const allocated = theme.planned_budget || 0;
  const spent = theme.budget_spent || 0;
  const remainingPct = allocated > 0 ? Math.round(((allocated - spent) / allocated) * 100) : 0;
  const utilization = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KpiCard label="Allocated" value={formatBudget(allocated)} isDark={isDark} />
        <KpiCard label="Spent" value={formatBudget(spent)} isDark={isDark} />
        <KpiCard label="Remaining" value={`${remainingPct}%`} color={remainingPct < 20 ? 'var(--sem-danger)' : '#059669'} isDark={isDark} />
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontSize: 11, color: d.t2 }}>Budget Utilization</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: d.t1 }}>{utilization}%</span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 8, background: isDark ? 'rgba(255,255,255,0.12)' : 'var(--divider)' }}>
          {utilization > 0 && (
            <div className="h-full rounded-full" style={{
              width: `${Math.min(utilization, 100)}%`,
              background: utilization > 90 ? 'var(--sem-danger)' : utilization > 70 ? 'var(--sem-warning)' : 'var(--cp-blue)',
            }} />
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: d.t2, marginTop: 12 }}>
        Planned budget: <strong style={{ color: d.t1 }}>{formatBudget(theme.planned_budget)}</strong> SAR for FY{theme.fiscal_year}.
      </p>
    </div>
  );
}

// ═══ MILESTONES ═══
const MILESTONE_CATEGORIES = ['discover', 'define', 'design', 'deliver'] as const;
const MILESTONE_STATES = ['not_started', 'in_progress', 'completed', 'missed'] as const;
const STATE_COLORS: Record<string, string> = { not_started: 'rgba(237,237,237,0.40)', in_progress: '#2563EB', completed: '#16A34A', missed: '#DC2626' };

function MilestonesTab({ theme, isDark = false }: { theme: StrategicTheme; isDark?: boolean }) {
  const d = dk(isDark);
  const { data: milestones = [], isLoading } = useMilestones(theme.id);
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', category: 'deliver' as string, state: 'not_started' as string, due_date: '' });

  const resetForm = () => { setFormData({ name: '', category: 'deliver', state: 'not_started', due_date: '' }); setShowForm(false); setEditingId(null); };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    if (editingId) {
      updateMilestone.mutate({ id: editingId, themeId: theme.id, updates: { name: formData.name, category: formData.category as any, state: formData.state as any, due_date: formData.due_date || null } });
    } else {
      createMilestone.mutate({ theme_id: theme.id, name: formData.name, category: formData.category as any, state: formData.state as any, due_date: formData.due_date || null, sort_order: milestones.length });
    }
    resetForm();
  };

  const startEdit = (m: ThemeMilestone) => {
    setEditingId(m.id);
    setFormData({ name: m.name, category: m.category, state: m.state, due_date: m.due_date || '' });
    setShowForm(true);
  };

  const inputStyle: React.CSSProperties = {
    fontSize: 12, padding: '6px 8px', borderRadius: 4, outline: 'none', width: '100%',
    border: `1px solid ${d.border}`,
    background: isDark ? 'transparent' : 'var(--bg-app)',
    color: d.t1,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontSize: 13, fontWeight: 600, color: d.t1 }}>Milestones ({milestones.length} / 20)</h3>
        <button onClick={() => { resetForm(); setShowForm(true); }} disabled={milestones.length >= 20} style={{ fontSize: 12, color: milestones.length >= 20 ? d.t3 : d.linkBlue, background: 'none', border: 'none', cursor: milestones.length >= 20 ? 'default' : 'pointer', fontWeight: 500 }}>+ Add Milestone</button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-3 mb-3" style={{ borderColor: isDark ? 'rgba(59,130,246,0.25)' : '#DBEAFE', background: isDark ? 'rgba(59,130,246,0.06)' : 'var(--bg-1)' }}>
          <div className="space-y-2">
            <input style={inputStyle} placeholder="Milestone name *" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} autoFocus />
            <div className="grid grid-cols-3 gap-2">
              <Select value={formData.category} onValueChange={v => setFormData(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[9999]">
                  {MILESTONE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={formData.state} onValueChange={v => setFormData(f => ({ ...f, state: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[9999]">
                  {MILESTONE_STATES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
              <input type="date" style={inputStyle} value={formData.due_date} onChange={e => setFormData(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={!formData.name.trim()} style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 4, border: 'none', background: formData.name.trim() ? 'var(--cp-blue)' : d.t3, color: '#FFF', cursor: formData.name.trim() ? 'pointer' : 'default' }}>{editingId ? 'Update' : 'Add'}</button>
              <button onClick={resetForm} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 4, border: `1px solid ${d.border}`, background: isDark ? 'transparent' : 'var(--bg-app)', color: d.t1, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" color={d.t3} /></div>
      ) : milestones.length === 0 && !showForm ? (
        <EmptyState icon={Flag} title="No milestones added yet" description="Milestones mark key checkpoints in your theme's timeline. Add milestones to track progress toward completion." cta="Add Milestone" isDark={isDark} />
      ) : (
        <div className="space-y-1">
          {milestones.map(m => (
            <div key={m.id} className="flex items-center gap-2 rounded-md px-2 group" style={{ height: 50, borderBottom: `1px solid ${d.borderSubtle}` }}
              onMouseEnter={e => (e.currentTarget.style.background = d.hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: STATE_COLORS[m.state] || d.t3 }} />
              <span className="flex-1 truncate" style={{ fontSize: 12, fontWeight: 500, color: d.t1 }}>{m.name}</span>
              <span className="shrink-0 rounded px-1.5 py-0.5" style={{ fontSize: 9, background: isDark ? 'rgba(255,255,255,0.06)' : '#1A1A1A', color: d.t2 }}>{m.category}</span>
              <span className="shrink-0" style={{ fontSize: 10, color: d.t3 }}>{m.state.replace(/_/g, ' ')}</span>
              <button onClick={() => startEdit(m)} className="opacity-0 group-hover:opacity-100 p-0.5" style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Pencil size={12} color={d.t2} /></button>
              <button onClick={() => deleteMilestone.mutate({ id: m.id, themeId: theme.id })} className="opacity-0 group-hover:opacity-100 p-0.5" style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={12} color="#DC2626" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ ACTIVITY ═══
function ActivityTab({ theme, isDark = false }: { theme: StrategicTheme; isDark?: boolean }) {
  const d = dk(isDark);
  const activities = [
    {
      color: '#2563EB',
      title: 'Theme created',
      detail: `Created by ${theme.owner_name || 'System'}`,
      time: theme.created_at,
    },
    ...(theme.updated_at !== theme.created_at ? [{
      color: '#16A34A',
      title: 'Last updated',
      detail: 'Theme details modified',
      time: theme.updated_at,
    }] : []),
  ];

  return (
    <div>
      {activities.length === 0 ? (
        <EmptyState icon={Clock} title="No activity yet" description="Activity events will appear here as this theme is updated." isDark={isDark} />
      ) : (
        <div className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2" style={{ width: 2, background: isDark ? 'rgba(255,255,255,0.10)' : 'var(--divider)' }} />
          {activities.map((a, i) => (
            <div key={i} className="relative flex items-start gap-3 mb-4">
              <div className="absolute left-[-17px] top-1.5 rounded-full" style={{ width: 10, height: 10, background: a.color, border: `2px solid ${isDark ? '#1A1A1A' : 'var(--bg-app)'}` }} />
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 500, color: d.t1 }}>{a.title}</p>
                <p style={{ fontSize: 11, color: d.t2, marginBottom: 2 }}>{a.detail}</p>
                <p style={{ fontSize: 10, color: d.t3 }}>{formatRelativeTime(a.time)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
