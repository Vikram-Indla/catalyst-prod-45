import { format } from 'date-fns';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Paperclip, Copy, Link2, Target, Trash2, Save, Loader2, ChevronLeft } from 'lucide-react';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { STATUS_DISPLAY, getPriorityLevel } from '@/types/initiative';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { UserAvatar } from './UserAvatar';
import { formatShortName } from '@/lib/format-name';
import { catalystToast } from '@/lib/catalystToast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { EditableField } from '@/components/producthub/shared/EditableField';
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

const TABS = ['Details', 'Score', 'Budget', 'Risks', 'Milestones', 'Links', 'Audit'] as const;
type Tab = typeof TABS[number];

const STATUS_OPTIONS = Object.entries(STATUS_DISPLAY).map(([value, cfg]) => ({
  value,
  label: cfg.label,
  color: cfg.dot,
}));

function generateQuarterOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  for (const year of [2025, 2026, 2027]) {
    for (let q = 1; q <= 4; q++) {
      const val = `Q${q} ${year}`;
      opts.push({ value: val, label: val });
    }
  }
  return opts;
}
const QUARTER_OPTIONS = generateQuarterOptions();

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
    <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', lineHeight: 1, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function FieldValue({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 400, color: '#18181b', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 6 }}>
      {children}
    </div>
  );
}

