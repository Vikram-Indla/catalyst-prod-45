/**
 * ThemeDetailDrawer — 560px right-side overlay with 6 tabs
 * Fixes: Financials uses planned_budget, enhanced empty states, activity tab, Linear badges
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
  STATUS_CONFIG, BSC_CONFIG, PRIORITY_CONFIG,
  deriveHealthStatus, formatBudget, getInitials, getAvatarColor, formatDate, capitalize,
  formatRelativeTime, getProgressColor,
} from './theme-utils';

interface Props {
  theme: StrategicTheme | null;
  open: boolean;
  onClose: () => void;
  onEdit: (theme: StrategicTheme) => void;
  onDelete: (theme: StrategicTheme) => void;
}

const TABS = ['Overview', 'Goals & KRs', 'Initiatives', 'Financials', 'Milestones', 'Activity'] as const;
type Tab = typeof TABS[number];

export function ThemeDetailDrawer({ theme, open, onClose, onEdit, onDelete }: Props) {
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
  const sc = STATUS_CONFIG[health];
  const bsc = theme.bsc_perspective ? BSC_CONFIG[theme.bsc_perspective] : null;
  const pri = theme.priority ? PRIORITY_CONFIG[theme.priority] : null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15, 23, 42, 0.3)',
          }}
        />
      )}

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 210,
          width: 560, maxWidth: '90vw', background: '#FFFFFF',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 shrink-0" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <div className="shrink-0 rounded-full" style={{ width: 12, height: 12, background: theme.color }} />
          <h2 className="truncate flex-1" style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{theme.title}</h2>
          <button onClick={() => onEdit(theme)} style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Edit</button>
          <button onClick={() => setConfirmDelete(true)} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Delete</button>
          <button onClick={onClose} className="flex items-center justify-center rounded hover:bg-gray-100" style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={18} color="#64748B" />
          </button>
        </div>

        {/* Delete Confirmation */}
        {confirmDelete && (
          <div style={{ padding: '12px 20px', background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
            <p style={{ fontSize: 12, color: '#991B1B', marginBottom: 8 }}>Delete "<strong>{theme.title}</strong>"? This will also remove all milestones and links.</p>
            <div className="flex gap-2">
              <button onClick={() => { onDelete(theme); setConfirmDelete(false); }} style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 4, border: 'none', background: '#DC2626', color: '#FFF', cursor: 'pointer' }}>Delete</button>
              <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 4, border: '1px solid #E2E8F0', background: '#FFF', color: '#334155', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="shrink-0 flex border-b overflow-x-auto" style={{ borderColor: '#E2E8F0', padding: '0 20px' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontSize: 12, fontWeight: tab === t ? 600 : 500,
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

// ═══ SHARED ═══
function KpiCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg border text-center" style={{ borderColor: '#E2E8F0', padding: '12px 8px' }}>
      <p style={{ fontSize: 20, fontWeight: 700, color: color || '#0F172A', marginBottom: 2 }}>{value}</p>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2" style={{ padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
      <span className="shrink-0" style={{ width: 120, fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: '#0F172A', flex: 1 }}>{value || <span style={{ color: '#94A3B8' }}>—</span>}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, cta }: { icon: any; title: string; description: string; cta?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ padding: '48px 24px' }}>
      <div className="rounded-xl flex items-center justify-center mb-4" style={{ width: 48, height: 48, background: '#F1F5F9' }}>
        <Icon size={22} color="#94A3B8" strokeWidth={1.5} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>{title}</p>
      <p style={{ fontSize: 12, color: '#94A3B8', maxWidth: 280, lineHeight: 1.5 }}>{description}</p>
      {cta && (
        <button style={{ fontSize: 12, fontWeight: 500, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', marginTop: 12 }}>
          + {cta}
        </button>
      )}
    </div>
  );
}

// ═══ OVERVIEW ═══
function OverviewTab({ theme, sc, bsc, pri }: { theme: StrategicTheme; sc: any; bsc: any; pri: any }) {
  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KpiCard label="Progress" value={`${theme.progress_pct}%`} />
        <KpiCard label="Goals" value={theme.goal_count} />
        <KpiCard label="Key Results" value={theme.kr_count} />
      </div>

      {/* AI Health Score Card */}
      {theme.ai_health_score != null && (
        <div className="rounded-lg mb-5 overflow-hidden" style={{
          background: 'linear-gradient(135deg, #EDE9FE, #F5F3FF)',
          border: '1px solid #DDD6FE', padding: 16,
        }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', background: '#7C3AED', color: '#FFFFFF', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AI
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#5B21B6' }}>Strategy Health Score</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#7C3AED', marginBottom: 8 }}>
            {theme.ai_health_score}<span style={{ fontSize: 14, fontWeight: 500 }}>/100</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'OKR', value: Math.round(theme.ai_health_score * 0.3) },
              { label: 'Velocity', value: Math.round(theme.ai_health_score * 0.25) },
              { label: 'Alignment', value: Math.round(theme.ai_health_score * 0.2) },
            ].map(f => (
              <div key={f.label} className="rounded-md text-center" style={{ background: 'rgba(255,255,255,0.6)', padding: '6px 0' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#5B21B6' }}>{f.value}</p>
                <p style={{ fontSize: 10, color: '#7C3AED' }}>{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field grid */}
      <div className="grid grid-cols-2 gap-x-4">
        <FieldRow label="Vision" value={theme.vision_statement} />
        <FieldRow label="Owner" value={theme.owner_name || 'Unassigned'} />
        <FieldRow label="Fiscal Year" value={`FY${theme.fiscal_year}`} />
        <FieldRow label="Date Range" value={
          theme.start_date && theme.target_completion
            ? `${formatDate(theme.start_date)} – ${formatDate(theme.target_completion)}`
            : null
        } />
        <FieldRow label="BSC Perspective" value={bsc?.label} />
        <FieldRow label="Priority" value={pri ? <span style={{ color: pri.color, fontWeight: 600 }}>{pri.label}</span> : null} />
        <FieldRow label="Budget (SAR)" value={theme.planned_budget > 0 ? formatBudget(theme.planned_budget) : null} />
        <FieldRow label="Theme Group" value={theme.theme_group_name || 'None'} />
        <FieldRow label="Milestones" value={`${theme.milestone_count ?? 0} / 20`} />
        <FieldRow label="Process Step" value={theme.process_step} />
      </div>
    </div>
  );
}

// ═══ GOALS & KRS ═══
function GoalsTab({ theme }: { theme: StrategicTheme }) {
  const { data: goals = [], isLoading } = useGoalsForTheme(theme.id);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Goals ({goals.length})</h3>
        <button style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Add Goal</button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" color="#94A3B8" /></div>
      ) : goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals linked yet" description="Goals define measurable objectives under this theme. Add your first goal to start tracking progress." cta="Add Goal" />
      ) : (
        <div className="space-y-2">
          {goals.map((g: any) => {
            const statusColor = g.status === 'completed' ? '#16A34A' : g.status === 'at_risk' ? '#D97706' : '#2563EB';
            return (
              <div key={g.id} className="rounded-lg border p-3" style={{ borderColor: '#E2E8F0' }}>
                <div className="flex items-start justify-between mb-2">
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{g.title}</span>
                  <span className="inline-flex rounded-full px-2 py-0.5 shrink-0 ml-2" style={{ fontSize: 10, fontWeight: 500, background: statusColor + '18', color: statusColor }}>{g.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: '#E2E8F0' }}>
                    <div className="h-full rounded-full" style={{ width: `${g.progress_pct}%`, background: statusColor }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#334155' }}>{g.progress_pct}%</span>
                  <span className="rounded px-1.5 py-0.5" style={{ fontSize: 9, fontWeight: 500, background: '#F1F5F9', color: '#64748B' }}>{g.kr_count} KRs</span>
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
function InitiativesTab({ theme }: { theme: StrategicTheme }) {
  const { data: initiatives = [], isLoading } = useInitiativesForTheme(theme.id);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Linked Initiatives ({initiatives.length})</h3>
        <button style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Link Initiative</button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" color="#94A3B8" /></div>
      ) : initiatives.length === 0 ? (
        <EmptyState icon={Rocket} title="No initiatives linked" description="Initiatives are actionable projects that contribute to this theme's goals. Link an initiative to connect execution to strategy." cta="Link Initiative" />
      ) : (
        <div className="space-y-2">
          {initiatives.map((ini: any) => (
            <div key={ini.id} className="rounded-lg border p-3" style={{ borderColor: '#E2E8F0' }}>
              <div className="flex items-start justify-between mb-1">
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{ini.title}</span>
                <span className="inline-flex rounded-full px-2 py-0.5 shrink-0 ml-2" style={{ fontSize: 10, fontWeight: 500, background: '#F1F5F9', color: '#475569' }}>{ini.status}</span>
              </div>
              <div className="flex items-center gap-3" style={{ fontSize: 10, color: '#64748B' }}>
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

// ═══ FINANCIALS — uses planned_budget for Allocated ═══
function FinancialsTab({ theme }: { theme: StrategicTheme }) {
  const allocated = theme.planned_budget || 0;
  const spent = theme.budget_spent || 0;
  const remainingPct = allocated > 0 ? Math.round(((allocated - spent) / allocated) * 100) : 0;
  const utilization = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KpiCard label="Allocated" value={formatBudget(allocated)} />
        <KpiCard label="Spent" value={formatBudget(spent)} />
        <KpiCard label="Remaining" value={`${remainingPct}%`} color={remainingPct < 20 ? '#DC2626' : '#059669'} />
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontSize: 11, color: '#64748B' }}>Budget Utilization</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{utilization}%</span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 8, background: '#E2E8F0' }}>
          {utilization > 0 && (
            <div className="h-full rounded-full" style={{
              width: `${Math.min(utilization, 100)}%`,
              background: utilization > 90 ? '#DC2626' : utilization > 70 ? '#D97706' : '#2563EB',
            }} />
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#64748B', marginTop: 12 }}>
        Planned budget: <strong>{formatBudget(theme.planned_budget)}</strong> SAR for FY{theme.fiscal_year}.
      </p>
    </div>
  );
}

// ═══ MILESTONES — Full CRUD ═══
const MILESTONE_CATEGORIES = ['discover', 'define', 'design', 'deliver'] as const;
const MILESTONE_STATES = ['not_started', 'in_progress', 'completed', 'missed'] as const;
const STATE_COLORS: Record<string, string> = { not_started: '#94A3B8', in_progress: '#2563EB', completed: '#16A34A', missed: '#DC2626' };

function MilestonesTab({ theme }: { theme: StrategicTheme }) {
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

  const inputStyle: React.CSSProperties = { fontSize: 12, padding: '6px 8px', border: '1px solid #E2E8F0', borderRadius: 4, outline: 'none', width: '100%' };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Milestones ({milestones.length} / 20)</h3>
        <button onClick={() => { resetForm(); setShowForm(true); }} disabled={milestones.length >= 20} style={{ fontSize: 12, color: milestones.length >= 20 ? '#94A3B8' : '#2563EB', background: 'none', border: 'none', cursor: milestones.length >= 20 ? 'default' : 'pointer', fontWeight: 500 }}>+ Add Milestone</button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-3 mb-3" style={{ borderColor: '#DBEAFE', background: '#F8FAFC' }}>
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
              <button onClick={handleSave} disabled={!formData.name.trim()} style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 4, border: 'none', background: formData.name.trim() ? '#2563EB' : '#94A3B8', color: '#FFF', cursor: formData.name.trim() ? 'pointer' : 'default' }}>{editingId ? 'Update' : 'Add'}</button>
              <button onClick={resetForm} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 4, border: '1px solid #E2E8F0', background: '#FFF', color: '#334155', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" color="#94A3B8" /></div>
      ) : milestones.length === 0 && !showForm ? (
        <EmptyState icon={Flag} title="No milestones added yet" description="Milestones mark key checkpoints in your theme's timeline. Add milestones to track progress toward completion." cta="Add Milestone" />
      ) : (
        <div className="space-y-1">
          {milestones.map(m => (
            <div key={m.id} className="flex items-center gap-2 rounded-md px-2 group" style={{ height: 36, borderBottom: '1px solid #F8FAFC' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: STATE_COLORS[m.state] || '#94A3B8' }} />
              <span className="flex-1 truncate" style={{ fontSize: 12, fontWeight: 500, color: '#0F172A' }}>{m.name}</span>
              <span className="shrink-0 rounded px-1.5 py-0.5" style={{ fontSize: 9, background: '#F1F5F9', color: '#64748B' }}>{m.category}</span>
              <span className="shrink-0" style={{ fontSize: 10, color: '#94A3B8' }}>{m.state.replace(/_/g, ' ')}</span>
              <button onClick={() => startEdit(m)} className="opacity-0 group-hover:opacity-100 p-0.5" style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Pencil size={12} color="#64748B" /></button>
              <button onClick={() => deleteMilestone.mutate({ id: m.id, themeId: theme.id })} className="opacity-0 group-hover:opacity-100 p-0.5" style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={12} color="#DC2626" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ ACTIVITY ═══
function ActivityTab({ theme }: { theme: StrategicTheme }) {
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
        <EmptyState icon={Clock} title="No activity yet" description="Activity events will appear here as this theme is updated." />
      ) : (
        <div className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2" style={{ width: 2, background: '#E2E8F0' }} />
          {activities.map((a, i) => (
            <div key={i} className="relative flex items-start gap-3 mb-4">
              <div className="absolute left-[-17px] top-1.5 rounded-full border-2 border-white" style={{ width: 10, height: 10, background: a.color }} />
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 500, color: '#0F172A' }}>{a.title}</p>
                <p style={{ fontSize: 11, color: '#64748B', marginBottom: 2 }}>{a.detail}</p>
                <p style={{ fontSize: 10, color: '#94A3B8' }}>{formatRelativeTime(a.time)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
