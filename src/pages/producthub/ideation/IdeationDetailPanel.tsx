/**
 * IdeationDetailPanel — NUCLEAR REWRITE
 * 480px drawer, ALL 12 fields editable, V12 contrast, no dots, neutral dimension circles
 * Wiring Audit (Sacred Gate): CRUD calls ph_ideas .update(), invalidates all idea query keys
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, Edit2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PRIORITY_CONFIG, QUARTER_BADGE } from './ideation-data';
import { useIdeaRaw, useImpactFactors, useIdeaComments, useAddIdeaComment } from '@/hooks/useIdeation';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  ideaKey: string | null;
  onClose: () => void;
  onConvert?: (key: string) => void;
}

// ─── Update mutation ─────────────────────────────────────────────
function useUpdateIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      console.log('[useUpdateIdea] Updating idea:', id, updates);
      const { data, error } = await supabase
        .from('ph_ideas')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('[useUpdateIdea] Supabase error:', error);
        throw error;
      }
      console.log('[useUpdateIdea] Update successful:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['ideas', 'roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['ideas-roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['ideaRaw'] });
      queryClient.invalidateQueries({ queryKey: ['ideaImpactFactors'] });
      queryClient.invalidateQueries({ queryKey: ['ideaStatusCounts'] });
      toast.success('Idea updated successfully');
    },
    onError: (error: any) => {
      console.error('[useUpdateIdea] Mutation error:', error);
      toast.error('Failed to update idea: ' + (error?.message || 'Unknown error'));
    },
  });
}

// ─── Status Lozenge — 3-color guardrail, NO DOTS ─────────────────
const STATUS_LOZENGE: Record<string, { bg: string; text: string }> = {
  'Draft':        { bg: '#DFE1E6', text: '#42526E' },
  'New':          { bg: '#DFE1E6', text: '#42526E' },
  'Submitted':    { bg: '#0C66E4', text: '#FFFFFF' },
  'Under Review': { bg: '#0C66E4', text: '#FFFFFF' },
  'In Progress':  { bg: '#0C66E4', text: '#FFFFFF' },
  'Approved':     { bg: '#1B7F37', text: '#FFFFFF' },
  'Converted':    { bg: '#1B7F37', text: '#FFFFFF' },
  'Done':         { bg: '#1B7F37', text: '#FFFFFF' },
};

function StatusLozenge({ status }: { status: string }) {
  const s = STATUS_LOZENGE[status] ?? { bg: '#DFE1E6', text: '#42526E' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
      backgroundColor: s.bg, color: s.text,
      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
      lineHeight: '16px', whiteSpace: 'nowrap',
    }}>
      {status.toUpperCase()}
    </span>
  );
}

function PriorityLozenge({ priority }: { priority: string }) {
  const c = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.P4;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      height: 20, minWidth: 26, padding: '0 4px', borderRadius: 4,
      fontSize: '11px', fontWeight: 650,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {priority}
    </span>
  );
}

// ─── Shared styles ───────────────────────────────────────────────
// Note: selectStyle/inputStyle are used in edit mode — dark mode applied inline via isDark
const selectStyle: React.CSSProperties = {
  height: '32px', borderRadius: '4px', border: '1px solid rgba(15,23,42,0.14)',
  padding: '0 8px', fontSize: '13px', color: '#0F172A', width: '100%', outline: 'none',
};
const inputStyle: React.CSSProperties = {
  height: '32px', borderRadius: '4px', border: '1px solid rgba(15,23,42,0.14)',
  padding: '0 8px', fontSize: '13px', color: '#0F172A', width: '100%', outline: 'none',
};

function FieldPair({ label, value }: { label: string; value: React.ReactNode }) {
  const { isDark } = useTheme();
  return (
    <div>
      <div style={{
        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const,
        letterSpacing: '0.06em', color: isDark ? '#878787' : '#64748B', marginBottom: '6px',
      }}>
        {label}
      </div>
      <div>{value}</div>
    </div>
  );
}

const formatSource = (source: string): string => {
  const map: Record<string, string> = {
    'ministry_directive': 'Ministry Directive', 'internal': 'Internal',
    'stakeholder': 'Stakeholder', 'customer': 'Customer Feedback', 'research': 'Research',
  };
  return map[source?.toLowerCase()] || source || '—';
};

// ─── Main Component ──────────────────────────────────────────────
export default function IdeationDetailPanel({ ideaKey, onClose, onConvert }: Props) {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;
  const darkSelectStyle: React.CSSProperties = { ...selectStyle, color: dk.t1, background: isDark ? 'transparent' : '#FFFFFF', borderColor: isDark ? '#454545' : 'rgba(15,23,42,0.14)' };
  const darkInputStyle: React.CSSProperties = { ...inputStyle, color: dk.t1, background: isDark ? 'transparent' : '#FFFFFF', borderColor: isDark ? '#454545' : 'rgba(15,23,42,0.14)' };
  const { data: rawIdea, isLoading } = useIdeaRaw(ideaKey);
  const { data: dbFactors } = useImpactFactors(ideaKey);
  const updateIdea = useUpdateIdea();
  const isSaving = useRef(false);

  const [isEditing, setIsEditing] = useState(false);

  // ═══ LOCAL STATE FOR ALL 11 EDITABLE FIELDS ═══
  const [localStatus, setLocalStatus] = useState('');
  const [localPriority, setLocalPriority] = useState('');
  const [localType, setLocalType] = useState('');
  const [localSource, setLocalSource] = useState('');
  const [localTheme, setLocalTheme] = useState('');
  const [localTeam, setLocalTeam] = useState('');
  const [localTargetRelease, setLocalTargetRelease] = useState('');
  const [localQuarter, setLocalQuarter] = useState('');
  const [localAssignee, setLocalAssignee] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localIsCommitted, setLocalIsCommitted] = useState(false);

  // ═══ SYNC LOCAL STATE FROM RAW IDEA ═══
  useEffect(() => {
    if (rawIdea) {
      setLocalStatus(rawIdea.status || 'Draft');
      setLocalPriority(rawIdea.priority || 'P2');
      setLocalType(rawIdea.idea_type || 'Feature Request');
      setLocalSource(rawIdea.source || 'internal');
      setLocalTheme(rawIdea.theme || '');
      setLocalTeam(rawIdea.assigned_team || '');
      setLocalTargetRelease(rawIdea.target_release_date || '');
      setLocalQuarter(rawIdea.roadmap_quarter || '');
      setLocalAssignee(rawIdea.assigned_to_name || '');
      setLocalDescription(rawIdea.description || '');
      setLocalIsCommitted(rawIdea.is_committed ?? false);
      setIsEditing(false);
    }
  }, [rawIdea?.id]);

  const resetLocalState = () => {
    if (rawIdea) {
      setLocalStatus(rawIdea.status || 'Draft');
      setLocalPriority(rawIdea.priority || 'P2');
      setLocalType(rawIdea.idea_type || 'Feature Request');
      setLocalSource(rawIdea.source || 'internal');
      setLocalTheme(rawIdea.theme || '');
      setLocalTeam(rawIdea.assigned_team || '');
      setLocalTargetRelease(rawIdea.target_release_date || '');
      setLocalQuarter(rawIdea.roadmap_quarter || '');
      setLocalAssignee(rawIdea.assigned_to_name || '');
      setLocalDescription(rawIdea.description || '');
      setLocalIsCommitted(rawIdea.is_committed ?? false);
    }
  };

  // ═══ SAVE — ALL FIELDS ═══
  const handleSave = async () => {
    if (!rawIdea?.id || isSaving.current) return;
    isSaving.current = true;
    try {
      await updateIdea.mutateAsync({
        id: rawIdea.id,
        updates: {
          status: localStatus,
          priority: localPriority,
          idea_type: localType || null,
          source: localSource || null,
          theme: localTheme || null,
          assigned_team: localTeam || null,
          target_release_date: localTargetRelease || null,
          roadmap_quarter: localQuarter || null,
          assigned_to_name: localAssignee || null,
          description: localDescription || null,
          is_committed: localIsCommitted,
        },
      });
      setIsEditing(false);
    } catch (error) {
      console.error('[IdeationDetailPanel] Save failed:', error);
    } finally {
      isSaving.current = false;
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (ideaKey) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [ideaKey, onClose]);

  if (!ideaKey) return null;
  if (isLoading) return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: isDark ? '#1A1A1A' : '#FFFFFF', zIndex: 201, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: dk.t3, fontSize: '14px' }}>Loading...</span>
      </div>
    </>
  );
  if (!rawIdea) return null;

  const impactScore = parseFloat(rawIdea.impact_total) || 0;
  const factors = dbFactors || { I: 0, M: 0, P: 0, A: 0, C: 0, T: 0 };
  const assigneeName = rawIdea.assigned_to_name || null;
  const assigneeInitials = assigneeName ? assigneeName.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2) : '?';
  const quarter = rawIdea.roadmap_quarter || null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.40)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px',
        background: isDark ? '#1A1A1A' : '#FFFFFF', zIndex: 201, boxShadow: isDark ? 'none' : '-8px 0 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease forwards',
      }}>
        {/* ─── HEADER ─── */}
        <div style={{
          padding: '16px 24px', borderBottom: `1px solid ${dk.border}`,
          display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--ds-font-family-monospaced)', fontSize: '13px', fontWeight: 700,
            color: dk.blueKey, background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', padding: '3px 10px', borderRadius: '4px',
          }}>
            {rawIdea.idea_key}
          </span>
          <StatusLozenge status={localStatus} />
          <div style={{ flex: 1 }} />
          <button onClick={() => { if (isEditing) { resetLocalState(); setIsEditing(false); } else { setIsEditing(true); } }} style={{
            width: '32px', height: '32px', borderRadius: '6px',
            border: `1px solid ${dk.border}`,
            background: isEditing ? (isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF') : (isDark ? 'transparent' : '#FFFFFF'),
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: dk.t2,
          }}>
            <Edit2 size={14} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: dk.t3 }}>
            <X size={18} />
          </button>
        </div>

        {/* ─── BODY ─── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Title */}
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${dk.divider}` }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: dk.t1, margin: 0, lineHeight: 1.3 }}>
              {rawIdea.title}
            </h2>
          </div>

          {/* Convert banner */}
          {localStatus === 'Approved' && (
            <div style={{
              margin: '16px 24px 0', background: isDark ? 'rgba(22,163,74,0.08)' : '#F0FDF4', border: `1px solid ${isDark ? 'rgba(22,163,74,0.20)' : '#86EFAC'}`,
              borderRadius: '6px', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: dk.t1 }}>Ready for promotion</div>
                <div style={{ fontSize: '11px', color: dk.t3, marginTop: '2px' }}>Convert to an initiative to begin planning.</div>
              </div>
              <button onClick={() => onConvert?.(rawIdea.idea_key)} style={{
                background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px',
                padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}>
                → Convert
              </button>
            </div>
          )}

          {/* ═══ DETAILS GRID — ALL 12 FIELDS ═══ */}
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${dk.divider}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

              {/* STATUS — editable */}
              <FieldPair label="Status" value={
                isEditing ? (
                  <select value={localStatus} onChange={e => setLocalStatus(e.target.value)} style={darkSelectStyle}>
                    {['Draft', 'Submitted', 'Under Review', 'Approved', 'Converted'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : <StatusLozenge status={localStatus} />
              } />

              {/* PRIORITY — editable */}
              <FieldPair label="Priority" value={
                isEditing ? (
                  <select value={localPriority} onChange={e => setLocalPriority(e.target.value)} style={darkSelectStyle}>
                    {['P1', 'P2', 'P3', 'P4'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : <PriorityLozenge priority={localPriority} />
              } />

              {/* TYPE — editable */}
              <FieldPair label="Type" value={
                isEditing ? (
                  <select value={localType} onChange={e => setLocalType(e.target.value)} style={darkSelectStyle}>
                    {['Feature Request', 'Opportunity', 'Solution', 'Improvement', 'Problem'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '13px', fontWeight: 500, color: dk.t1 }}>{rawIdea.idea_type || 'Feature'}</span>
                )
              } />

              {/* SOURCE — editable */}
              <FieldPair label="Source" value={
                isEditing ? (
                  <select value={localSource} onChange={e => setLocalSource(e.target.value)} style={darkSelectStyle}>
                    {['internal', 'ministry_directive', 'stakeholder', 'customer', 'research'].map(s => (
                      <option key={s} value={s}>{formatSource(s)}</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '13px', fontWeight: 500, color: dk.t1 }}>{formatSource(rawIdea.source)}</span>
                )
              } />

              {/* IDEAS THEME — editable */}
              <FieldPair label="Ideas Theme" value={
                isEditing ? (
                  <input value={localTheme} onChange={e => setLocalTheme(e.target.value)} style={darkInputStyle} placeholder="Enter ideas theme" />
                ) : <span style={{ fontSize: '13px', fontWeight: 500, color: localTheme ? dk.t1 : dk.t3 }}>{localTheme || '—'}</span>
              } />

              {/* ASSIGNED TEAM — editable */}
              <FieldPair label="Assigned Team" value={
                isEditing ? (
                  <input value={localTeam} onChange={e => setLocalTeam(e.target.value)} style={darkInputStyle} placeholder="Enter team" />
                ) : <span style={{ fontSize: '13px', fontWeight: 500, color: localTeam ? dk.t1 : dk.t3 }}>{localTeam || '—'}</span>
              } />

              {/* TARGET RELEASE — editable */}
              <FieldPair label="Target Release" value={
                isEditing ? (
                  <input type="date" value={localTargetRelease} onChange={e => setLocalTargetRelease(e.target.value)} style={darkInputStyle} />
                ) : (
                  <span style={{ fontSize: '13px', fontWeight: 500, color: rawIdea.target_release_date ? dk.t1 : dk.t3 }}>
                    {rawIdea.target_release_date ? new Date(rawIdea.target_release_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                  </span>
                )
              } />

              {/* QUARTER — editable (KEY MISSING FIELD) */}
              <FieldPair label="Quarter" value={
                isEditing ? (
                  <select value={localQuarter} onChange={e => setLocalQuarter(e.target.value)} style={darkSelectStyle}>
                    <option value="">Unassigned</option>
                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <option key={q} value={q}>{q} 2026</option>)}
                  </select>
                ) : (
                  quarter ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      height: 20, padding: '0 6px', borderRadius: 4,
                      fontSize: '11px', fontWeight: 700,
                      background: QUARTER_BADGE[quarter]?.bg || '#E2E8F0',
                      color: QUARTER_BADGE[quarter]?.text || '#94A3B8',
                    }}>{quarter} 2026</span>
                  ) : <span style={{ fontSize: '13px', color: dk.t3 }}>—</span>
                )
              } />

              {/* ASSIGNEE — editable */}
              <FieldPair label="Assignee" value={
                isEditing ? (
                  <input value={localAssignee} onChange={e => setLocalAssignee(e.target.value)} style={darkInputStyle} placeholder="Enter assignee name" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%', background: '#2563EB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#FFF', fontSize: '10px', fontWeight: 700, flexShrink: 0,
                    }}>{assigneeInitials}</div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: assigneeName ? dk.t1 : dk.t3 }}>
                      {assigneeName || 'Unassigned'}
                    </span>
                  </div>
                )
              } />

              {/* CREATED — always read-only */}
              <FieldPair label="Created" value={
                <span style={{ fontSize: '13px', fontWeight: 500, color: dk.t1 }}>
                  {rawIdea.created_at ? new Date(rawIdea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
              } />
            </div>
          </div>

          {/* ═══ COMMITTED TOGGLE — only in edit mode ═══ */}
          {isEditing && (
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${dk.divider}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2 }}>
                    COMMITTED TO ROADMAP
                  </div>
                  <div style={{ fontSize: '11px', color: dk.t3, marginTop: '2px' }}>
                    Mark as committed to include in roadmap view
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLocalIsCommitted(!localIsCommitted)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                    backgroundColor: localIsCommitted ? '#2563EB' : (isDark ? '#454545' : '#E2E8F0'),
                    cursor: 'pointer', position: 'relative', transition: 'background 200ms ease',
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', background: '#FFFFFF',
                    position: 'absolute', top: '3px',
                    left: localIsCommitted ? '23px' : '3px',
                    transition: 'left 200ms ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${dk.divider}` }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, marginBottom: '8px' }}>
              DESCRIPTION
            </div>
            {isEditing ? (
              <textarea
                value={localDescription}
                onChange={e => setLocalDescription(e.target.value)}
                rows={4}
                placeholder="Add a description..."
                style={{
                  width: '100%', borderRadius: '4px', border: `1px solid ${isDark ? '#454545' : 'rgba(15,23,42,0.14)'}`,
                  padding: '8px 12px', fontSize: '13px', color: dk.t1, resize: 'vertical',
                  fontFamily: 'var(--ds-font-family-body)', outline: 'none', background: isDark ? 'transparent' : '#FFFFFF',
                }}
              />
            ) : (
              <p style={{ fontSize: '13px', color: rawIdea.description ? dk.t1 : dk.t3, lineHeight: 1.5, margin: 0 }}>
                {rawIdea.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* IMPACT Score */}
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${dk.divider}` }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, marginBottom: '12px' }}>
              IMPACT SCORE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '20px' }}>
              <span style={{
                fontSize: '32px', fontWeight: 700, fontFamily: 'var(--ds-font-family-monospaced)',
                color: impactScore > 0 ? dk.t1 : dk.t3,
              }}>
                {impactScore.toFixed(2)}
              </span>
              <span style={{ fontSize: '13px', color: dk.t2 }}>out of 5.00</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 6px',
                borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                ...(impactScore >= 3.5
                  ? { backgroundColor: '#1B7F37', color: '#FFFFFF' }
                  : impactScore >= 2.0
                    ? { backgroundColor: '#0C66E4', color: '#FFFFFF' }
                    : { backgroundColor: '#DFE1E6', color: '#42526E' }),
              }}>
                {impactScore >= 3.5 ? 'HIGH' : impactScore >= 2.0 ? 'MEDIUM' : 'LOW'}
              </span>
            </div>

            {/* Dimension rows — ALL circles SAME neutral colour */}
            {[
              { letter: 'I', name: 'Investor Fit', weight: '25%', score: (factors as any).I ?? 0 },
              { letter: 'M', name: 'Investor Size', weight: '20%', score: (factors as any).M ?? 0 },
              { letter: 'P', name: 'Problem Severity', weight: '20%', score: (factors as any).P ?? 0 },
              { letter: 'A', name: 'Investor Benefit', weight: '15%', score: (factors as any).A ?? 0 },
              { letter: 'C', name: 'Complexity (inv.)', weight: '10%', score: (factors as any).C ?? 0 },
              { letter: 'T', name: 'Time to Value', weight: '10%', score: (factors as any).T ?? 0 },
            ].map(dim => (
              <div key={dim.letter} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: isDark ? '#2E2E2E' : '#E2E8F0', color: dk.t2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, flexShrink: 0,
                }}>
                  {dim.letter}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: dk.t1 }}>{dim.name}</span>
                    <span style={{ fontSize: '12px', color: dk.t2 }}>{dim.weight}</span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '4px', backgroundColor: isDark ? '#2E2E2E' : '#E2E8F0', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${(dim.score / 5) * 100}%`,
                      backgroundColor: dim.score > 0 ? '#2563EB' : 'transparent',
                      borderRadius: '4px', transition: 'width 300ms ease',
                    }} />
                  </div>
                </div>
                <span style={{
                  fontFamily: 'var(--ds-font-family-monospaced)', fontSize: '14px', fontWeight: 650,
                  color: dim.score > 0 ? dk.t1 : dk.t3,
                  minWidth: '30px', textAlign: 'right',
                }}>
                  {dim.score.toFixed(1)}
                </span>
              </div>
            ))}
          </div>

          {/* Comments */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, marginBottom: '12px' }}>
              COMMENTS
            </div>
            <CommentsSection ideaId={rawIdea.id} />
          </div>
        </div>

        {/* ─── FOOTER (edit mode) ─── */}
        {isEditing && (
          <div style={{
            padding: '12px 24px', borderTop: `1px solid ${dk.border}`,
            backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexShrink: 0,
          }}>
            <button onClick={() => { resetLocalState(); setIsEditing(false); }} style={{
              height: '50px', padding: '0 16px', borderRadius: '6px',
              border: `1px solid ${dk.border}`,
              background: isDark ? 'transparent' : '#FFFFFF', color: dk.t2,
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={updateIdea.isPending} style={{
              height: '50px', padding: '0 16px', borderRadius: '6px',
              border: 'none', background: '#2563EB', color: '#FFFFFF',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              opacity: updateIdea.isPending ? 0.7 : 1,
            }}>
              {updateIdea.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

// ─── Comments Section ────────────────────────────────────────────
function CommentsSection({ ideaId }: { ideaId: string | null }) {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;
  const { data: comments = [], isLoading } = useIdeaComments(ideaId);
  const addComment = useAddIdeaComment();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');

  const handleSubmit = async () => {
    if (!newComment.trim() || !ideaId) return;
    try {
      await addComment.mutateAsync({ ideaId, userId: user?.id || '', content: newComment.trim() });
      setNewComment('');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (isLoading) return <div style={{ fontSize: '13px', color: dk.t3 }}>Loading comments...</div>;

  return (
    <div>
      {comments.length === 0 ? (
        <p style={{ fontSize: '13px', color: dk.t3, margin: 0 }}>No comments yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {comments.map((c: any) => {
            const name = c.author_name || c.commenter_name || 'Unknown';
            const initials = name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);
            const timeAgo = c.created_at ? getRelativeTime(c.created_at) : '';
            return (
              <div key={c.id} style={{
                background: isDark ? '#1F1F1F' : '#FFFFFF', border: `1px solid ${dk.divider}`,
                borderRadius: '6px', padding: '12px 16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', background: '#2563EB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#FFF', fontSize: '10px', fontWeight: 700,
                    }}>{initials}</div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: dk.t1 }}>{name}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--ds-font-family-monospaced)', fontSize: '12px', color: dk.t3 }}>{timeAgo}</span>
                </div>
                <div style={{ fontSize: '14px', color: dk.t2, lineHeight: 1.5 }}>
                  {c.body || c.comment_text || ''}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment... (Ctrl+Enter to send)"
          style={{
            flex: 1, minHeight: '50px', maxHeight: '120px', resize: 'vertical',
            border: `1px solid ${dk.border}`, borderRadius: '6px', padding: '8px 12px',
            fontSize: '14px', fontFamily: 'var(--ds-font-family-body)', outline: 'none', color: dk.t1,
            background: isDark ? 'transparent' : '#FFFFFF',
          }}
        />
        {newComment.trim() && (
          <button
            onClick={handleSubmit}
            disabled={addComment.isPending}
            style={{
              background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px',
              width: '36px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
