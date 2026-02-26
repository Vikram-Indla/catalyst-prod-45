import { format } from 'date-fns';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Copy, Star, Target, Trash2, ChevronLeft, ChevronDown, AlertTriangle, Plus, Activity, ArrowRight, TrendingUp, FolderKanban, Zap, Wrench, Map, Network, DollarSign, Flag, Link as LinkIcon, ClipboardList, Paperclip, ExternalLink, Upload } from 'lucide-react';
import { InitiativeRisksTab } from './tabs/InitiativeRisksTab';
import { InitiativeBudgetTab } from './tabs/InitiativeBudgetTab';
import { InitiativeAuditTab } from './tabs/InitiativeAuditTab';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { STATUS_DISPLAY, getPriorityLevel } from '@/types/initiative';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { catalystToast } from '@/lib/catalystToast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useDepartmentOptions, useProfileOptions } from '@/hooks/useInitiativeLookups';
import { StatusSelect } from '@/components/producthub/shared/StatusSelect';
import { QuarterSelect } from '@/components/producthub/shared/QuarterSelect';
import { PeopleSelect } from '@/components/producthub/shared/PeopleSelect';
import { DepartmentSelect } from '@/components/producthub/shared/DepartmentSelect';
import { usePromoteToRoadmap, useRemoveFromRoadmap } from '@/hooks/useRoadmapPromotion';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import '@/styles/product-backlog.css';

interface DetailPanelProps {
  initiative: Initiative | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: InitiativeStatus) => void;
  onScoreSave: (id: string, scores: { strategic_alignment: number; business_impact: number; time_urgency: number; resource_feasibility: number }) => void;
}

const TABS = ['Details', 'Score', 'Budget', 'Risks', 'Milestones', 'Links', 'Audit'] as const;
type Tab = typeof TABS[number];

function isNativeInitiative(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function getV5AvatarColor(name: string): string {
  const colors = ['#2563eb', '#0d9488', '#0369a1', '#d97706', '#0891b2', '#1e40af', '#b45309', '#0f766e', '#475569', '#334155'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function invalidateAllInitiatives(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
  queryClient.invalidateQueries({ queryKey: ['backlog-initiatives'] });
  queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
  queryClient.invalidateQueries({ queryKey: ['roadmap-summary'] });
}

function InlineAvatar({ name, size = 20, avatarUrl }: { name: string; size?: number; avatarUrl?: string }) {
  if (avatarUrl) return <img src={avatarUrl} alt={name} className="rounded-full flex-shrink-0 object-cover" style={{ width: size, height: size }} />;
  return (
    <div className="pb-avatar" style={{ width: size, height: size, backgroundColor: getV5AvatarColor(name), fontSize: size <= 20 ? 9 : 10 }}>
      {getInitials(name)}
    </div>
  );
}

function formatAbsoluteDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return format(d, 'MMM d, yyyy');
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
        <polygon key={i} points={angles.map(a => `${cx + r * s * Math.cos(a)},${cy - r * s * Math.sin(a)}`).join(' ')} fill="none" stroke="var(--pb-border)" strokeWidth="0.5" />
      ))}
      {axisPoints.map((p, i) => (
        <g key={i}>
          <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--pb-border)" strokeWidth="0.5" />
          <text x={p.x + (p.x > cx ? 8 : p.x < cx ? -8 : 0)} y={p.y + (p.y > cy ? 14 : p.y < cy ? -6 : 0)} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--pb-ink-muted)' }}>{labels[i]}</text>
        </g>
      ))}
      <polygon points={poly} fill="rgba(37,99,235,0.10)" stroke="var(--pb-primary)" strokeWidth="1.5" />
      {dataPoints.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--pb-primary)" />))}
    </svg>
  );
}

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const fillPercent = ((value - 1) / 4) * 100;
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--pb-ink-tertiary)' }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--pb-ink)', fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }}>
          {value % 1 === 0 ? value : value.toFixed(1)}
        </span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 28, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 6, background: 'var(--pb-surface-tertiary)', borderRadius: 3 }} />
        <div style={{ position: 'absolute', left: 0, height: 6, background: 'var(--pb-primary)', borderRadius: 3, width: `${fillPercent}%`, pointerEvents: 'none' }} />
        <input type="range" min="1" max="5" step="0.5" value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: 28, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
        <div style={{ position: 'absolute', width: 18, height: 18, background: '#fff', border: '2.5px solid var(--pb-primary)', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', pointerEvents: 'none', zIndex: 2, left: `${fillPercent}%`, transform: 'translateX(-50%)' }} />
      </div>
    </div>
  );
}

