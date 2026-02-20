/**
 * GoalDetailDrawer — 560px right overlay with 5 tabs
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Sparkles, Rocket, Clock, Activity, Trash2, Pencil, BarChart3, Plus } from 'lucide-react';
import { useGoals, useKeyResults, useAllKeyResults, useThemes, useDeleteGoal } from '@/hooks/useGoals';
import { goalsService } from '@/services/goalsService';
import { useQuery } from '@tanstack/react-query';
import type { Goal, KeyResult, KRCheckin } from '@/types/goals';
import { toast } from 'sonner';

interface GoalDetailDrawerProps {
  goalId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCheckinClick?: (krId: string) => void;
}

// ── Status badge ──
function statusBadge(status: string) {
  const map: Record<string, { dot: string; bg: string; text: string; label: string }> = {
    active:      { dot: '#16A34A', bg: 'rgba(22,163,74,0.08)',  text: '#16A34A', label: 'Active' },
    on_track:    { dot: '#16A34A', bg: 'rgba(22,163,74,0.08)',  text: '#16A34A', label: 'On Track' },
    in_progress: { dot: '#2563EB', bg: 'rgba(37,99,235,0.08)',  text: '#2563EB', label: 'In Progress' },
    completed:   { dot: '#2563EB', bg: 'rgba(37,99,235,0.08)',  text: '#2563EB', label: 'Completed' },
    achieved:    { dot: '#2563EB', bg: 'rgba(37,99,235,0.08)',  text: '#2563EB', label: 'Achieved' },
    at_risk:     { dot: '#D97706', bg: 'rgba(217,119,6,0.08)',  text: '#D97706', label: 'At Risk' },
    off_track:   { dot: '#EF4444', bg: 'rgba(239,68,68,0.08)',  text: '#EF4444', label: 'Off Track' },
    draft:       { dot: '#94A3B8', bg: 'rgba(148,163,184,0.08)', text: '#64748B', label: 'Draft' },
    not_started: { dot: '#94A3B8', bg: 'rgba(148,163,184,0.08)', text: '#64748B', label: 'Not Started' },
    cancelled:   { dot: '#94A3B8', bg: 'rgba(148,163,184,0.08)', text: '#64748B', label: 'Cancelled' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', fontSize: 11, fontWeight: 500, color: s.text, background: s.bg, borderRadius: 99, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  );
}

function progressBar(pct: number, height = 5) {
  const color = pct >= 60 ? '#16A34A' : pct >= 40 ? '#D97706' : '#EF4444';
  return (
    <div style={{ width: '100%', height, background: '#F1F5F9', borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: height / 2, transition: 'width 300ms' }} />
    </div>
  );
}

function formatDate(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; }
}

function computeKRProgress(kr: KeyResult) {
  if (kr.target === kr.baseline) return 0;
  if (kr.target < kr.baseline) return Math.min(100, Math.max(0, Math.round(((kr.baseline - kr.current_value) / (kr.baseline - kr.target)) * 100)));
  return Math.min(100, Math.max(0, Math.round(((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100)));
}

const TABS = ['Overview', 'Key Results', 'Initiatives', 'Check-ins', 'Activity'] as const;
type Tab = typeof TABS[number];

export function GoalDetailDrawer({ goalId, isOpen, onClose, onCheckinClick }: GoalDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const { data: goals = [] } = useGoals();
  const { data: themes = [] } = useThemes();
  const { data: krs = [], isLoading: krsLoading } = useKeyResults(goalId || '');
  const deleteGoal = useDeleteGoal();

  // Batch fetch checkins for all KRs
  const krIds = krs.map(kr => kr.id);
  const { data: allCheckins = [] } = useQuery({
    queryKey: ['goal-checkins', goalId, krIds.join(',')],
    queryFn: async () => {
      if (krIds.length === 0) return [];
      const results = await Promise.all(krIds.map(id => goalsService.getCheckins(id)));
      return results.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!goalId && krIds.length > 0,
  });

  const goal = useMemo(() => goals.find(g => g.id === goalId), [goals, goalId]);
  const theme = useMemo(() => themes.find(t => t.id === goal?.theme_id), [themes, goal?.theme_id]);

  // Reset tab on open
  useEffect(() => { if (isOpen) setActiveTab('Overview'); }, [goalId, isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleDelete = useCallback(async () => {
    if (!goalId || !goal) return;
    if (!confirm(`Delete "${goal.title}"? This will also delete all associated Key Results and Check-ins.`)) return;
    try {
      await deleteGoal.mutateAsync(goalId);
      toast.success('Goal deleted successfully');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete goal');
    }
  }, [goalId, goal, deleteGoal, onClose]);

  if (!isOpen) return null;

  const confPct = goal ? (typeof goal.confidence_level === 'number' ? (goal.confidence_level <= 1 ? Math.round(goal.confidence_level * 100) : Math.round(goal.confidence_level)) : 0) : 0;
  const confColor = confPct >= 60 ? '#16A34A' : confPct >= 40 ? '#D97706' : '#EF4444';
  const daysToDeadline = goal?.target_date ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(15,23,42,0.3)',
          animation: 'fadeIn 200ms ease-out',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 560, zIndex: 999,
          background: '#FFFFFF',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 300ms cubic-bezier(.4,0,.2,1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
          {theme && <span style={{ width: 12, height: 12, borderRadius: '50%', background: theme.color, flexShrink: 0 }} />}
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {goal?.goal_key} — {goal?.title}
          </span>
          <button onClick={() => {}} style={{ border: 'none', background: 'none', color: '#2563EB', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Pencil size={12} /> Edit
          </button>
          <button onClick={handleDelete} style={{ border: 'none', background: 'none', color: '#EF4444', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Trash2 size={12} /> Delete
          </button>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={18} color="#64748B" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', padding: '0 20px', gap: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 14px',
                fontSize: 12,
                fontWeight: activeTab === tab ? 600 : 500,
                color: activeTab === tab ? '#2563EB' : '#64748B',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #2563EB' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {!goal ? (
            <div style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>Goal not found</div>
          ) : activeTab === 'Overview' ? (
            <OverviewTab goal={goal} theme={theme} krs={krs} confPct={confPct} confColor={confColor} daysToDeadline={daysToDeadline} />
          ) : activeTab === 'Key Results' ? (
            <KeyResultsTab krs={krs} loading={krsLoading} onCheckinClick={onCheckinClick} />
          ) : activeTab === 'Initiatives' ? (
            <InitiativesTab />
          ) : activeTab === 'Check-ins' ? (
            <CheckinsTab checkins={allCheckins} krs={krs} />
          ) : (
            <ActivityTab goal={goal} krs={krs} checkins={allCheckins} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}

// ── Tab: Overview ──
function OverviewTab({ goal, theme, krs, confPct, confColor, daysToDeadline }: {
  goal: Goal; theme?: { id: string; title: string; color: string }; krs: KeyResult[];
  confPct: number; confColor: string; daysToDeadline: number | null;
}) {
  const fields = [
    { label: 'Status', value: statusBadge(goal.status) },
    { label: 'Priority', value: <span style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' as const }}>{goal.priority}</span> },
    { label: 'Theme', value: theme ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: theme.color }} />
        <span style={{ fontSize: 13 }}>{theme.title}</span>
      </div>
    ) : '—' },
    { label: 'Owner', value: '—' },
    { label: 'Progress', value: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 80 }}>{progressBar(goal.progress_pct || 0)}</div>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{Math.round(goal.progress_pct || 0)}%</span>
      </div>
    ) },
    { label: 'Confidence', value: <span style={{ fontSize: 13, fontWeight: 600, color: confColor }}>{confPct}%</span> },
    { label: 'Start Date', value: <span style={{ fontSize: 13 }}>{formatDate(goal.start_date)}</span> },
    { label: 'Target Date', value: <span style={{ fontSize: 13 }}>{formatDate(goal.target_date)}</span> },
    { label: 'Fiscal Quarter', value: <span style={{ fontSize: 13 }}>{goal.fiscal_quarter || '—'}</span> },
    { label: 'BSC Perspective', value: goal.bsc_perspective ? (
      <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 99, padding: '2px 8px' }}>{goal.bsc_perspective}</span>
    ) : '—' },
    { label: 'Weight', value: <span style={{ fontSize: 13 }}>{goal.weight}</span> },
    { label: 'Key Results', value: <span style={{ fontSize: 13 }}>{krs.length} total</span> },
  ];

  const aiScore = goal.ai_health_score;
  const aiLabel = aiScore != null ? (aiScore >= 70 ? 'Healthy — on track for targets' : aiScore >= 40 ? 'Moderate — needs monitoring' : 'Needs attention') : null;

  // Compute KR velocity
  const avgKRProgress = krs.length > 0 ? Math.round(krs.reduce((s, kr) => s + computeKRProgress(kr), 0) / krs.length) : 0;
  const krVelocity = avgKRProgress >= 60 ? 'Good' : avgKRProgress >= 40 ? 'Moderate' : 'Slow';

  return (
    <div>
      {/* Field grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 16 }}>
        {fields.map(f => (
          <div key={f.label}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', marginBottom: 4 }}>{f.label}</div>
            <div>{f.value}</div>
          </div>
        ))}
      </div>

      {/* Description */}
      {goal.description && (
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', marginBottom: 6 }}>Description</div>
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: '#334155', margin: 0 }}>{goal.description}</p>
        </div>
      )}

      {/* AI Health Score */}
      <div style={{
        background: '#F5F3FF',
        border: '1px solid rgba(124,58,237,0.15)',
        borderRadius: 10,
        padding: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Sparkles size={14} color="#7C3AED" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED' }}>AI Health Score</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#7C3AED' }}>{aiScore ?? '—'}/100</span>
        </div>
        <div style={{ fontSize: 11, color: '#7C3AED', marginBottom: 12, opacity: 0.8 }}>{aiLabel ?? 'Score not computed'}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'KR Velocity', value: krVelocity },
            { label: 'Check-in Freq', value: krs.some(kr => kr.check_in_count > 0) ? 'Regular' : 'Irregular' },
            { label: 'Confidence Trend', value: confPct >= 60 ? '↑ Improving' : confPct >= 40 ? '→ Stable' : '↓ Declining' },
            { label: 'Days to Deadline', value: daysToDeadline != null ? (daysToDeadline > 0 ? `${daysToDeadline}d` : 'Overdue') : '—' },
          ].map(f => (
            <div key={f.label} style={{ background: 'rgba(124,58,237,0.06)', borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#7C3AED', opacity: 0.7, marginBottom: 2 }}>{f.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED' }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Key Results ──
function KeyResultsTab({ krs, loading, onCheckinClick }: { krs: KeyResult[]; loading: boolean; onCheckinClick?: (id: string) => void }) {
  if (loading) return <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>Loading key results...</div>;

  if (krs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <BarChart3 size={36} color="#CBD5E1" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 4 }}>No Key Results yet</div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Add measurable key results to track progress toward this goal.</div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#2563EB', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 6, cursor: 'pointer' }}>
          <Plus size={13} /> Add Key Result
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {krs.map(kr => {
        const pct = computeKRProgress(kr);
        return (
          <div key={kr.id} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', background: '#F8FAFC', padding: '1px 5px', borderRadius: 3 }}>{kr.kr_key}</span>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kr.title}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{pct}%</span>
            </div>
            {progressBar(pct, 4)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              {statusBadge(kr.status)}
              <span style={{ fontSize: 11, color: '#64748B' }}>Current: {kr.current_value}</span>
              <span style={{ fontSize: 11, color: '#64748B' }}>Target: {kr.target}</span>
              <span style={{ fontSize: 11, color: '#64748B' }}>Due: {formatDate(kr.due_date)}</span>
              {onCheckinClick && (
                <button
                  onClick={() => onCheckinClick(kr.id)}
                  style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 500, color: '#2563EB', background: 'none', border: '1px solid #2563EB', borderRadius: 99, padding: '2px 8px', cursor: 'pointer' }}
                >
                  Check-in
                </button>
              )}
            </div>
          </div>
        );
      })}
      <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', fontSize: 12, fontWeight: 500, color: '#64748B', background: 'none', border: '1px dashed #CBD5E1', borderRadius: 8, cursor: 'pointer', marginTop: 4 }}>
        <Plus size={13} /> Add Key Result
      </button>
    </div>
  );
}

// ── Tab: Initiatives ──
function InitiativesTab() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <Rocket size={36} color="#CBD5E1" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 4 }}>No initiatives linked</div>
      <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Link business requests or projects that contribute to this goal.</div>
      <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#2563EB', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 6, cursor: 'pointer' }}>
        <Plus size={13} /> Link Initiative
      </button>
    </div>
  );
}

