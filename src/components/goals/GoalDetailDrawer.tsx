/**
 * GoalDetailDrawer — Fix 2: Complete redesign 520px, sticky header/tabs, modern cards
 * Fix 3: Field labels var(--ds-text-subtlest, #94A3B8) 10px uppercase, Fix 4: circular avatars
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Sparkles, Rocket, Clock, Activity, Trash2, Pencil, BarChart3, Plus, Save, Search, Link2, Unlink } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useGoals, useKeyResults, useThemes, useDeleteGoal, useUpdateGoal, useGoalInitiatives, useLinkInitiative, useUnlinkInitiative, useSearchInitiatives } from '@/hooks/useGoals';
import { goalsService } from '@/services/goalsService';
import { useQuery } from '@tanstack/react-query';
import type { Goal, KeyResult, KRCheckin, GoalStatus, Priority, BSCPerspective } from '@/types/goals';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface GoalDetailDrawerProps {
  goalId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCheckinClick?: (krId: string) => void;
}

// Fix 3: All label styles
const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--fg-4)', marginBottom: 4,
};

function statusBadge(status: string) {
  const map: Record<string, { dot: string; bg: string; text: string; label: string }> = {
    active:      { dot: 'var(--ds-text-success, #16A34A)', bg: 'rgba(22,163,74,0.08)',  text: '#15803D', label: 'Active' },
    on_track:    { dot: 'var(--ds-text-success, #16A34A)', bg: 'rgba(22,163,74,0.08)',  text: '#15803D', label: 'On Track' },
    completed:   { dot: '#4F46E5', bg: 'rgba(79,70,229,0.08)',  text: '#4338CA', label: 'Completed' },
    achieved:    { dot: '#4F46E5', bg: 'rgba(79,70,229,0.08)',  text: '#4338CA', label: 'Achieved' },
    at_risk:     { dot: 'var(--ds-text-warning, #D97706)', bg: 'rgba(217,119,6,0.08)',  text: '#B45309', label: 'At Risk' },
    off_track:   { dot: 'var(--sem-danger)', bg: 'rgba(239,68,68,0.08)',  text: 'var(--ds-text-danger, #DC2626)', label: 'Off Track' },
    draft:       { dot: 'var(--ds-text-subtlest, #94A3B8)', bg: 'var(--cp-bd-zone)',               text: 'var(--fg-3)', label: 'Draft' },
    not_started: { dot: 'var(--ds-text-subtlest, #94A3B8)', bg: 'var(--cp-bd-zone)',               text: 'var(--fg-3)', label: 'Not Started' },
    cancelled:   { dot: 'var(--ds-text-subtlest, #94A3B8)', bg: 'var(--cp-bd-zone)',               text: 'var(--fg-3)', label: 'Cancelled' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', fontSize: 11, fontWeight: 500, color: s.text, background: s.bg, borderRadius: 99, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  );
}

function progressBar(pct: number, height = 8) {
  const color = pct >= 60 ? 'var(--ds-text-success, #16A34A)' : pct >= 40 ? 'var(--ds-text-warning, #D97706)' : 'var(--sem-danger)';
  return (
    <div style={{ width: '100%', height, background: 'var(--divider)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 300ms' }} />
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

// Fix 4: Avatar colors
const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  'Nada Alfassam':      { bg: '#DBEAFE', text: '#1E40AF' },
  'Sitah Alqahtani':    { bg: '#E0E7FF', text: '#3730A3' },
  'Sulaiman Alessa':    { bg: '#D1FAE5', text: '#065F46' },
  'ibrahim alqusiyer':  { bg: '#FEF3C7', text: '#92400E' },
  'Khaled Alghithy':    { bg: '#CFFAFE', text: '#155E75' },
  'Izza Ali':           { bg: '#EDE9FE', text: '#5B21B6' },
};
function getAvatarColors(name: string) {
  if (AVATAR_COLORS[name]) return AVATAR_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const palettes = [{ bg: '#DBEAFE', text: '#1E40AF' }, { bg: '#D1FAE5', text: '#065F46' }, { bg: '#E0E7FF', text: '#3730A3' }, { bg: '#FEF3C7', text: '#92400E' }, { bg: '#CFFAFE', text: '#155E75' }, { bg: '#EDE9FE', text: '#5B21B6' }];
  return palettes[Math.abs(hash) % palettes.length];
}

const TABS = ['Overview', 'Key Results', 'Requests', 'Check-ins', 'Activity'] as const;
type Tab = typeof TABS[number];

export function GoalDetailDrawer({ goalId, isOpen, onClose, onCheckinClick }: GoalDetailDrawerProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { data: goals = [] } = useGoals();
  const { data: themes = [] } = useThemes();
  const { data: krs = [], isLoading: krsLoading } = useKeyResults(goalId || '');
  const deleteGoal = useDeleteGoal();
  const updateGoal = useUpdateGoal();
  const closeRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => { if (isOpen) { setActiveTab('Overview'); setIsEditing(false); } }, [goalId, isOpen]);
  useEffect(() => { if (isOpen) setTimeout(() => closeRef.current?.focus(), 350); }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleDelete = useCallback(async () => {
    if (!goalId) return;
    try {
      await deleteGoal.mutateAsync(goalId);
      toast.success('Goal deleted successfully');
      setShowDeleteDialog(false);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete goal');
    }
  }, [goalId, deleteGoal, onClose]);

  if (!isOpen) return null;

  const confPct = goal ? (typeof goal.confidence_level === 'number' ? (goal.confidence_level <= 1 ? Math.round(goal.confidence_level * 100) : Math.round(goal.confidence_level)) : 0) : 0;
  const confColor = confPct >= 60 ? 'var(--ds-text-success, #16A34A)' : confPct >= 40 ? 'var(--ds-text-warning, #D97706)' : 'var(--sem-danger)';
  const daysToDeadline = goal?.target_date ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000) : null;

  // Status dot color
  const statusDotColor = goal ? ({
    active: 'var(--ds-text-success, #16A34A)', on_track: 'var(--ds-text-success, #16A34A)', completed: '#4F46E5',
    at_risk: 'var(--ds-text-warning, #D97706)', off_track: 'var(--sem-danger)', draft: 'var(--ds-text-subtlest, #94A3B8)',
  }[goal.status] || 'var(--ds-text-subtlest, #94A3B8)') : 'var(--ds-text-subtlest, #94A3B8)';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(15,23,42,0.3)', animation: 'gddFadeIn 200ms ease-out' }} />
      <div
        role="dialog" aria-label={`Goal detail: ${goal?.title || ''}`}
        className="gdd-drawer"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 520, maxWidth: '100vw', zIndex: 999,
          background: 'var(--cp-float)', borderLeft: '1px solid var(--divider)',
          boxShadow: '-8px 0 24px rgba(0,0,0,0.08), -2px 0 8px rgba(0,0,0,0.04)',
          display: 'flex', flexDirection: 'column',
          animation: 'gddSlideIn 300ms cubic-bezier(.4,0,.2,1)', overflow: 'hidden',
        }}
      >
        {/* Fix 2: Sticky Header — 56px */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--cp-bg-elevated, #FFFFFF)', borderBottom: '1px solid var(--divider)',
          padding: '0 20px', height: 56,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {/* Status dot */}
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusDotColor, flexShrink: 0 }} />
          {/* Goal key badge */}
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', background: 'var(--cp-bd-zone)', padding: '2px 8px', borderRadius: 4, fontFamily: 'ui-monospace, monospace', flexShrink: 0 }}>
            {goal?.goal_key}
          </span>
          {/* Title */}
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {goal?.title}
          </span>
          {/* Edit button */}
          <button onClick={() => setIsEditing(!isEditing)} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none', background: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--cp-blue)', transition: 'background 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-bd-zone)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Pencil size={14} />
          </button>
          {/* Delete button */}
          <button onClick={() => setShowDeleteDialog(true)} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none', background: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--sem-danger)', transition: 'background 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Trash2 size={14} />
          </button>
          {/* Close button */}
          <button ref={closeRef} onClick={onClose} aria-label="Close drawer" style={{
            width: 32, height: 32, borderRadius: 8, border: 'none', background: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg-3)', transition: 'background 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-bd-zone)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Fix 2: Sticky Tab bar */}
        <div style={{
          position: 'sticky', top: 56, zIndex: 10,
          background: 'var(--cp-bg-elevated, #FFFFFF)', borderBottom: '1px solid var(--divider)',
          padding: '0 20px', display: 'flex', gap: 0,
        }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '10px 16px', fontSize: 13,
              fontWeight: activeTab === tab ? 600 : 500,
              color: activeTab === tab ? 'var(--ds-text-brand, #2563EB)' : 'var(--fg-3)',
              background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--cp-blue)' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 150ms',
            }}
            onMouseEnter={e => { if (activeTab !== tab) { e.currentTarget.style.color = 'var(--fg-2)'; e.currentTarget.style.background = 'var(--bg-1)'; } }}
            onMouseLeave={e => { if (activeTab !== tab) { e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.background = 'none'; } }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {!goal ? (
            <div style={{ color: 'var(--fg-4)', textAlign: 'center', padding: 40 }}>Goal not found</div>
          ) : activeTab === 'Overview' ? (
            isEditing ? (
              <EditOverviewTab goal={goal} themes={themes} onSave={async (updates) => {
                try {
                  await updateGoal.mutateAsync({ id: goal.id, updates });
                  toast.success('Goal updated');
                  setIsEditing(false);
                } catch (err: any) { toast.error(err?.message || 'Update failed'); }
              }} onCancel={() => setIsEditing(false)} isPending={updateGoal.isPending} />
            ) : (
              <OverviewTab goal={goal} theme={theme} krs={krs} confPct={confPct} confColor={confColor} daysToDeadline={daysToDeadline} />
            )
          ) : activeTab === 'Key Results' ? (
            <KeyResultsTab krs={krs} loading={krsLoading} onCheckinClick={onCheckinClick} />
          ) : activeTab === 'Requests' ? (
            <InitiativesTab goalId={goalId!} />
          ) : activeTab === 'Check-ins' ? (
            <CheckinsTab checkins={allCheckins} krs={krs} />
          ) : (
            <ActivityTab goal={goal} krs={krs} checkins={allCheckins} />
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal {goal?.goal_key}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this goal and all its key results. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        @keyframes gddSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes gddFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 639px) { .gdd-drawer { width: 100vw !important; } }
      `}</style>
    </>
  );
}

// ── Edit Overview Tab ──
function EditOverviewTab({ goal, themes, onSave, onCancel, isPending }: {
  goal: Goal; themes: { id: string; title: string; color: string }[];
  onSave: (u: Partial<Goal>) => Promise<void>; onCancel: () => void; isPending: boolean;
}) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description || '');
  const [status, setStatus] = useState(goal.status);
  const [priority, setPriority] = useState(goal.priority);
  const [themeId, setThemeId] = useState(goal.theme_id);
  const [startDate, setStartDate] = useState(goal.start_date || '');
  const [targetDate, setTargetDate] = useState(goal.target_date || '');
  const [quarter, setQuarter] = useState(goal.fiscal_quarter || '');
  const [bsc, setBsc] = useState(goal.bsc_perspective || '');

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--divider)', borderRadius: 6, outline: 'none', color: 'var(--fg-1)', background: 'var(--bg-app)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div><label style={LABEL_STYLE}>Title</label><input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} /></div>
      <div><label style={LABEL_STYLE}>Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={LABEL_STYLE}>Status</label>
          <Select value={status} onValueChange={v => setStatus(v as GoalStatus)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['draft','active','at_risk','off_track','completed','cancelled'] as GoalStatus[]).map(s => <SelectItem key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label style={LABEL_STYLE}>Priority</label>
          <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['critical','high','medium','low'] as Priority[]).map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={LABEL_STYLE}>Theme</label>
          <Select value={themeId} onValueChange={setThemeId}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{themes.map(t => <SelectItem key={t.id} value={t.id}><div style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:8,height:8,borderRadius:2,background:t.color }} />{t.title}</div></SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label style={LABEL_STYLE}>Quarter</label>
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{['Q1 2026','Q2 2026','Q3 2026','Q4 2026'].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><label style={LABEL_STYLE}>Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} /></div>
        <div><label style={LABEL_STYLE}>Target Date</label><input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={inputStyle} /></div>
      </div>
      <div>
        <label style={LABEL_STYLE}>BSC Perspective</label>
        <Select value={bsc} onValueChange={setBsc}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>{(['Financial','Customer','Internal Process','Learning & Growth'] as BSCPerspective[]).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--divider)' }}>
        <button onClick={onCancel} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, color: 'var(--fg-3)', background: 'none', border: '1px solid var(--divider)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
        <button
          onClick={() => onSave({ title, description: description || undefined, status, priority, theme_id: themeId, start_date: startDate || undefined, target_date: targetDate || undefined, fiscal_quarter: quarter || undefined, bsc_perspective: (bsc as BSCPerspective) || undefined })}
          disabled={isPending}
          style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, color: 'var(--ds-surface, #FFFFFF)', background: isPending ? '#93C5FD' : 'var(--cp-blue)', border: 'none', borderRadius: 6, cursor: isPending ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <Save size={13} /> {isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ── Tab: Overview ──
function OverviewTab({ goal, theme, krs, confPct, confColor, daysToDeadline }: {
  goal: Goal; theme?: { id: string; title: string; color: string }; krs: KeyResult[];
  confPct: number; confColor: string; daysToDeadline: number | null;
}) {
  // Fix 4: Circular avatar 32px
  const ownerDisplay = goal.owner_name ? (() => {
    const colors = getAvatarColors(goal.owner_name);
    const initials = goal.owner_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: colors.text, flexShrink: 0 }}>
          {initials}
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-1)' }}>{goal.owner_name}</span>
      </div>
    );
  })() : '—';

  const pct = Math.round(goal.progress_pct || 0);
  const pctColor = pct >= 60 ? 'var(--ds-text-success, #16A34A)' : pct >= 40 ? 'var(--ds-text-warning, #D97706)' : 'var(--sem-danger)';

  const fields = [
    { label: 'Status', value: statusBadge(goal.status) },
    { label: 'Priority', value: <span style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' as const, color: 'var(--fg-1)' }}>{goal.priority}</span> },
    { label: 'Theme', value: theme ? (<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: theme.color }} /><span style={{ fontSize: 14, color: 'var(--fg-1)' }}>{theme.title}</span></div>) : '—' },
    { label: 'Owner', value: ownerDisplay },
    { label: 'Start Date', value: <span style={{ fontSize: 14, color: 'var(--fg-1)' }}>{formatDate(goal.start_date)}</span> },
    { label: 'Target Date', value: <span style={{ fontSize: 14, color: 'var(--fg-1)' }}>{formatDate(goal.target_date)}</span> },
    { label: 'Fiscal Quarter', value: <span style={{ fontSize: 14, color: 'var(--fg-1)' }}>{goal.fiscal_quarter || '—'}</span> },
    { label: 'BSC Perspective', value: goal.bsc_perspective ? (<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)', border: '1px solid var(--divider)', borderRadius: 99, padding: '2px 8px' }}>{goal.bsc_perspective}</span>) : '—' },
    { label: 'Confidence', value: <span style={{ fontSize: 14, fontWeight: 600, color: confColor }}>{confPct}%</span> },
    { label: 'Weight', value: <span style={{ fontSize: 14, color: 'var(--fg-1)' }}>{goal.weight}</span> },
    { label: 'Key Results', value: <span style={{ fontSize: 14, color: 'var(--fg-1)' }}>{krs.length} total</span> },
  ];

  const aiScore = goal.ai_health_score;
  const aiLabel = aiScore != null
    ? (aiScore >= 70 ? 'Healthy — on track for targets' : aiScore >= 50 ? 'Moderate — some risks identified' : 'Needs attention — significant risks')
    : null;
  const avgKRProgress = krs.length > 0 ? Math.round(krs.reduce((s, kr) => s + computeKRProgress(kr), 0) / krs.length) : 0;
  const krVelocity = avgKRProgress >= 60 ? 'Good' : avgKRProgress >= 40 ? 'Moderate' : 'Slow';

  return (
    <div>
      {/* Progress section */}
      <div style={{ marginBottom: 20 }}>
        <div style={LABEL_STYLE}>Progress</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <div style={{ flex: 1 }}>{progressBar(pct)}</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: pctColor }}>{pct}%</span>
        </div>
      </div>

      {/* 2-col metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: 20 }}>
        {fields.map(f => (
          <div key={f.label}>
            <div style={LABEL_STYLE}>{f.label}</div>
            <div>{f.value}</div>
          </div>
        ))}
      </div>

      {goal.description && (
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 14, marginBottom: 20 }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Description</div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg-2)', margin: 0 }}>{goal.description}</p>
        </div>
      )}

      {/* AI Health Score — purple branded */}
      <div style={{ background: '#DBEAFE', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Sparkles size={14} color="var(--ds-text-brand, #2563EB)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Health Score</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--cp-blue)', marginBottom: 6 }}>{aiScore != null ? aiScore : '—'}/100</div>
        <div style={{ fontSize: 11, color: 'var(--cp-blue)', marginBottom: 12, opacity: 0.8 }}>{aiLabel ?? 'Score not computed'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'KR Velocity', value: krVelocity },
            { label: 'Check-in Freq', value: krs.some(kr => kr.check_in_count > 0) ? 'Regular' : 'Irregular' },
            { label: 'Confidence Trend', value: confPct >= 60 ? '↑ Improving' : confPct >= 40 ? '→ Stable' : '↓ Declining' },
            { label: 'Days to Deadline', value: daysToDeadline != null ? (daysToDeadline > 0 ? `${daysToDeadline}d` : 'Overdue') : '—' },
          ].map(f => (
            <div key={f.label} style={{ background: 'rgba(37,99,235,0.06)', borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--cp-blue)', opacity: 0.7, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cp-blue)' }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Key Results — Fix 2: modern card layout ──
function KeyResultsTab({ krs, loading, onCheckinClick }: { krs: KeyResult[]; loading: boolean; onCheckinClick?: (id: string) => void }) {
  const { isDark } = useTheme();
  if (loading) return <div style={{ textAlign: 'center', color: 'var(--fg-4)', padding: 40 }}>Loading key results...</div>;
  if (krs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><BarChart3 size={36} color="var(--ds-text-disabled, #CBD5E1)" /></div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>No Key Results yet</div>
        <div style={{ fontSize: 12, color: 'var(--fg-4)', marginBottom: 16 }}>Add measurable key results to track progress toward this goal.</div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 6, cursor: 'pointer' }}>
          <Plus size={13} /> Add Key Result
        </button>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {krs.map(kr => {
        const pct = computeKRProgress(kr);
        const pctColor = pct >= 60 ? 'var(--ds-text-success, #16A34A)' : pct >= 40 ? 'var(--ds-text-warning, #D97706)' : 'var(--sem-danger)';
        return (
          <div key={kr.id} className="kr-detail-card" style={{
            background: 'var(--cp-bg-elevated, #FFFFFF)', border: '1px solid var(--divider)', borderRadius: 8,
            padding: '14px 16px', transition: 'all 150ms',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', background: 'var(--cp-bd-zone)', padding: '2px 6px', borderRadius: 4, fontFamily: 'ui-monospace, monospace' }}>{kr.kr_key}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kr.title}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: pctColor }}>{pct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: 'var(--divider)', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pctColor, borderRadius: 4, transition: 'width 300ms' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {statusBadge(kr.status)}
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{kr.current_value} / {kr.target}{kr.metric_unit ? ` ${kr.metric_unit}` : ''}</span>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Due: {formatDate(kr.due_date)}</span>
              {onCheckinClick && (
                <button onClick={() => onCheckinClick(kr.id)} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--ds-surface, #FFFFFF)', background: 'var(--cp-blue)', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>Check-in</button>
              )}
            </div>
          </div>
        );
      })}
      <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '12px 0', fontSize: 13, fontWeight: 500, color: 'var(--fg-3)', background: 'none', border: '1px dashed var(--divider)', borderRadius: 8, cursor: 'pointer', marginTop: 4, transition: 'all 150ms' }}>
        <Plus size={13} /> Add Key Result
      </button>
      <style>{`
        .kr-detail-card:hover { border-color: var(--ds-text-disabled, #CBD5E1); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
      `}</style>
    </div>
  );
}

// ── Tab: Requests ──
function InitiativesTab({ goalId }: { goalId: string }) {
  const { isDark } = useTheme();
  const { data: links = [], isLoading } = useGoalInitiatives(goalId);
  const linkMutation = useLinkInitiative();
  const unlinkMutation = useUnlinkInitiative();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults = [] } = useSearchInitiatives(searchQuery);

  const linkedIds = new Set(links.map(l => l.request_id));

  if (isLoading) return <div style={{ textAlign: 'center', color: 'var(--fg-4)', padding: 40 }}>Loading initiatives...</div>;

  return (
    <div>
      {links.length === 0 && !showSearch && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Rocket size={36} color="var(--ds-text-disabled, #CBD5E1)" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>No initiatives linked</div>
          <div style={{ fontSize: 12, color: 'var(--fg-4)', marginBottom: 16 }}>Link initiatives from Product Hub that contribute to this goal.</div>
          <button
            onClick={() => setShowSearch(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 6, cursor: 'pointer' }}
          >
            <Plus size={13} /> Link Request
          </button>
        </div>
      )}

      {links.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {links.map(link => (
            <div key={link.id} className="init-card" style={{
              border: '1px solid var(--divider)', borderRadius: 8, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 10, transition: 'all 150ms',
            }}>
              <Link2 size={16} color="var(--ds-text-disabled, #CBD5E1)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', background: 'var(--cp-bd-zone)', padding: '2px 6px', borderRadius: 4, fontFamily: 'ui-monospace, monospace' }}>
                    {link.initiative?.initiative_key || '—'}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {link.initiative?.title || 'Unknown'}
                  </span>
                </div>
                {link.initiative?.status && statusBadge(link.initiative.status)}
              </div>
              <button
                onClick={() => unlinkMutation.mutate(link.id)}
                className="unlink-btn"
                style={{ border: 'none', background: 'none', color: 'var(--fg-4)', cursor: 'pointer', padding: 4, borderRadius: 4, transition: 'color 150ms' }}
                title="Unlink initiative"
              >
                <Unlink size={13} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setShowSearch(true)}
            className="link-init-btn"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '12px 0', fontSize: 13, fontWeight: 500, color: 'var(--fg-3)', background: 'none', border: '1px dashed var(--divider)', borderRadius: 8, cursor: 'pointer', marginTop: 4, transition: 'all 150ms' }}
          >
            <Plus size={13} /> Link Request
          </button>
        </div>
      )}

      {showSearch && (
        <div style={{ marginTop: links.length > 0 ? 12 : 0, border: '1px solid var(--divider)', borderRadius: 8, padding: 12, background: 'var(--bg-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Search size={14} color="var(--ds-text-subtlest, #94A3B8)" />
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search initiatives..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, color: 'var(--fg-1)', background: 'transparent' }}
            />
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} style={{ border: 'none', background: 'none', color: 'var(--fg-4)', cursor: 'pointer', padding: 2 }}>
              <X size={14} />
            </button>
          </div>
          {searchResults.length > 0 ? (
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {searchResults.filter(i => !linkedIds.has(i.id)).map(init => (
                <div
                  key={init.id}
                  onClick={() => { linkMutation.mutate({ goalId, requestId: init.id }); setShowSearch(false); setSearchQuery(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', transition: 'background 100ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-primary-light, #EFF6FF)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-4)', fontFamily: 'ui-monospace, monospace' }}>{init.initiative_key}</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{init.title}</span>
                  {statusBadge(init.status)}
                </div>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div style={{ fontSize: 12, color: 'var(--fg-4)', textAlign: 'center', padding: 12 }}>No initiatives found</div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--fg-4)', textAlign: 'center', padding: 12 }}>Type at least 2 characters to search</div>
          )}
        </div>
      )}

      <style>{`
        .init-card:hover { border-color: var(--ds-text-disabled, #CBD5E1); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .unlink-btn:hover { color: var(--ds-text-danger, #EF4444) !important; }
        .link-init-btn:hover { border-color: var(--ds-text-subtlest, #94A3B8); background: var(--ds-surface-sunken, #F8FAFC); }
        /* Rule 3 paired .dark — brand red stays; neutral surfaces flip to ADS dark. */
        .dark .unlink-btn:hover { color: #F87171 !important; }
        .dark .init-card:hover { border-color: var(--ds-border-bold, #5C6F82); box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
        .dark .link-init-btn:hover { border-color: var(--ds-border-bold, #5C6F82); background: var(--ds-background-neutral-hovered, #2C333A); }
      `}</style>
    </div>
  );
}

// ── Tab: Check-ins ──
function CheckinsTab({ checkins, krs }: { checkins: KRCheckin[]; krs: KeyResult[] }) {
  const krMap = new Map(krs.map(kr => [kr.id, kr]));
  if (checkins.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Clock size={36} color="var(--ds-text-disabled, #CBD5E1)" /></div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>No check-ins recorded</div>
        <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>Check-ins will appear here when team members update key results.</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {checkins.map(ci => {
        const kr = krMap.get(ci.key_result_id);
        const isPositive = ci.delta_value >= 0;
        return (
          <div key={ci.id} style={{ borderLeft: '2px solid var(--divider)', paddingLeft: 16, marginLeft: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 4 }}>{formatDate(ci.created_at)}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', marginBottom: 4 }}>{kr?.kr_key} — {kr?.title || 'Unknown KR'}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 4 }}>
              {ci.previous_value} → {ci.new_value}
              <span style={{ color: isPositive ? 'var(--sem-success)' : 'var(--sem-danger)', marginLeft: 6 }}>({isPositive ? '+' : ''}{ci.delta_value})</span>
            </div>
            {ci.note && <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 4 }}>{ci.note}</div>}
            {ci.confidence_level != null && (
              <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>
                Confidence: {typeof ci.confidence_level === 'number' && ci.confidence_level <= 1 ? Math.round(ci.confidence_level * 100) : ci.confidence_level}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Activity ──
function ActivityTab({ goal, krs, checkins }: { goal: Goal; krs: KeyResult[]; checkins: KRCheckin[] }) {
  const items = [
    { icon: <Activity size={12} color="var(--ds-text-brand, #2563EB)" />, user: 'System', text: 'Goal created', date: goal.created_at || goal.start_date },
    ...(krs.length > 0 ? [{ icon: <BarChart3 size={12} color="#0D9488" />, user: 'System', text: `${krs.length} Key Results added`, date: goal.created_at }] : []),
    ...(checkins.length > 0 ? [{ icon: <Clock size={12} color="var(--ds-text-warning, #D97706)" />, user: 'Team', text: `${checkins.length} check-ins recorded`, date: checkins[0]?.created_at }] : []),
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((item, i) => (
        <div key={i} style={{ borderLeft: '2px solid var(--divider)', paddingLeft: 16, marginLeft: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--cp-bd-zone)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>{item.user}</span>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-3)' }}>{item.text}</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{formatDate(item.date)}</span>
        </div>
      ))}
    </div>
  );
}