/* ── Inline Editable Title ── */
function InlineEditableTitle({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
  };
  if (!editing) {
    return (
      <h2 className="pb-panel-title group cursor-pointer" onClick={() => { setDraft(value); setEditing(true); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {value}
        <Pencil size={12} style={{ opacity: 0, transition: 'opacity 0.15s' }} className="group-hover:!opacity-60" />
      </h2>
    );
  }
  return (
    <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      style={{ width: '100%', fontFamily: 'var(--pb-font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--pb-ink)', border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-md)', padding: '6px 12px', outline: 'none' }}
    />
  );
}

/* ── Inline Editable Date ── */
function InlineEditableDate({ value, onSave, label }: { value: string | null; onSave: (v: string | null) => void; label: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const commit = () => { setEditing(false); const v = draft || null; if (v !== (value ?? null)) onSave(v); };
  if (!editing) {
    return (
      <span className="pb-field-value group cursor-pointer" onClick={() => { setDraft(value ? String(value).slice(0, 10) : ''); setEditing(true); }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {value ? formatAbsoluteDate(value) : <span className="pb-field-empty">—</span>}
        <Pencil size={10} style={{ opacity: 0, transition: 'opacity 0.15s' }} className="group-hover:!opacity-60" />
      </span>
    );
  }
  return <input ref={inputRef} type="date" value={draft} onChange={e => { setDraft(e.target.value); const v = e.target.value || null; if (v !== (value ?? null)) onSave(v); }}
    onBlur={() => setEditing(false)}
    onKeyDown={e => { if (e.key === 'Enter') { commit(); } if (e.key === 'Escape') setEditing(false); }}
    style={{ width: '100%', height: 32, border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-md)', padding: '0 8px', fontSize: 13, color: 'var(--pb-ink)', outline: 'none' }} />;
}

/* ── Inline Editable Textarea ── */
function InlineEditableTextArea({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.style.height = 'auto'; ref.current.style.height = ref.current.scrollHeight + 'px'; } }, [editing]);
  const commit = () => { setEditing(false); const v = draft.trim() || null; if (v !== (value ?? null)) onSave(v); };
  if (!editing) {
    return (
      <div className="group cursor-pointer" onClick={() => { setDraft(value ?? ''); setEditing(true); }}
        style={{ padding: 4, margin: -4, borderRadius: 'var(--pb-r-md)', transition: 'background 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--pb-surface-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <p style={{ fontSize: 13, color: value ? 'var(--pb-ink)' : 'var(--pb-ink-muted)', lineHeight: 1.6, fontStyle: value ? undefined : 'italic' }}>
          {value || 'No description provided. Click to edit.'}
        </p>
        <span style={{ fontSize: 10, color: 'var(--pb-ink-muted)', opacity: 0, transition: 'opacity 0.15s', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }} className="group-hover:!opacity-60">
          <Pencil size={9} /> Click to edit
        </span>
      </div>
    );
  }
  return (
    <div>
      <textarea ref={ref} value={draft} onChange={e => { setDraft(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
        onBlur={commit} onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
        style={{ width: '100%', border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-md)', padding: '10px 12px', fontSize: 13, color: 'var(--pb-ink)', outline: 'none', resize: 'none', minHeight: 80, fontFamily: 'var(--pb-font-body)' }} />
      <p style={{ fontSize: 10, color: 'var(--pb-ink-muted)', marginTop: 4 }}>Press Escape to cancel • Click away to save</p>
    </div>
  );
}

/* ── Inline Editable Progress ── */
function InlineEditableProgress({ value, onSave, status }: { value: number; onSave: (v: number) => void; status: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => { setEditing(false); if (draft !== value) onSave(draft); };
  if (!editing) {
    return (
      <div className="group cursor-pointer" onClick={() => { setDraft(value); setEditing(true); }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <div className="pb-progress-track" style={{ width: 80 }}>
          <div className="pb-progress-fill" style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, background: status === 'done' ? 'var(--pb-success)' : 'var(--pb-primary)' }} />
        </div>
        <span className="pb-progress-label">{value}%</span>
        <Pencil size={10} style={{ opacity: 0, transition: 'opacity 0.15s', color: 'var(--pb-ink-muted)' }} className="group-hover:!opacity-60" />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <input type="range" min={0} max={100} step={5} value={draft} autoFocus
        onChange={e => setDraft(Number(e.target.value))} onBlur={commit} onMouseUp={commit}
        style={{ flex: 1, accentColor: 'var(--pb-primary)' }} />
      <span className="pb-progress-label" style={{ minWidth: 40, textAlign: 'right', fontWeight: 600, color: 'var(--pb-primary)' }}>{draft}%</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN DETAIL PANEL — LINEAR PRECISION
   ════════════════════════════════════════════════════ */
export function DetailPanel({ initiative, isOpen, onClose, onStatusChange, onScoreSave }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Details');
  const [scores, setScores] = useState({ sa: 3.0, bi: 3.0, tu: 3.0, rf: 3.0 });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [budgetAllocated, setBudgetAllocated] = useState(0);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const avatarsByName = useProfileAvatarsByName();

  const getAvatar = (name: string | null) => name ? avatarsByName.get(name.toLowerCase()) : undefined;

  useEffect(() => {
    if (initiative) {
      setScores({ sa: initiative.score_strategic_alignment ?? 3.0, bi: initiative.score_business_impact ?? 3.0, tu: initiative.score_time_urgency ?? 3.0, rf: initiative.score_resource_feasibility ?? 3.0 });
      setBudgetAllocated((initiative as any).budget_allocated ?? 0);
      setActiveTab('Details');
    }
  }, [initiative]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const computedScore = +((scores.sa + scores.bi + scores.tu + scores.rf) / 4).toFixed(1);
  const priority = getPriorityLevel(computedScore);

  const handleQuickEdit = useCallback(async (field: string, value: any, label?: string) => {
    if (!initiative) return;
    if (!isNativeInitiative(initiative.id)) { if (field === 'initiative_type_key') queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] }); return; }
    try {
      const { error } = await (supabase as any).from('ph_initiatives').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', initiative.id);
      if (error) throw new Error(error.message);
      invalidateAllInitiatives(queryClient);
      catalystToast.success(`${label || field.replace(/_/g, ' ')} updated`);
    } catch (err: any) { catalystToast.error('Failed: ' + err.message); }
  }, [initiative, queryClient]);

  const handleScoreSave = useCallback(async () => {
    if (!initiative) return;
    if (!isNativeInitiative(initiative.id)) { catalystToast.error('Jira-sourced items cannot be scored here'); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).from('ph_initiative_scores').upsert({
        initiative_id: initiative.id, strategic_alignment: scores.sa, business_impact: scores.bi,
        time_urgency: scores.tu, resource_feasibility: scores.rf, computed_score: computedScore,
        scored_by: user?.id || null, scored_at: new Date().toISOString(),
      }, { onConflict: 'initiative_id' });
      await (supabase as any).from('ph_initiatives').update({
        score_strategic_alignment: scores.sa, score_business_impact: scores.bi, score_time_urgency: scores.tu,
        score_resource_feasibility: scores.rf, computed_score: computedScore, updated_at: new Date().toISOString(),
      }).eq('id', initiative.id);
      invalidateAllInitiatives(queryClient);
      catalystToast.success('Score saved');
    } catch (err: any) { catalystToast.error('Failed: ' + err.message); }
  }, [initiative, scores, computedScore, queryClient]);

  if (!initiative) return null;

  const handleClone = async () => {
    try {
      const { data: existing } = await (supabase as any).from('ph_initiatives').select('initiative_key').order('created_at', { ascending: false }).limit(100);
      const maxNum = (existing || []).reduce((max: number, r: any) => { const num = parseInt(r.initiative_key?.replace(/[A-Z]+-/, '') || '0'); return num > max ? num : max; }, 0);
      const prefix = initiative.initiative_key?.replace(/-\d+$/, '') || 'MIM';
      const nextKey = `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
      await (supabase as any).from('ph_initiatives').insert({ title: `${initiative.title} (Copy)`, initiative_key: nextKey, description: initiative.description, status: 'backlog', progress: 0, department_id: initiative.department_id, assignee_id: initiative.assignee_id });
      invalidateAllInitiatives(queryClient);
      catalystToast.success(`Cloned as ${nextKey}`);
    } catch (err: any) { catalystToast.error('Failed: ' + err.message); }
  };

  const handleAttach = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files?.length) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        for (const file of Array.from(input.files)) {
          const path = `initiatives/${initiative.id}/${Date.now()}_${file.name}`;
          const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, file);
          if (uploadErr) throw uploadErr;
          await (supabase as any).from('ph_initiative_attachments').insert({
            initiative_id: initiative.id, file_name: file.name, file_path: path,
            file_size: file.size, mime_type: file.type, uploaded_by: user?.id || null,
          });
        }
        queryClient.invalidateQueries({ queryKey: ['ph-attachments', initiative.id] });
        catalystToast.success(`${input.files.length} file(s) attached`);
      } catch (err: any) { catalystToast.error('Upload failed: ' + err.message); }
    };
    input.click();
  };

  const isJiraSourced = !isNativeInitiative(initiative.id);

  const handleActionClick = (label: string) => {
    if (isJiraSourced && label === 'Clone') { catalystToast.error('Jira-sourced items are read-only'); return; }
    switch (label) {
      case 'Attach': handleAttach(); break;
      case 'Clone': handleClone(); break;
      case 'Link': setShowLinkDialog(true); break;
      case 'Score': setActiveTab('Score'); panelRef.current?.querySelector('[data-body]')?.scrollTo(0, 0); break;
    }
  };

  const ACTION_BUTTONS = [
    { label: 'Attach', icon: Paperclip },
    { label: 'Clone', icon: Copy },
    { label: 'Link', icon: LinkIcon },
    { label: 'Score', icon: Star },
  ];

  const handleUpdateBudgetAllocated = async (value: string) => {
    if (!initiative) return;
    const amount = parseFloat(value) || 0;
    setBudgetAllocated(amount);
    await (supabase as any).from('ph_initiatives').update({ budget_allocated: amount, updated_at: new Date().toISOString() }).eq('id', initiative.id);
    invalidateAllInitiatives(queryClient);
  };

  const portalContent = (
    <div data-module="product-backlog">
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div className="pb-panel-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={onClose} />
            <motion.div ref={panelRef} className="pb-panel"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}>

              {/* Top bar */}
              <div className="pb-panel-header">
                <button onClick={onClose} className="pb-panel-back">
                  <ChevronLeft size={16} /> Back to list
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setShowDeleteDialog(true)} className="pb-panel-action-btn pb-panel-action-btn-danger">
                    <Trash2 size={14} /> Delete
                  </button>
                  <button onClick={onClose} className="pb-panel-action-btn">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Identity block */}
              <div className="pb-panel-identity">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="pb-panel-key">{initiative.initiative_key}</span>
                  {initiative.is_favorited && <span style={{ color: '#F59E0B', fontSize: 14 }}>★</span>}
                </div>
                <InlineEditableTitle value={initiative.title} onSave={(v) => handleQuickEdit('title', v, 'Title')} />
                <div style={{ marginTop: 12 }}>
                  <StatusBadge status={initiative.status} editable={true}
                    onChange={(s) => { onStatusChange(initiative.id, s); handleQuickEdit('status', s, 'Status'); }} />
                </div>
              </div>

              {/* Action bar */}
              <div className="pb-panel-actions">
                {ACTION_BUTTONS.map(({ label, icon: Icon }) => (
                  <button key={label} type="button" onClick={() => handleActionClick(label)} className="pb-panel-action-btn">
                    <Icon size={14} />{label}
                  </button>
                ))}
                <button type="button" onClick={() => setShowDeleteDialog(true)} className="pb-panel-action-btn pb-panel-action-btn-danger" style={{ marginLeft: 'auto' }}>
                  <Trash2 size={14} />Delete
                </button>
              </div>

              {/* Tab Bar */}
              <div className="pb-panel-tabs">
                {TABS.map(tab => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                    className={`pb-panel-tab ${activeTab === tab ? 'pb-panel-tab-active' : ''}`}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div data-body className="pb-panel-body">
                {activeTab === 'Details' && (
                  <DetailsContent initiative={initiative} onQuickEdit={handleQuickEdit} onStatusChange={onStatusChange} />
                )}
                {activeTab === 'Score' && (
                  <ScoreContent initiative={initiative} scores={scores} computedScore={computedScore} priority={priority}
                    onScoreChange={setScores} onSave={handleScoreSave} />
                )}
                {activeTab === 'Budget' && (
                  <InitiativeBudgetTab initiativeId={initiative.id} budgetAllocated={budgetAllocated} onBudgetAllocatedChange={handleUpdateBudgetAllocated} />
                )}
                {activeTab === 'Risks' && <InitiativeRisksTab initiativeId={initiative.id} />}
                {activeTab === 'Milestones' && <MilestonesTab initiativeId={initiative.id} />}
                {activeTab === 'Links' && <LinksTab initiativeId={initiative.id} />}
                {activeTab === 'Audit' && <InitiativeAuditTab initiativeId={initiative.id} />}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Link Dialog */}
      <AlertDialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Link</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <AddLinkForm initiativeId={initiative.id} onClose={() => setShowLinkDialog(false)} />
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: 'var(--pb-danger-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} style={{ color: 'var(--pb-danger)' }} />
              </div>
              Delete Initiative?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p style={{ fontSize: 13, color: 'var(--pb-ink-muted)', marginBottom: 4 }}>Are you sure you want to delete:</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pb-ink)' }}>{initiative?.initiative_key}: {initiative?.title}</p>
                <p style={{ fontSize: 12, color: 'var(--pb-ink-muted)', marginTop: 8 }}>This can be undone from the archive.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction style={{ background: 'var(--pb-danger)' }}
              onClick={async () => {
                if (!initiative?.id) return;
                try {
                  await (supabase as any).from('ph_initiatives').update({ is_deleted: true }).eq('id', initiative.id);
                  invalidateAllInitiatives(queryClient);
                  catalystToast.success(`${initiative.initiative_key} deleted`);
                  onClose();
                } catch (err: any) { catalystToast.error('Failed: ' + err.message); }
              }}>
              <Trash2 size={14} /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );

  return createPortal(portalContent, document.body);
}

/* ════════════════════════════════════════════════════
   ADD LINK FORM
   ════════════════════════════════════════════════════ */
function AddLinkForm({ initiativeId, onClose }: { initiativeId: string; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('reference');
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!title.trim() || !url.trim()) { catalystToast.error('Title and URL required'); return; }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).from('ph_initiative_links').insert({ initiative_id: initiativeId, title: title.trim(), url: url.trim(), category, added_by: user?.id || null });
      queryClient.invalidateQueries({ queryKey: ['ph-links', initiativeId] });
      catalystToast.success('Link added');
      onClose();
    } catch (err: any) { catalystToast.error('Failed: ' + err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
      <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Link title" className="pb-comment-input" style={{ width: '100%' }} />
      <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="pb-comment-input" style={{ width: '100%' }} />
      <select value={category} onChange={e => setCategory(e.target.value)} style={{ height: 36, padding: '0 12px', fontSize: 13, border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-md)', color: 'var(--pb-ink)', outline: 'none' }}>
        <option value="reference">Reference</option>
        <option value="jira">Jira</option>
        <option value="confluence">Confluence</option>
        <option value="figma">Figma</option>
        <option value="other">Other</option>
      </select>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <button onClick={onClose} className="pb-panel-action-btn">Cancel</button>
        <button onClick={handleSubmit} disabled={submitting}
          style={{ height: 30, padding: '0 14px', fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--pb-primary)', border: 'none', borderRadius: 'var(--pb-r-md)', cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}>
          {submitting ? 'Adding…' : 'Add Link'}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MILESTONES TAB — Real data from ph_initiative_milestones
   ════════════════════════════════════════════════════ */
function MilestonesTab({ initiativeId }: { initiativeId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['ph-milestones', initiativeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('ph_initiative_milestones')
        .select('*').eq('initiative_id', initiativeId).order('planned_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).from('ph_initiative_milestones').insert({
        initiative_id: initiativeId, title: newTitle.trim(), planned_date: newDate || null,
        status: 'pending', created_by: user?.id || null,
      });
      queryClient.invalidateQueries({ queryKey: ['ph-milestones', initiativeId] });
      setNewTitle(''); setNewDate(''); setShowAdd(false);
      catalystToast.success('Milestone added');
    } catch (err: any) { catalystToast.error('Failed: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const actualDate = newStatus === 'completed' ? new Date().toISOString().slice(0, 10) : null;
    await (supabase as any).from('ph_initiative_milestones').update({ status: newStatus, actual_date: actualDate, updated_at: new Date().toISOString() }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['ph-milestones', initiativeId] });
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from('ph_initiative_milestones').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['ph-milestones', initiativeId] });
    catalystToast.success('Milestone removed');
  };

  if (isLoading) return <div style={{ padding: 24, color: 'var(--pb-ink-muted)', fontSize: 13 }}>Loading milestones…</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="pb-section-heading" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>Milestones</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="pb-panel-action-btn" style={{ color: 'var(--pb-primary)' }}>
          <Plus size={14} /> Add
        </button>
      </div>

      {showAdd && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: 12, border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-lg)', background: 'var(--pb-surface-secondary)' }}>
          <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Milestone title" className="pb-comment-input" style={{ flex: 1 }} />
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ height: 36, padding: '0 8px', fontSize: 12, border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-sm)', color: 'var(--pb-ink)', outline: 'none' }} />
          <button onClick={handleAdd} disabled={submitting || !newTitle.trim()}
            style={{ height: 36, padding: '0 14px', fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--pb-primary)', border: 'none', borderRadius: 'var(--pb-r-md)', cursor: 'pointer', opacity: submitting || !newTitle.trim() ? 0.5 : 1 }}>
            Add
          </button>
        </div>
      )}

      {milestones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--pb-ink-muted)' }}>
          <Flag size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
          <p style={{ fontSize: 13, fontWeight: 500 }}>No milestones yet</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Add milestones to track key deliverables</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {milestones.map((m: any) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-md)', background: m.status === 'completed' ? 'var(--pb-success-bg)' : 'var(--pb-surface)' }}>
              <button onClick={() => toggleStatus(m.id, m.status)}
                style={{ width: 18, height: 18, borderRadius: '50%', border: m.status === 'completed' ? '2px solid var(--pb-success)' : '2px solid var(--pb-border-strong)', background: m.status === 'completed' ? 'var(--pb-success)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {m.status === 'completed' && <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: m.status === 'completed' ? 'var(--pb-success)' : 'var(--pb-ink)', textDecoration: m.status === 'completed' ? 'line-through' : undefined }}>{m.title}</div>
                {m.planned_date && <div style={{ fontSize: 11, color: 'var(--pb-ink-muted)', fontFamily: 'var(--pb-font-mono)', marginTop: 2 }}>{formatAbsoluteDate(m.planned_date)}</div>}
              </div>
              {m.is_critical_path && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--pb-danger)', background: 'var(--pb-danger-bg)', padding: '2px 6px', borderRadius: 'var(--pb-r-full)' }}>Critical</span>}
              <button onClick={() => handleDelete(m.id)} style={{ color: 'var(--pb-ink-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   LINKS TAB — Real data from ph_initiative_links
   ════════════════════════════════════════════════════ */
function LinksTab({ initiativeId }: { initiativeId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['ph-links', initiativeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('ph_initiative_links')
        .select('*').eq('initiative_id', initiativeId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    await (supabase as any).from('ph_initiative_links').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['ph-links', initiativeId] });
    catalystToast.success('Link removed');
  };

  if (isLoading) return <div style={{ padding: 24, color: 'var(--pb-ink-muted)', fontSize: 13 }}>Loading links…</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="pb-section-heading" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>Links</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="pb-panel-action-btn" style={{ color: 'var(--pb-primary)' }}>
          <Plus size={14} /> Add Link
        </button>
      </div>

      {showAdd && <AddLinkForm initiativeId={initiativeId} onClose={() => { setShowAdd(false); queryClient.invalidateQueries({ queryKey: ['ph-links', initiativeId] }); }} />}

      {links.length === 0 && !showAdd ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--pb-ink-muted)' }}>
          <LinkIcon size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
          <p style={{ fontSize: 13, fontWeight: 500 }}>No links yet</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Add links to related documents, Jira issues, or designs</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {links.map((link: any) => (
            <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-md)' }}>
              <LinkIcon size={14} style={{ color: 'var(--pb-primary)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 500, color: 'var(--pb-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {link.title} <ExternalLink size={12} />
                </a>
                {link.category && <span style={{ fontSize: 11, color: 'var(--pb-ink-muted)', textTransform: 'capitalize' }}>{link.category}</span>}
              </div>
              {link.is_pinned && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--pb-primary)', background: 'var(--pb-primary-bg)', padding: '2px 6px', borderRadius: 'var(--pb-r-full)' }}>Pinned</span>}
              <button onClick={() => handleDelete(link.id)} style={{ color: 'var(--pb-ink-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   ROADMAP TOGGLE
   ════════════════════════════════════════════════════ */
function RoadmapToggleInline({ initiative }: { initiative: Initiative }) {
  const promoteMutation = usePromoteToRoadmap();
  const removeMutation = useRemoveFromRoadmap();
  const queryClient = useQueryClient();
  const [localOnRoadmap, setLocalOnRoadmap] = useState<boolean>(initiative.on_roadmap === true);
  const [isToggling, setIsToggling] = useState(false);
  const isPending = promoteMutation.isPending || removeMutation.isPending || isToggling;

  useEffect(() => { setLocalOnRoadmap(initiative.on_roadmap === true); }, [initiative.id, initiative.on_roadmap]);

  const handleToggle = async () => {
    const newValue = !localOnRoadmap;
    setLocalOnRoadmap(newValue);
    try {
      setIsToggling(true);
      const isJira = !isNativeInitiative(initiative.id);
      if (isJira) {
        if (!newValue) {
          const { data: existing } = await (supabase as any).from('ph_initiatives').select('id').eq('initiative_key', initiative.initiative_key).maybeSingle();
          if (existing) await removeMutation.mutateAsync(existing.id);
        } else {
          const { data: existing } = await (supabase as any).from('ph_initiatives').select('id').eq('initiative_key', initiative.initiative_key).maybeSingle();
          let initiativeId: string;
          if (existing) { initiativeId = existing.id; }
          else {
            const { data: inserted, error: insertError } = await (supabase as any).from('ph_initiatives').insert({ initiative_key: initiative.initiative_key, title: initiative.title, description: initiative.description || null, status: 'new_demand', assignee_id: initiative.assignee_id || null, department_id: initiative.department_id || null, progress: initiative.progress || 0 }).select('id').single();
            if (insertError) throw insertError;
            initiativeId = inserted.id;
          }
          await promoteMutation.mutateAsync({ initiative_id: initiativeId, initiative_type_key: initiative.initiative_type_key || 'project' });
        }
        queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
      } else {
        if (!newValue) await removeMutation.mutateAsync(initiative.id);
        else await promoteMutation.mutateAsync({ initiative_id: initiative.id, initiative_type_key: initiative.initiative_type_key || 'project' });
      }
    } catch (err) {
      console.error('Roadmap toggle failed:', err);
      setLocalOnRoadmap(!newValue);
      catalystToast.error('Failed to update roadmap status');
    } finally { setIsToggling(false); }
  };

  return (
    <div style={{ marginBottom: 20, border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-lg)', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 'var(--pb-r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: localOnRoadmap ? 'var(--pb-primary-bg)' : 'var(--pb-surface-tertiary)' }}>
            <Map size={16} style={{ color: localOnRoadmap ? 'var(--pb-primary)' : 'var(--pb-ink-muted)' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pb-ink)' }}>{localOnRoadmap ? 'On Roadmap' : 'Not on Roadmap'}</div>
            <div style={{ fontSize: 11, color: 'var(--pb-ink-muted)' }}>{localOnRoadmap ? 'Visible on Product Roadmap timeline' : 'Click toggle to add to roadmap'}</div>
          </div>
        </div>
        <button onClick={handleToggle} disabled={isPending}
          className={localOnRoadmap ? 'pb-toggle-track pb-toggle-on' : 'pb-toggle-track pb-toggle-off'}>
          <span className="pb-toggle-thumb" />
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   COMMENTS SECTION — Real data from ph_comments
   ════════════════════════════════════════════════════ */
function CommentsSection({ initiativeId }: { initiativeId: string }) {
  const queryClient = useQueryClient();
  const avatarsByName = useProfileAvatarsByName();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['ph-comments', initiativeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('ph_comments')
        .select('id, body, author_id, created_at, updated_at').eq('work_item_id', initiativeId).order('created_at', { ascending: true });
      if (error) throw error;
      const authorIds: string[] = (data || []).map((c: any) => c.author_id).filter(Boolean);
      const uniqueAuthorIds = Array.from(new Set(authorIds));
      let authorMap: Record<string, string> = {};
      if (uniqueAuthorIds.length > 0) {
        const { data: profiles } = await (supabase as any).from('profiles').select('id, display_name').in('id', uniqueAuthorIds);
        if (profiles) profiles.forEach((p: any) => { authorMap[p.id] = p.display_name; });
      }
      return (data || []).map((c: any) => ({ ...c, author_name: authorMap[c.author_id] || 'Unknown' }));
    },
  });

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).from('ph_comments').insert({ work_item_id: initiativeId, work_item_type: 'initiative', body: newComment.trim(), author_id: user?.id || null });
      queryClient.invalidateQueries({ queryKey: ['ph-comments', initiativeId] });
      setNewComment('');
      catalystToast.success('Comment added');
    } catch (err: any) { catalystToast.error('Failed: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from('ph_comments').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['ph-comments', initiativeId] });
    catalystToast.success('Comment deleted');
  };

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--pb-border)' }}>
      <h3 className="pb-section-heading">Comments</h3>
      {isLoading ? (
        <p style={{ fontSize: 13, color: 'var(--pb-ink-muted)' }}>Loading…</p>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--pb-ink-muted)', fontStyle: 'italic' }}>No comments yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          {comments.map((c: any) => (
            <div key={c.id} className="pb-comment">
              <InlineAvatar name={c.author_name} size={24} avatarUrl={avatarsByName.get(c.author_name?.toLowerCase())} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="pb-comment-author">{c.author_name}</span>
                  <span className="pb-comment-time">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                </div>
                <div className="pb-comment-body">{c.body}</div>
              </div>
              <button onClick={() => handleDelete(c.id)} style={{ color: 'var(--pb-ink-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.5 }}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment…"
          className="pb-comment-input" style={{ flex: 1 }} disabled={submitting}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} />
        <button type="button" onClick={handleSubmit} disabled={submitting || !newComment.trim()}
          style={{ height: 36, padding: '0 16px', fontSize: 13, fontWeight: 500, background: 'var(--pb-primary)', color: '#fff', border: 'none', borderRadius: 'var(--pb-r-md)', cursor: 'pointer', opacity: submitting || !newComment.trim() ? 0.5 : 1 }}>
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

/* ── EA Review Select ── */
const EA_REVIEW_OPTIONS = [
  { value: '', label: '—' },
  { value: 'not_required', label: 'Not Required' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function EAReviewSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = EA_REVIEW_OPTIONS.find(o => o.value === value) || EA_REVIEW_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="pb-field-value group cursor-pointer" onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className={!value ? 'pb-field-empty' : ''}>{current.label}</span>
        <ChevronDown size={12} style={{ opacity: 0, transition: 'opacity 0.15s' }} className="group-hover:!opacity-60" />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: -8, zIndex: 100, background: 'white', border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 180, padding: 4, marginTop: 4 }}>
          {EA_REVIEW_OPTIONS.map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer', borderRadius: 4, background: o.value === value ? 'var(--pb-surface-secondary)' : 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--pb-surface-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = o.value === value ? 'var(--pb-surface-secondary)' : 'transparent')}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Priority Select ── */
const PRIORITY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function PrioritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = PRIORITY_OPTIONS.find(o => o.value === value) || PRIORITY_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="pb-field-value group cursor-pointer" onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>
        <span className={!value ? 'pb-field-empty' : ''}>{current.label}</span>
        <ChevronDown size={12} style={{ opacity: 0, transition: 'opacity 0.15s' }} className="group-hover:!opacity-60" />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: -8, zIndex: 100, background: 'white', border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 150, padding: 4, marginTop: 4 }}>
          {PRIORITY_OPTIONS.map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer', borderRadius: 4, textTransform: 'capitalize', background: o.value === value ? 'var(--pb-surface-secondary)' : 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--pb-surface-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = o.value === value ? 'var(--pb-surface-secondary)' : 'transparent')}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   DETAILS TAB
   ════════════════════════════════════════════════════ */
function DetailsContent({ initiative, onQuickEdit, onStatusChange }: {
  initiative: Initiative;
  onQuickEdit: (field: string, value: any, label?: string) => void;
  onStatusChange: (id: string, s: InitiativeStatus) => void;
}) {
  const { data: departmentOptions } = useDepartmentOptions();
  const { data: profileOptions } = useProfileOptions();
  const avatarsByName = useProfileAvatarsByName();
  const getAvatar = (name: string | null) => name ? avatarsByName.get(name.toLowerCase()) : undefined;
  const [selectedTypeKey, setSelectedTypeKey] = useState<string | null>(initiative.initiative_type_key ?? null);

  useEffect(() => { setSelectedTypeKey(initiative.initiative_type_key ?? null); }, [initiative.id, initiative.initiative_type_key]);

  const TYPE_OPTIONS = [
    { key: 'project', label: 'Project', Icon: FolderKanban, color: 'var(--pb-teal)' },
    { key: 'enhancement', label: 'Enhancement', Icon: Zap, color: 'var(--pb-primary)' },
    { key: 'improvement', label: 'Improvement', Icon: Wrench, color: 'var(--pb-warning)' },
    { key: 'entity_integration', label: 'Entity Integration', Icon: Network, color: 'var(--pb-purple)' },
  ];

  return (
    <>
      {/* Initiative Type */}
      <div style={{ marginBottom: 20 }}>
        <div className="pb-field-label">Initiative Type</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {TYPE_OPTIONS.map(opt => {
            const isActive = selectedTypeKey === opt.key;
            return (
              <button key={opt.key} onClick={async () => {
                if (opt.key === selectedTypeKey) return;
                try {
                  const { data: typeRow, error: typeError } = await (supabase as any).from('initiative_types').select('id').eq('key', opt.key).single();
                  if (typeError) throw typeError;
                  const now = new Date().toISOString();
                  if (isNativeInitiative(initiative.id)) {
                    await (supabase as any).from('ph_initiatives').update({ initiative_type_id: typeRow.id, updated_at: now }).eq('id', initiative.id);
                  } else {
                    await (supabase as any).from('ph_issue_initiative_type_overrides').upsert({ issue_key: initiative.initiative_key, initiative_type_id: typeRow.id, updated_at: now }, { onConflict: 'issue_key' });
                  }
                  setSelectedTypeKey(opt.key);
                  onQuickEdit('initiative_type_key', opt.key);
                  catalystToast.success('Initiative type updated');
                } catch (err: any) { catalystToast.error('Failed: ' + (err?.message || 'Unknown error')); }
              }}
              className={`pb-type-card ${isActive ? 'pb-type-card-active' : ''}`}>
                <opt.Icon size={16} style={{ color: opt.color, marginBottom: 2 }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? opt.color : 'var(--pb-ink-muted)' }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <RoadmapToggleInline initiative={initiative} />

      {/* Field Grid — all inline editable */}
      <div className="pb-field-grid">
        <div className="pb-field-item">
          <div className="pb-field-label">Status</div>
          <StatusBadge status={initiative.status} editable={true}
            onChange={(s) => { onStatusChange(initiative.id, s); onQuickEdit('status', s, 'Status'); }} />
        </div>
        <div className="pb-field-item">
          <div className="pb-field-label">EA Review</div>
          <EAReviewSelect value={initiative.ea_review ?? ''} onChange={v => onQuickEdit('ea_review', v || null, 'EA Review')} />
        </div>
        <div className="pb-field-item">
          <div className="pb-field-label">Priority</div>
          <PrioritySelect value={initiative.priority ?? ''} onChange={v => onQuickEdit('priority', v || null, 'Priority')} />
        </div>
        <div className="pb-field-item">
          <div className="pb-field-label">Target Quarter</div>
          <QuarterSelect value={initiative.target_quarter ?? ''} onChange={v => onQuickEdit('target_quarter', v, 'Target Quarter')} />
        </div>
        <div className="pb-field-item">
          <div className="pb-field-label">Reporter</div>
          <PeopleSelect value={initiative.reporter_id ?? ''} onChange={v => onQuickEdit('reporter_id', v, 'Reporter')} profiles={profileOptions || []} placeholder="Select reporter" />
        </div>
        <div className="pb-field-item">
          <div className="pb-field-label">Assignee</div>
          <PeopleSelect value={initiative.assignee_id ?? ''} onChange={v => onQuickEdit('assignee_id', v, 'Assignee')} profiles={profileOptions || []} placeholder="Select assignee" />
        </div>
        <div className="pb-field-item">
          <div className="pb-field-label">Department</div>
          <DepartmentSelect value={initiative.department_id ?? ''} onChange={v => onQuickEdit('department_id', v, 'Department')} departments={departmentOptions || []} />
        </div>
        <div className="pb-field-item">
          <div className="pb-field-label">Business Owner</div>
          <PeopleSelect value={initiative.business_owner_id ?? ''} onChange={v => onQuickEdit('business_owner_id', v, 'Business Owner')} profiles={profileOptions || []} placeholder="Select business owner" />
        </div>
        <div className="pb-field-item">
          <div className="pb-field-label">Business Ask Date</div>
          <InlineEditableDate value={initiative.business_ask_date} label="Business Ask Date"
            onSave={v => onQuickEdit('business_ask_date', v, 'Business Ask Date')} />
        </div>
        <div className="pb-field-item">
          <div className="pb-field-label">Kickoff Date</div>
          <InlineEditableDate value={initiative.kickoff_date} label="Kickoff Date"
            onSave={v => onQuickEdit('kickoff_date', v, 'Kickoff Date')} />
        </div>
        <div className="pb-field-item">
          <div className="pb-field-label">Target Complete</div>
          <InlineEditableDate value={initiative.target_complete} label="Target Complete"
            onSave={v => onQuickEdit('target_complete', v, 'Target Complete')} />
        </div>
        <div className="pb-field-item">
          <div className="pb-field-label">Progress</div>
          <InlineEditableProgress value={initiative.progress} status={initiative.status}
            onSave={v => onQuickEdit('progress', v, 'Progress')} />
        </div>
      </div>

      {/* Description */}
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--pb-border)' }}>
        <h3 className="pb-section-heading">Description</h3>
        <InlineEditableTextArea value={initiative.description} onSave={v => onQuickEdit('description', v, 'Description')} />
      </div>

      <CommentsSection initiativeId={initiative.id} />
    </>
  );
}

/* ════════════════════════════════════════════════════
   SCORE TAB
   ════════════════════════════════════════════════════ */
function ScoreContent({ scores, computedScore, priority, onScoreChange, onSave }: {
  initiative: Initiative; scores: { sa: number; bi: number; tu: number; rf: number };
  computedScore: number; priority: ReturnType<typeof getPriorityLevel>;
  onScoreChange: (s: typeof scores) => void; onSave: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 24, minHeight: 400 }}>
      <div style={{ flex: 3, display: 'flex', flexDirection: 'column' }}>
        <ScoreSlider label="Strategic Alignment" value={scores.sa} onChange={(v) => onScoreChange({ ...scores, sa: v })} />
        <ScoreSlider label="Business Impact" value={scores.bi} onChange={(v) => onScoreChange({ ...scores, bi: v })} />
        <ScoreSlider label="Time & Urgency" value={scores.tu} onChange={(v) => onScoreChange({ ...scores, tu: v })} />
        <ScoreSlider label="Resource & Feasibility" value={scores.rf} onChange={(v) => onScoreChange({ ...scores, rf: v })} />
        <button type="button" onClick={onSave}
          style={{ width: '100%', height: 38, background: 'var(--pb-primary)', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 'var(--pb-r-md)', cursor: 'pointer', marginTop: 'auto' }}>
          Save Score
        </button>
      </div>
      <div style={{ flex: 2, background: 'var(--pb-surface-secondary)', border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-lg)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 52, fontWeight: 700, color: 'var(--pb-ink)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: 10 }}>
          {computedScore.toFixed(1)}
        </div>
        <div style={{ marginBottom: 16 }}><PriorityBadge score={computedScore} size="md" showScore={false} /></div>
        <div style={{ margin: '8px 0' }}><RadarChart scores={[scores.sa, scores.bi, scores.tu, scores.rf]} /></div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--pb-border)', width: '100%' }}>
          <p style={{ fontSize: 12, color: 'var(--pb-ink-muted)', lineHeight: 1.5, textAlign: 'center' }}>
            {priority.level === 'High' && <>Score of {computedScore.toFixed(1)} falls in the <strong style={{ color: 'var(--pb-ink-tertiary)' }}>High</strong> range (4.0-5.0).</>}
            {priority.level === 'Medium' && <>Score of {computedScore.toFixed(1)} falls in the <strong style={{ color: 'var(--pb-ink-tertiary)' }}>Medium</strong> range (3.0-3.9).</>}
            {priority.level === 'Low' && <>Score of {computedScore.toFixed(1)} falls in the <strong style={{ color: 'var(--pb-ink-tertiary)' }}>Low</strong> range (2.0-2.9).</>}
            {priority.level === 'Rejected' && <>Score of {computedScore.toFixed(1)} falls in the <strong style={{ color: 'var(--pb-ink-tertiary)' }}>Rejected</strong> range (1.0-1.9).</>}
            {priority.level === 'Unscored' && 'This initiative has not been scored yet.'}
          </p>
        </div>
      </div>
    </div>
  );
}