function DetailProgressBar({ value, status }: { value: number; status?: InitiativeStatus }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const fillColor = status === 'delivered' ? '#10b981' : '#2563eb';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 80, height: 6, background: '#e4e4e7', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${clamped}%`, background: fillColor, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#18181b', fontVariantNumeric: 'tabular-nums' }}>{clamped}%</span>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#3f3f46' }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#18181b', fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }}>
          {value % 1 === 0 ? value : value.toFixed(1)}
        </span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 28, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 6, background: '#e4e4e7', borderRadius: 3 }} />
        <div style={{ position: 'absolute', left: 0, height: 6, background: '#2563eb', borderRadius: 3, width: `${fillPercent}%`, pointerEvents: 'none' }} />
        <input type="range" min="1" max="5" step="0.5" value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: 28, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
        <div style={{ position: 'absolute', width: 18, height: 18, background: '#ffffff', border: '2.5px solid #2563eb', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', transform: 'translateX(-50%)', left: `${fillPercent}%`, pointerEvents: 'none', zIndex: 2 }} />
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

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditForm({});
  }, []);

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

  const handleActionClick = (label: string) => {
    switch (label) {
      case 'Edit':
        setIsEditing(true);
        break;
      case 'Attach':
        catalystToast.info('Attachments coming soon');
        break;
      case 'Clone':
        catalystToast.success('Initiative cloned successfully');
        break;
      case 'Link':
        catalystToast.info('Link management coming soon');
        break;
      case 'Score':
        setActiveTab('Score');
        panelRef.current?.querySelector('[data-body]')?.scrollTo(0, 0);
        break;
    }
  };

  const ACTION_BUTTONS = [
    { label: 'Edit', icon: Pencil },
    { label: 'Attach', icon: Paperclip },
    { label: 'Clone', icon: Copy },
    { label: 'Link', icon: Link2 },
    { label: 'Score', icon: Target },
  ];

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
                {/* Top bar: Back + actions */}
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
                    {hasChanges && (
                      <button onClick={handleSave} disabled={isSaving}
                        className="px-3 h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50">
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Changes
                      </button>
                    )}
                    <button onClick={handleAttemptClose}
                      className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md">
                      <X size={16} />
                    </button>
                  </div>
                </div>

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

                {/* Action bar — hidden in edit mode */}
                {!isEditing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 24px', borderBottom: '1px solid #f4f4f5' }}>
                    {ACTION_BUTTONS.map(({ label, icon: Icon }) => (
                      <button key={label} type="button" onClick={() => handleActionClick(label)}
                        className="hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                        style={{ height: 32, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400, color: '#52525b', border: 'none', background: 'none' }}>
                        <Icon size={14} />{label}
                      </button>
                    ))}
                    <button type="button" onClick={() => setShowDeleteDialog(true)}
                      className="hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      style={{ height: 32, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400, color: '#dc2626', border: 'none', background: 'none', marginLeft: 'auto' }}>
                      <Trash2 size={14} />Delete
                    </button>
                  </div>
                )}

                {/* Tab Bar */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e4e4e7', padding: '0 24px' }}>
                  {TABS.map(tab => (
                    <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                      style={{ padding: '12px 14px', fontSize: 13, fontWeight: activeTab === tab ? 500 : 400, color: activeTab === tab ? '#18181b' : '#71717a',
                        borderBottom: `2px solid ${activeTab === tab ? '#2563eb' : 'transparent'}`, cursor: 'pointer', whiteSpace: 'nowrap',
                        background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* BODY */}
              <div data-body style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
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
                {!['Details', 'Score'].includes(activeTab) && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 192, color: '#a1a1aa', fontSize: 13 }}>
                    {activeTab} — Coming Soon
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
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
   DETAILS TAB — Now supports edit mode
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
  const comments = MOCK_COMMENTS[initiative.initiative_key] || [];
  const getVal = (field: string, original: any) => field in editForm ? editForm[field] : original;

  return (
    <>
      {/* Title (full width, edit mode only here — also in header) */}

      {/* Description */}
      <div style={{ marginBottom: 20 }}>
        <EditableField
          label="Description"
          value={getVal('description', initiative.description)}
          isEditing={isEditing}
          type="textarea"
          onChange={v => onFieldChange('description', v)}
          onQuickEdit={v => onQuickEdit('description', v)}
          placeholder="No description provided"
        />
      </div>

      {/* Field Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 48px' }}>
        <EditableField
          label="Status"
          value={getVal('status', initiative.status)}
          isEditing={isEditing}
          type="select"
          options={STATUS_OPTIONS}
          onChange={v => onFieldChange('status', v)}
          onQuickEdit={v => { onStatusChange(initiative.id, v); onQuickEdit('status', v); }}
        />

        <EditableField
          label="Priority / Score"
          value={initiative.computed_score !== null ? `${initiative.computed_score.toFixed(1)} / 5.0` : null}
          isEditing={false}
          type="text"
          onChange={() => {}}
          readOnly
          tooltip="Scores are calculated from the Score tab"
        />

        <EditableField
          label="Department"
          value={getVal('department_name', initiative.department_name)}
          isEditing={isEditing}
          type="text"
          onChange={v => onFieldChange('department_name', v)}
          onQuickEdit={v => onQuickEdit('department_name', v)}
          placeholder="—"
        />

        <EditableField
          label="Target Quarter"
          value={getVal('target_quarter', initiative.target_quarter)}
          isEditing={isEditing}
          type="select"
          options={QUARTER_OPTIONS}
          onChange={v => onFieldChange('target_quarter', v)}
          onQuickEdit={v => onQuickEdit('target_quarter', v)}
        />

        <EditableField
          label="Assignee"
          value={getVal('assignee_name', initiative.assignee_name)}
          isEditing={isEditing}
          type="text"
          onChange={v => onFieldChange('assignee_name', v)}
          onQuickEdit={v => onQuickEdit('assignee_name', v)}
          placeholder="Unassigned"
        />

        <EditableField
          label="Business Owner"
          value={getVal('business_owner_name', initiative.business_owner_name)}
          isEditing={isEditing}
          type="text"
          onChange={v => onFieldChange('business_owner_name', v)}
          onQuickEdit={v => onQuickEdit('business_owner_name', v)}
          placeholder="—"
        />

        <EditableField
          label="Reporter"
          value={getVal('reporter_id', 'Mohammed A.')}
          isEditing={isEditing}
          type="text"
          onChange={v => onFieldChange('reporter_id', v)}
          onQuickEdit={v => onQuickEdit('reporter_id', v)}
          placeholder="—"
        />

        <EditableField
          label="Progress"
          value={getVal('progress', initiative.progress)}
          isEditing={isEditing}
          type="range"
          onChange={v => onFieldChange('progress', v)}
          onQuickEdit={v => onQuickEdit('progress', v)}
        />

        <EditableField
          label="Business Ask Date"
          value={getVal('business_ask_date', initiative.business_ask_date)}
          isEditing={isEditing}
          type="date"
          onChange={v => onFieldChange('business_ask_date', v)}
          onQuickEdit={v => onQuickEdit('business_ask_date', v)}
        />

        <EditableField
          label="Kickoff Date"
          value={getVal('kickoff_date', initiative.kickoff_date)}
          isEditing={isEditing}
          type="date"
          onChange={v => onFieldChange('kickoff_date', v)}
          onQuickEdit={v => onQuickEdit('kickoff_date', v)}
        />

        <EditableField
          label="Target Complete"
          value={getVal('target_complete', initiative.target_complete)}
          isEditing={isEditing}
          type="date"
          onChange={v => onFieldChange('target_complete', v)}
          onQuickEdit={v => onQuickEdit('target_complete', v)}
        />
      </div>

      {/* Comments */}
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f4f4f5' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#18181b', marginBottom: 16, lineHeight: 1 }}>
          Comments ({comments.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {comments.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < comments.length - 1 ? '1px solid #fafafa' : 'none' }}>
              <InlineAvatar name={c.author} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#18181b' }}>{formatShortName(c.author)}</span>
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#a1a1aa' }}>{c.timeAgo}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.55, color: '#52525b', margin: 0 }}>{c.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingTop: 16, marginTop: 16, borderTop: '1px solid #f4f4f5' }}>
          <InlineAvatar name="AK" size={28} />
          <input type="text" placeholder="Write a comment..."
            className="flex-1 h-10 border border-zinc-200 rounded-md px-3 text-[13px] text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            style={{ background: '#fafafa' }} />
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
    <div style={{ display: 'flex', gap: 24, minHeight: 400 }}>
      <div style={{ flex: 3, display: 'flex', flexDirection: 'column' }}>
        <ScoreSlider label="Strategic Alignment" value={scores.sa} onChange={(v) => onScoreChange({ ...scores, sa: v })} />
        <ScoreSlider label="Business Impact" value={scores.bi} onChange={(v) => onScoreChange({ ...scores, bi: v })} />
        <ScoreSlider label="Time & Urgency" value={scores.tu} onChange={(v) => onScoreChange({ ...scores, tu: v })} />
        <ScoreSlider label="Resource & Feasibility" value={scores.rf} onChange={(v) => onScoreChange({ ...scores, rf: v })} />
        <button type="button" onClick={onSave}
          className="w-full h-[38px] bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium border-none rounded-md cursor-pointer mt-auto transition-colors">
          Save Score
        </button>
      </div>
      <div style={{ flex: 2, background: '#fafafa', border: '1px solid #f4f4f5', borderRadius: 10, padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 52, fontWeight: 700, color: '#18181b', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginBottom: 10 }}>
          {computedScore.toFixed(1)}
        </div>
        <div style={{ marginBottom: 16 }}><PriorityBadge score={computedScore} size="md" showScore={false} /></div>
        <div style={{ margin: '8px 0' }}><RadarChart scores={[scores.sa, scores.bi, scores.tu, scores.rf]} /></div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e4e4e7', width: '100%' }}>
          <p style={{ fontSize: 12, fontWeight: 400, color: '#71717a', lineHeight: 1.55, textAlign: 'center', margin: 0 }}>
            {priority.level === 'High' && <>Score of {computedScore.toFixed(1)} falls in the <strong style={{ color: '#3f3f46', fontWeight: 600 }}>High</strong> range (4.0-5.0).</>}
            {priority.level === 'Medium' && <>Score of {computedScore.toFixed(1)} falls in the <strong style={{ color: '#3f3f46', fontWeight: 600 }}>Medium</strong> range (3.0-3.9).</>}
            {priority.level === 'Low' && <>Score of {computedScore.toFixed(1)} falls in the <strong style={{ color: '#3f3f46', fontWeight: 600 }}>Low</strong> range (2.0-2.9).</>}
            {priority.level === 'Rejected' && <>Score of {computedScore.toFixed(1)} falls in the <strong style={{ color: '#3f3f46', fontWeight: 600 }}>Rejected</strong> range (1.0-1.9).</>}
            {priority.level === 'Unscored' && 'This initiative has not been scored yet.'}
          </p>
        </div>
      </div>
    </div>
  );
}