// ── Tab: Check-ins ──
function CheckinsTab({ checkins, krs }: { checkins: KRCheckin[]; krs: KeyResult[] }) {
  const krMap = new Map(krs.map(kr => [kr.id, kr]));

  if (checkins.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <Clock size={36} color="#CBD5E1" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 4 }}>No check-ins recorded</div>
        <div style={{ fontSize: 12, color: '#94A3B8' }}>Check-ins will appear here when team members update key results.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {checkins.map(ci => {
        const kr = krMap.get(ci.key_result_id);
        const delta = ci.delta_value;
        const isPositive = delta >= 0;
        return (
          <div key={ci.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isPositive ? '#16A34A' : '#EF4444', marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#0F172A', marginBottom: 2 }}>
                {kr?.kr_key} — {kr?.title || 'Unknown KR'}
              </div>
              <div style={{ fontSize: 12, color: isPositive ? '#16A34A' : '#EF4444', marginBottom: 2 }}>
                {ci.previous_value} → {ci.new_value} ({isPositive ? '+' : ''}{delta})
              </div>
              {ci.note && <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 2 }}>{ci.note}</div>}
              <div style={{ fontSize: 10.5, color: '#94A3B8' }}>
                {formatDate(ci.created_at)}
                {ci.confidence_level != null && ` · Confidence: ${typeof ci.confidence_level === 'number' && ci.confidence_level <= 1 ? Math.round(ci.confidence_level * 100) : ci.confidence_level}%`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Activity ──
function ActivityTab({ goal, krs, checkins }: { goal: Goal; krs: KeyResult[]; checkins: KRCheckin[] }) {
  const items = [
    { icon: <Activity size={12} color="#2563EB" />, text: 'Goal created', date: goal.created_at || goal.start_date },
    ...(krs.length > 0 ? [{ icon: <BarChart3 size={12} color="#0D9488" />, text: `${krs.length} Key Results added`, date: goal.created_at }] : []),
    ...(checkins.length > 0 ? [{ icon: <Clock size={12} color="#D97706" />, text: `${checkins.length} check-ins recorded`, date: checkins[0]?.created_at }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: '#0F172A', flex: 1 }}>{item.text}</span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>{formatDate(item.date)}</span>
        </div>
      ))}
    </div>
  );
}
