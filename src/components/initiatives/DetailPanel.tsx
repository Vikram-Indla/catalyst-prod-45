import { format } from 'date-fns';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Copy, Target, Trash2, Save, Loader2, ChevronLeft, AlertTriangle, Plus, Activity, ArrowRight, TrendingUp } from 'lucide-react';
import { InitiativeRisksTab } from './tabs/InitiativeRisksTab';
import { InitiativeBudgetTab } from './tabs/InitiativeBudgetTab';
import { InitiativeAuditTab } from './tabs/InitiativeAuditTab';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { STATUS_DISPLAY, getPriorityLevel } from '@/types/initiative';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { formatShortName } from '@/lib/format-name';
import { catalystToast } from '@/lib/catalystToast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useDepartmentOptions, useProfileOptions } from '@/hooks/useInitiativeLookups';
import { StatusSelect } from '@/components/producthub/shared/StatusSelect';
import { QuarterSelect } from '@/components/producthub/shared/QuarterSelect';
import { PeopleSelect } from '@/components/producthub/shared/PeopleSelect';
import { DepartmentSelect } from '@/components/producthub/shared/DepartmentSelect';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DetailPanelProps {
  initiative: Initiative | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: InitiativeStatus) => void;
  onScoreSave: (id: string, scores: { strategic_alignment: number; business_impact: number; time_urgency: number; resource_feasibility: number }) => void;
}

const TABS = ['Details', 'Score', 'Budget', 'Risks', 'Audit'] as const;
type Tab = typeof TABS[number];

const AVATAR_COLORS: Record<string, string> = {
  'Sarah': '#6366f1', 'Ahmed': '#10b981', 'Fatima': '#ec4899', 'Omar': '#f97316',
  'Layla': '#06b6d4', 'Khalid': '#8b5cf6', 'Nora': '#f43f5e', 'Mohammed': '#0d9488',
  'Ahmad': '#0d9488', 'Amira': '#6366f1', 'Tariq': '#f97316', 'Salman': '#10b981',
  'Mansour': '#8b5cf6', 'Waleed': '#06b6d4',
};

function getV5AvatarColor(name: string): string {
  return AVATAR_COLORS[name.split(' ')[0]] || '#6366f1';
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function InlineAvatar({ name, size = 20 }: { name: string; size?: number }) {
  const fontSize = size <= 20 ? 9 : size <= 24 ? 10 : 11;
  return (
    <div className="rounded-full flex items-center justify-center text-white flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: getV5AvatarColor(name), fontSize, fontWeight: 600, lineHeight: 1 }}>
      {getInitials(name)}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">
      {children}
    </div>
  );
}

function DetailProgressBar({ value, status }: { value: number; status?: InitiativeStatus }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const fillColor = status === 'delivered' ? '#10b981' : '#2563eb';
  return (
    <div className="inline-flex items-center gap-2">
      <div className="w-20 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${clamped}%`, background: fillColor }} />
      </div>
      <span className="text-[13px] font-medium text-zinc-900 tabular-nums">{clamped}%</span>
    </div>
  );
}

function RadarChart({ scores }: { scores: [number, number, number, number] }) {
  const size = 160; const cx = size / 2; const cy = size / 2; const r = 56;
  const labels = ['SA', 'BI', 'TU', 'RF'];
  const angles = scores.map((_, i) => (Math.PI / 2) + (2 * Math.PI * i) / 4);
  const axisPoints = angles.map(a => ({ x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }));
  const dataPoints = scores.map((s, i) => {
    const ratio = (s || 0) / 5;
    return { x: cx + r * ratio * Math.cos(angles[i]), y: cy - r * ratio * Math.sin(angles[i]) };
  });
  const poly = dataPoints.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.2, 0.4, 0.6, 0.8, 1].map((s, i) => (
        <polygon key={i} points={angles.map(a => `${cx + r * s * Math.cos(a)},${cy - r * s * Math.sin(a)}`).join(' ')} fill="none" stroke="#e4e4e7" strokeWidth="0.5" />
      ))}
      {axisPoints.map((p, i) => (
        <g key={i}>
          <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e4e4e7" strokeWidth="0.5" />
          <text x={p.x + (p.x > cx ? 8 : p.x < cx ? -8 : 0)} y={p.y + (p.y > cy ? 14 : p.y < cy ? -6 : 0)} textAnchor="middle" style={{ fontSize: 9, fill: '#71717a' }}>{labels[i]}</text>
        </g>
      ))}
      <polygon points={poly} fill="rgba(37,99,235,0.10)" stroke="#2563eb" strokeWidth="1.5" />
      {dataPoints.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r="3" fill="#2563eb" />))}
    </svg>
  );
}

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const fillPercent = ((value - 1) / 4) * 100;
  return (
    <div style={{ marginBottom: 28 }}>
      <div className="flex justify-between items-baseline mb-3">
        <span className="text-[13px] font-medium text-zinc-600">{label}</span>
        <span className="text-[15px] font-bold text-zinc-900 tabular-nums min-w-[28px] text-right">
          {value % 1 === 0 ? value : value.toFixed(1)}
        </span>
      </div>
      <div className="relative w-full h-7 flex items-center cursor-pointer">
        <div className="absolute left-0 right-0 h-1.5 bg-zinc-200 rounded-full" />
        <div className="absolute left-0 h-1.5 bg-blue-600 rounded-full pointer-events-none" style={{ width: `${fillPercent}%` }} />
        <input type="range" min="1" max="5" step="0.5" value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-7 opacity-0 cursor-pointer z-10" />
        <div className="absolute w-[18px] h-[18px] bg-white border-[2.5px] border-blue-600 rounded-full shadow-sm pointer-events-none z-[2]"
          style={{ left: `${fillPercent}%`, transform: 'translateX(-50%)' }} />
      </div>
    </div>
  );
}

function formatAbsoluteDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return format(d, 'MMM d, yyyy');
}

const MOCK_COMMENTS: Record<string, { author: string; content: string; timeAgo: string }[]> = {
  'MIM-001': [
    { author: 'Ahmed M.', content: 'Reviewed the architecture proposal. Aligning with the cloud migration timeline is critical.', timeAgo: '2 days ago' },
    { author: 'Sarah K.', content: "Agreed. I've updated the dependency map to reflect the Q1 milestones.", timeAgo: '1 day ago' },
  ],
  'MIM-002': [
    { author: 'Ahmed M.', content: 'Migration plan finalized. Ready for stakeholder review.', timeAgo: '3 hours ago' },
  ],
};

/* ════════════════════════════════════════════════════
   MAIN DETAIL PANEL
   ════════════════════════════════════════════════════ */
export function DetailPanel({ initiative, isOpen, onClose, onStatusChange, onScoreSave }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Details');
  const [scores, setScores] = useState({ sa: 3.0, bi: 3.0, tu: 3.0, rf: 3.0 });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [budgetAllocated, setBudgetAllocated] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const hasChanges = Object.keys(editForm).length > 0;

  useEffect(() => {
    if (initiative) {
      setScores({
        sa: initiative.score_strategic_alignment ?? 3.0,
        bi: initiative.score_business_impact ?? 3.0,
        tu: initiative.score_time_urgency ?? 3.0,
        rf: initiative.score_resource_feasibility ?? 3.0,
      });
      setBudgetAllocated((initiative as any).budget_allocated ?? 0);
      setActiveTab('Details');
      setIsEditing(false);
      setEditForm({});
    }
  }, [initiative]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleAttemptClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, isEditing, hasChanges]);

  const computedScore = +((scores.sa + scores.bi + scores.tu + scores.rf) / 4).toFixed(1);
  const priority = getPriorityLevel(computedScore);

  const handleAttemptClose = useCallback(() => {
    if (isEditing && hasChanges) {
      setShowDiscardDialog(true);
    } else {
      setIsEditing(false);
      setEditForm({});
      onClose();
    }
  }, [isEditing, hasChanges, onClose]);

  const handleDiscardAndClose = useCallback(() => {
    setShowDiscardDialog(false);
    setIsEditing(false);
    setEditForm({});
    onClose();
  }, [onClose]);

  const getFieldValue = useCallback((field: string, original: any) => {
    return field in editForm ? editForm[field] : original;
  }, [editForm]);

  const updateEditField = useCallback((field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!initiative || !hasChanges) return;
    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('ph_initiatives')
        .update({ ...editForm, updated_at: new Date().toISOString() })
        .eq('id', initiative.id);
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives-mock'] });
      catalystToast.success('Initiative updated');
      setIsEditing(false);
      setEditForm({});
    } catch (err: any) {
      catalystToast.error('Failed to update: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }, [initiative, editForm, hasChanges, queryClient]);

  const handleQuickEdit = useCallback(async (field: string, value: any) => {
    if (!initiative) return;
    try {
      const { error } = await (supabase as any)
        .from('ph_initiatives')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', initiative.id);
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives-mock'] });
      catalystToast.success(`${field.replace(/_/g, ' ')} updated`);
    } catch (err: any) {
      catalystToast.error('Failed to update: ' + err.message);
    }
  }, [initiative, queryClient]);

  if (!initiative) return null;

  const handleClone = async () => {
    try {
      // Generate next key
      const { data: existing } = await (supabase as any)
        .from('ph_initiatives')
        .select('initiative_key')
        .order('created_at', { ascending: false })
        .limit(100);
      const maxNum = (existing || []).reduce((max: number, r: any) => {
        const num = parseInt(r.initiative_key?.replace(/[A-Z]+-/, '') || '0');
        return num > max ? num : max;
      }, 0);
      const prefix = initiative.initiative_key?.replace(/-\d+$/, '') || 'MIM';
      const nextKey = `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;

      // Clone initiative
      const { data: newInit, error: cloneErr } = await (supabase as any)
        .from('ph_initiatives')
        .insert({
          title: `${initiative.title} (Copy)`,
          initiative_key: nextKey,
          description: initiative.description,
          status: 'backlog',
          progress: 0,
          department_id: initiative.department_id,
          assignee_id: initiative.assignee_id,
          business_owner_id: initiative.business_owner_id,
          target_quarter: initiative.target_quarter,
          budget_allocated: (initiative as any).budget_allocated || 0,
        })
        .select()
        .single();

      if (cloneErr) throw new Error(cloneErr.message);

      // Clone budget items
      const { data: budgetItems } = await (supabase as any)
        .from('ph_initiative_budget_items')
        .select('*')
        .eq('initiative_id', initiative.id);
      if (budgetItems?.length) {
        await (supabase as any).from('ph_initiative_budget_items').insert(
          budgetItems.map(({ id, initiative_id, created_at, updated_at, ...item }: any) => ({
            ...item, initiative_id: newInit.id
          }))
        );
      }

      // Clone risks
      const { data: risks } = await (supabase as any)
        .from('ph_initiative_risks')
        .select('*')
        .eq('initiative_id', initiative.id);
      if (risks?.length) {
        await (supabase as any).from('ph_initiative_risks').insert(
          risks.map(({ id, initiative_id, created_at, updated_at, risk_score, ...item }: any) => ({
            ...item, initiative_id: newInit.id, risk_score: item.probability * item.impact,
          }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives-mock'] });
      catalystToast.success(`Cloned as ${nextKey} with all data`);
    } catch (err: any) {
      catalystToast.error('Failed to clone: ' + err.message);
    }
  };

  const handleActionClick = (label: string) => {
    switch (label) {
      case 'Edit':
        setIsEditing(true);
        break;
      case 'Clone':
        handleClone();
        break;
      case 'Score':
        setActiveTab('Score');
        panelRef.current?.querySelector('[data-body]')?.scrollTo(0, 0);
        break;
    }
  };

  const ACTION_BUTTONS = [
    { label: 'Edit', icon: Pencil },
    { label: 'Clone', icon: Copy },
    { label: 'Score', icon: Target },
  ];

  const handleUpdateBudgetAllocated = async (value: string) => {
    if (!initiative) return;
    const amount = parseFloat(value) || 0;
    setBudgetAllocated(amount);
    await (supabase as any)
      .from('ph_initiatives')
      .update({ budget_allocated: amount, updated_at: new Date().toISOString() })
      .eq('id', initiative.id);
    queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div className="fixed inset-0 z-[55]" style={{ background: 'rgba(0,0,0,0.20)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={handleAttemptClose} />
            <motion.div ref={panelRef} className="fixed top-0 right-0 h-screen z-[60] flex flex-col overflow-hidden"
              style={{ width: '55%', maxWidth: 840, minWidth: 560, background: '#ffffff', boxShadow: '-8px 0 24px rgba(0,0,0,0.12)' }}
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}>

              {/* STICKY HEADER */}
              <div className="flex-shrink-0 bg-white sticky top-0 z-10">
                {/* Top bar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-100">
                  <button onClick={handleAttemptClose}
                    className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                    Back to list
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowDeleteDialog(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                    <button onClick={handleAttemptClose}
                      className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Edit mode banner */}
                {isEditing && (
                  <div className="flex items-center justify-between px-6 py-2.5 bg-blue-50 border-b border-blue-200">
                    <div className="flex items-center gap-2">
                      <Pencil className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Editing Initiative</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setIsEditing(false); setEditForm({}); }}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleSave} disabled={isSaving || !hasChanges}
                        className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50">
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Initiative identity */}
                <div className="px-6 pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium font-mono shrink-0">
                      {initiative.initiative_key}
                    </span>
                    {initiative.is_favorited && (
                      <span className="text-amber-500 text-sm">★</span>
                    )}
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={getFieldValue('title', initiative.title)}
                      onChange={e => updateEditField('title', e.target.value)}
                      className="w-full text-lg font-semibold text-zinc-900 border border-zinc-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  ) : (
                    <h2 className="text-lg font-semibold text-zinc-900 leading-tight">{initiative.title}</h2>
                  )}
                  <div className="mt-3">
                    <StatusBadge status={getFieldValue('status', initiative.status) as InitiativeStatus} editable={isEditing}
                      onChange={(s) => { if (isEditing) updateEditField('status', s); else { onStatusChange(initiative.id, s); handleQuickEdit('status', s); } }} />
                  </div>
                </div>

                {/* Action bar — visible when NOT editing */}
                {!isEditing && (
                  <div className="flex items-center gap-1 px-6 py-3 border-b border-zinc-100">
                    {ACTION_BUTTONS.map(({ label, icon: Icon }) => (
                      <button key={label} type="button" onClick={() => handleActionClick(label)}
                        className="h-8 px-3 inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:bg-zinc-100 rounded-md transition-colors">
                        <Icon size={14} />{label}
                      </button>
                    ))}
                    <button type="button" onClick={() => setShowDeleteDialog(true)}
                      className="h-8 px-3 inline-flex items-center gap-1.5 text-[13px] text-red-600 hover:bg-red-50 rounded-md transition-colors ml-auto">
                      <Trash2 size={14} />Delete
                    </button>
                  </div>
                )}

                {/* Tab Bar — 5 tabs only */}
                <div className="flex gap-0 border-b border-zinc-200 px-6">
                  {TABS.map(tab => (
                    <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                      className={`px-3.5 py-3 text-[13px] whitespace-nowrap border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        activeTab === tab
                          ? 'font-medium text-zinc-900 border-blue-600'
                          : 'font-normal text-zinc-500 border-transparent hover:text-zinc-700'
                      }`}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* BODY */}
              <div data-body className="flex-1 overflow-y-auto p-6">
                {activeTab === 'Details' && (
                  <DetailsContent
                    initiative={initiative}
                    isEditing={isEditing}
                    editForm={editForm}
                    onFieldChange={updateEditField}
                    onQuickEdit={handleQuickEdit}
                    onStatusChange={onStatusChange}
                  />
                )}
                {activeTab === 'Score' && (
                  <ScoreContent initiative={initiative} scores={scores} computedScore={computedScore} priority={priority}
                    onScoreChange={setScores}
                    onSave={() => onScoreSave(initiative.id, { strategic_alignment: scores.sa, business_impact: scores.bi, time_urgency: scores.tu, resource_feasibility: scores.rf })} />
                )}
                {activeTab === 'Budget' && (
                  <InitiativeBudgetTab
                    initiativeId={initiative.id}
                    budgetAllocated={budgetAllocated}
                    onBudgetAllocatedChange={handleUpdateBudgetAllocated}
                  />
                )}
                {activeTab === 'Risks' && <InitiativeRisksTab initiativeId={initiative.id} />}
                {activeTab === 'Audit' && <InitiativeAuditTab initiativeId={initiative.id} />}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation — soft delete */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              Delete Initiative?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="text-sm text-zinc-500 mb-1">Are you sure you want to delete:</p>
                <p className="text-sm font-medium text-zinc-900">{initiative?.initiative_key}: {initiative?.title}</p>
                <p className="text-xs text-zinc-400 mt-2">This can be undone from the archive.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 px-4 h-9 rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-white bg-red-600 hover:bg-red-700 px-4 h-9 rounded-md flex items-center gap-1.5"
              onClick={async () => {
                if (!initiative?.id) return;
                try {
                  const { error } = await (supabase as any)
                    .from('ph_initiatives')
                    .update({ is_deleted: true })
                    .eq('id', initiative.id);
                  if (error) throw new Error(error.message);
                  queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
                  queryClient.invalidateQueries({ queryKey: ['ph-initiatives-mock'] });
                  catalystToast.success(`${initiative.initiative_key} deleted`);
                  onClose();
                } catch (err: any) {
                  catalystToast.error('Failed to delete: ' + err.message);
                }
              }}>
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Changes Confirmation */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes. Discard them?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 px-4 h-9 rounded-md">Keep Editing</AlertDialogCancel>
            <AlertDialogAction className="text-white bg-red-600 hover:bg-red-700 px-4 h-9 rounded-md" onClick={handleDiscardAndClose}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ════════════════════════════════════════════════════
   DETAILS TAB — No score/priority field, custom dropdowns
   ════════════════════════════════════════════════════ */
function DetailsContent({
  initiative,
  isEditing,
  editForm,
  onFieldChange,
  onQuickEdit,
  onStatusChange,
}: {
  initiative: Initiative;
  isEditing: boolean;
  editForm: Record<string, any>;
  onFieldChange: (field: string, value: any) => void;
  onQuickEdit: (field: string, value: any) => void;
  onStatusChange: (id: string, s: InitiativeStatus) => void;
}) {
  const { data: departmentOptions } = useDepartmentOptions();
  const { data: profileOptions } = useProfileOptions();
  const comments = MOCK_COMMENTS[initiative.initiative_key] || [];
  const getVal = (field: string, original: any) => field in editForm ? editForm[field] : original;

  return (
    <>
      {/* Description */}
      <div className="mb-5">
        <FieldLabel>Description</FieldLabel>
        {isEditing ? (
          <textarea
            value={getVal('description', initiative.description) ?? ''}
            onChange={e => onFieldChange('description', e.target.value)}
            rows={4}
            placeholder="Describe this initiative..."
            className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
          />
        ) : (
          <p className="text-[13px] text-zinc-700 leading-relaxed">{initiative.description || <span className="text-zinc-400 italic">No description provided</span>}</p>
        )}
      </div>

      {/* Field Grid — NO score/priority field */}
      <div className="grid grid-cols-2 gap-4 gap-x-8">
        {/* Status */}
        <div>
          <FieldLabel>Status</FieldLabel>
          {isEditing ? (
            <StatusSelect
              value={getVal('status', initiative.status)}
              onChange={v => onFieldChange('status', v)}
            />
          ) : (
            <StatusBadge status={initiative.status} />
          )}
        </div>

        {/* Department */}
        <div>
          <FieldLabel>Department</FieldLabel>
          {isEditing ? (
            <DepartmentSelect
              value={getVal('department_id', initiative.department_id) ?? ''}
              onChange={v => onFieldChange('department_id', v)}
              departments={departmentOptions || []}
            />
          ) : (
            <div className="text-[13px] text-zinc-900">{initiative.department_name || <span className="text-zinc-400">—</span>}</div>
          )}
        </div>

        {/* Quarter */}
        <div>
          <FieldLabel>Target Quarter</FieldLabel>
          {isEditing ? (
            <QuarterSelect
              value={getVal('target_quarter', initiative.target_quarter) ?? ''}
              onChange={v => onFieldChange('target_quarter', v)}
            />
          ) : (
            <div className="text-[13px] text-zinc-900">{initiative.target_quarter || <span className="text-zinc-400">—</span>}</div>
          )}
        </div>

        {/* Assignee */}
        <div>
          <FieldLabel>Assignee</FieldLabel>
          {isEditing ? (
            <PeopleSelect
              value={getVal('assignee_id', initiative.assignee_id) ?? ''}
              onChange={v => onFieldChange('assignee_id', v)}
              profiles={profileOptions || []}
              placeholder="Select assignee"
            />
          ) : (
            <div className="text-[13px] text-zinc-900 flex items-center gap-2">
              {initiative.assignee_name ? (
                <>
                  <InlineAvatar name={initiative.assignee_name} size={20} />
                  {initiative.assignee_name}
                </>
              ) : <span className="text-zinc-400">—</span>}
            </div>
          )}
        </div>

        {/* Business Owner */}
        <div>
          <FieldLabel>Business Owner</FieldLabel>
          {isEditing ? (
            <PeopleSelect
              value={getVal('business_owner_id', initiative.business_owner_id) ?? ''}
              onChange={v => onFieldChange('business_owner_id', v)}
              profiles={profileOptions || []}
              placeholder="Select business owner"
            />
          ) : (
            <div className="text-[13px] text-zinc-900 flex items-center gap-2">
              {initiative.business_owner_name ? (
                <>
                  <InlineAvatar name={initiative.business_owner_name} size={20} />
                  {initiative.business_owner_name}
                </>
              ) : <span className="text-zinc-400">—</span>}
            </div>
          )}
        </div>

        {/* Reporter */}
        <div>
          <FieldLabel>Reporter</FieldLabel>
          {isEditing ? (
            <PeopleSelect
              value={getVal('reporter_id', initiative.reporter_id) ?? ''}
              onChange={v => onFieldChange('reporter_id', v)}
              profiles={profileOptions || []}
              placeholder="Select reporter"
            />
          ) : (
            <div className="text-[13px] text-zinc-900 flex items-center gap-2">
              {initiative.reporter_id ? (
                <>
                  {(() => {
                    const rp = profileOptions?.find(p => p.value === initiative.reporter_id);
                    const name = rp?.label || initiative.reporter_id || '';
                    return <><InlineAvatar name={name} size={20} />{name}</>;
                  })()}
                </>
              ) : <span className="text-zinc-400">—</span>}
            </div>
          )}
        </div>

        {/* Progress */}
        <div>
          <FieldLabel>Progress</FieldLabel>
          {isEditing ? (
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={Number(getVal('progress', initiative.progress)) || 0}
                onChange={e => onFieldChange('progress', Number(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <span className="text-sm font-medium text-zinc-700 tabular-nums w-10 text-right">{getVal('progress', initiative.progress) ?? 0}%</span>
            </div>
          ) : (
            <DetailProgressBar value={initiative.progress} status={initiative.status} />
          )}
        </div>

        {/* Business Ask Date */}
        <div>
          <FieldLabel>Business Ask Date</FieldLabel>
          {isEditing ? (
            <input type="date"
              value={getVal('business_ask_date', initiative.business_ask_date) ? String(getVal('business_ask_date', initiative.business_ask_date)).slice(0, 10) : ''}
              onChange={e => onFieldChange('business_ask_date', e.target.value || null)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          ) : (
            <div className="text-[13px] text-zinc-900">{formatAbsoluteDate(initiative.business_ask_date)}</div>
          )}
        </div>

        {/* Kickoff Date */}
        <div>
          <FieldLabel>Kickoff Date</FieldLabel>
          {isEditing ? (
            <input type="date"
              value={getVal('kickoff_date', initiative.kickoff_date) ? String(getVal('kickoff_date', initiative.kickoff_date)).slice(0, 10) : ''}
              onChange={e => onFieldChange('kickoff_date', e.target.value || null)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          ) : (
            <div className="text-[13px] text-zinc-900">{formatAbsoluteDate(initiative.kickoff_date)}</div>
          )}
        </div>

        {/* Target Complete */}
        <div>
          <FieldLabel>Target Complete</FieldLabel>
          {isEditing ? (
            <input type="date"
              value={getVal('target_complete', initiative.target_complete) ? String(getVal('target_complete', initiative.target_complete)).slice(0, 10) : ''}
              onChange={e => onFieldChange('target_complete', e.target.value || null)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          ) : (
            <div className="text-[13px] text-zinc-900">{formatAbsoluteDate(initiative.target_complete)}</div>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="mt-6 pt-5 border-t border-zinc-100">
        <div className="text-[13px] font-semibold text-zinc-900 mb-4">
          Comments ({comments.length})
        </div>
        <div className="flex flex-col">
          {comments.map((c, i) => (
            <div key={i} className="flex gap-3 py-3" style={{ borderBottom: i < comments.length - 1 ? '1px solid #fafafa' : 'none' }}>
              <InlineAvatar name={c.author} size={28} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-medium text-zinc-900">{formatShortName(c.author)}</span>
                  <span className="text-xs text-zinc-400">{c.timeAgo}</span>
                </div>
                <p className="text-[13px] text-zinc-600 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 items-center pt-4 mt-4 border-t border-zinc-100">
          <InlineAvatar name="AK" size={28} />
          <input type="text" placeholder="Write a comment..."
            className="flex-1 h-10 border border-zinc-200 rounded-md px-3 text-[13px] text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-zinc-50"
          />
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════
   SCORE TAB
   ════════════════════════════════════════════════════ */
function ScoreContent({
  scores, computedScore, priority, onScoreChange, onSave,
}: {
  initiative: Initiative;
  scores: { sa: number; bi: number; tu: number; rf: number };
  computedScore: number;
  priority: ReturnType<typeof getPriorityLevel>;
  onScoreChange: (s: typeof scores) => void;
  onSave: () => void;
}) {
  return (
    <div className="flex gap-6 min-h-[400px]">
      <div className="flex-[3] flex flex-col">
        <ScoreSlider label="Strategic Alignment" value={scores.sa} onChange={(v) => onScoreChange({ ...scores, sa: v })} />
        <ScoreSlider label="Business Impact" value={scores.bi} onChange={(v) => onScoreChange({ ...scores, bi: v })} />
        <ScoreSlider label="Time & Urgency" value={scores.tu} onChange={(v) => onScoreChange({ ...scores, tu: v })} />
        <ScoreSlider label="Resource & Feasibility" value={scores.rf} onChange={(v) => onScoreChange({ ...scores, rf: v })} />
        <button type="button" onClick={onSave}
          className="w-full h-[38px] bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-md mt-auto transition-colors">
          Save Score
        </button>
      </div>
      <div className="flex-[2] bg-zinc-50 border border-zinc-100 rounded-xl p-5 flex flex-col items-center">
        <div className="text-[52px] font-bold text-zinc-900 leading-none tracking-tight tabular-nums mb-2.5">
          {computedScore.toFixed(1)}
        </div>
        <div className="mb-4"><PriorityBadge score={computedScore} size="md" showScore={false} /></div>
        <div className="my-2"><RadarChart scores={[scores.sa, scores.bi, scores.tu, scores.rf]} /></div>
        <div className="mt-3.5 pt-3.5 border-t border-zinc-200 w-full">
          <p className="text-xs text-zinc-500 leading-relaxed text-center">
            {priority.level === 'High' && <>Score of {computedScore.toFixed(1)} falls in the <strong className="text-zinc-700">High</strong> range (4.0-5.0).</>}
            {priority.level === 'Medium' && <>Score of {computedScore.toFixed(1)} falls in the <strong className="text-zinc-700">Medium</strong> range (3.0-3.9).</>}
            {priority.level === 'Low' && <>Score of {computedScore.toFixed(1)} falls in the <strong className="text-zinc-700">Low</strong> range (2.0-2.9).</>}
            {priority.level === 'Rejected' && <>Score of {computedScore.toFixed(1)} falls in the <strong className="text-zinc-700">Rejected</strong> range (1.0-1.9).</>}
            {priority.level === 'Unscored' && 'This initiative has not been scored yet.'}
          </p>
        </div>
      </div>
    </div>
  );
}
