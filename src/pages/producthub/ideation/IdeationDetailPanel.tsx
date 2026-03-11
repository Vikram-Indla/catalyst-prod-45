/**
 * IdeationDetailPanel — NUCLEAR REDESIGN
 * 480px drawer, edit mode, V12 contrast, no dots, neutral dimension circles
 * Wiring Audit (Sacred Gate): CRUD calls ideationService, invalidates ['ideas','roadmap'] + ['initiatives']
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Edit2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Idea, STATUS_CONFIG, PRIORITY_CONFIG, QUARTER_BADGE, IDEA_IMPACT_FACTORS, getImpactColor } from './ideation-data';
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
      const { data, error } = await supabase
        .from('ph_ideas')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['ideas-roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
    },
  });
}

const formatSource = (source: string): string => {
  const map: Record<string, string> = {
    'ministry_directive': 'Ministry Directive', 'internal': 'Internal',
    'stakeholder': 'Stakeholder', 'customer': 'Customer Feedback', 'research': 'Research',
  };
  return map[source?.toLowerCase()] || source || '—';
};

export default function IdeationDetailPanel({ ideaKey, onClose, onConvert }: Props) {
  const { data: rawIdea, isLoading } = useIdeaRaw(ideaKey);
  const { data: dbFactors } = useImpactFactors(ideaKey);
  const updateIdea = useUpdateIdea();

  const [isEditing, setIsEditing] = useState(false);
  const [localStatus, setLocalStatus] = useState('');
  const [localPriority, setLocalPriority] = useState('');
  const [localTheme, setLocalTheme] = useState('');
  const [localTeam, setLocalTeam] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const isSaving = useRef(false);

  // Populate local state when rawIdea loads
  useEffect(() => {
    if (rawIdea) {
      setLocalStatus(rawIdea.status || 'Draft');
      setLocalPriority(rawIdea.priority || 'P2');
      setLocalTheme(rawIdea.theme || '');
      setLocalTeam(rawIdea.assigned_team || '');
      setLocalDescription(rawIdea.description || '');
    }
  }, [rawIdea]);

  const resetLocalState = () => {
    if (rawIdea) {
      setLocalStatus(rawIdea.status || 'Draft');
      setLocalPriority(rawIdea.priority || 'P2');
      setLocalTheme(rawIdea.theme || '');
      setLocalTeam(rawIdea.assigned_team || '');
      setLocalDescription(rawIdea.description || '');
    }
  };

  const handleSave = async () => {
    if (!rawIdea?.id || isSaving.current) return;
    isSaving.current = true;
    try {
      await updateIdea.mutateAsync({
        id: rawIdea.id,
        updates: {
          status: localStatus,
          priority: localPriority,
          theme: localTheme || null,
          assigned_team: localTeam || null,
          description: localDescription || null,
        },
      });
      toast.success('Idea updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update idea');
      console.error(error);
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
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: '#FFFFFF', zIndex: 201, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#94A3B8', fontSize: '14px' }}>Loading...</span>
      </div>
    </>
  );
  if (!rawIdea) return null;

  const impactScore = parseFloat(rawIdea.impact_total) || 0;
  const factors = dbFactors || IDEA_IMPACT_FACTORS[rawIdea.idea_key] || { I: 0, M: 0, P: 0, A: 0, C: 0, T: 0 };
  const assigneeName = rawIdea.assigned_to_name || null;
  const assigneeInitials = assigneeName ? assigneeName.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2) : '?';
  const quarter = rawIdea.roadmap_quarter || null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px',
        background: '#FFFFFF', zIndex: 201, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease forwards',
      }}>
        {/* ─── HEADER ─── */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid rgba(15,23,42,0.08)',
          display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700,
            color: '#2563EB', background: '#EFF6FF', padding: '3px 10px', borderRadius: '4px',
          }}>
            {rawIdea.idea_key}
          </span>
          <StatusLozenge status={localStatus} />
          <div style={{ flex: 1 }} />
          <button onClick={() => setIsEditing(!isEditing)} style={{
            width: '32px', height: '32px', borderRadius: '6px',
            border: '1px solid rgba(15,23,42,0.12)',
            background: isEditing ? '#EFF6FF' : '#FFFFFF',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#64748B',
          }}>
            <Edit2 size={14} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94A3B8' }}>
            <X size={18} />
          </button>
        </div>

        {/* ─── BODY ─── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Title */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>
              {rawIdea.title}
            </h2>
          </div>

          {/* Convert banner */}
          {localStatus === 'Approved' && (
            <div style={{
              margin: '16px 24px 0', background: '#F0FDF4', border: '1px solid #86EFAC',
              borderRadius: '6px', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Ready for promotion</div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Convert to an initiative to begin planning.</div>
              </div>
              <button onClick={() => onConvert?.(rawIdea.idea_key)} style={{
                background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px',
                padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}>
                → Convert
              </button>
            </div>
          )}

          {/* Details Grid */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FieldPair label="Status" value={
                isEditing ? (
                  <select value={localStatus} onChange={e => setLocalStatus(e.target.value)} style={selectStyle}>
                    {['Draft', 'Submitted', 'Under Review', 'Approved', 'Converted'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : <StatusLozenge status={localStatus} />
              } />
              <FieldPair label="Priority" value={
                isEditing ? (
                  <select value={localPriority} onChange={e => setLocalPriority(e.target.value)} style={selectStyle}>
                    {['P1', 'P2', 'P3', 'P4'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : <PriorityLozenge priority={localPriority} />
              } />
              <FieldPair label="Type" value={
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>{rawIdea.idea_type || 'Feature'}</span>
              } />
              <FieldPair label="Source" value={
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>{formatSource(rawIdea.source)}</span>
              } />
              <FieldPair label="Theme" value={
                isEditing ? (
                  <input value={localTheme} onChange={e => setLocalTheme(e.target.value)} style={inputStyle} placeholder="Enter theme" />
                ) : <span style={{ fontSize: '13px', fontWeight: 500, color: localTheme ? '#0F172A' : '#94A3B8' }}>{localTheme || '—'}</span>
              } />
              <FieldPair label="Assigned Team" value={
                isEditing ? (
                  <input value={localTeam} onChange={e => setLocalTeam(e.target.value)} style={inputStyle} placeholder="Enter team" />
                ) : <span style={{ fontSize: '13px', fontWeight: 500, color: localTeam ? '#0F172A' : '#94A3B8' }}>{localTeam || '—'}</span>
              } />
              <FieldPair label="Target Release" value={
                <span style={{ fontSize: '13px', fontWeight: 500, color: rawIdea.target_release_date ? '#0F172A' : '#94A3B8' }}>
                  {rawIdea.target_release_date ? new Date(rawIdea.target_release_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                </span>
              } />
              <FieldPair label="Quarter" value={
                quarter ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    height: 20, padding: '0 6px', borderRadius: 3,
                    fontSize: '11px', fontWeight: 700,
                    background: QUARTER_BADGE[quarter]?.bg || '#E2E8F0',
                    color: QUARTER_BADGE[quarter]?.text || '#94A3B8',
                  }}>{quarter} 2026</span>
                ) : <span style={{ fontSize: '13px', color: '#94A3B8' }}>—</span>
              } />
              <FieldPair label="Assignee" value={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', background: '#2563EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#FFF', fontSize: '10px', fontWeight: 700, flexShrink: 0,
                  }}>{assigneeInitials}</div>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: assigneeName ? '#0F172A' : '#94A3B8' }}>
                    {assigneeName || 'Unassigned'}
                  </span>
                </div>
              } />
              <FieldPair label="Created" value={
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>
                  {rawIdea.created_at ? new Date(rawIdea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
              } />
            </div>
          </div>

          {/* Description */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '8px' }}>
              DESCRIPTION
            </div>
            {isEditing ? (
              <textarea
                value={localDescription}
                onChange={e => setLocalDescription(e.target.value)}
                rows={4}
                style={{
                  width: '100%', borderRadius: '4px', border: '1px solid rgba(15,23,42,0.14)',
                  padding: '8px 12px', fontSize: '13px', color: '#0F172A', resize: 'vertical',
                  fontFamily: "'Inter', sans-serif", outline: 'none',
                }}
              />
            ) : (
              <p style={{ fontSize: '13px', color: rawIdea.description ? '#0F172A' : '#94A3B8', lineHeight: 1.5, margin: 0 }}>
                {rawIdea.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* IMPACT Score */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '12px' }}>
              IMPACT SCORE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '20px' }}>
              <span style={{
                fontSize: '32px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                color: impactScore > 0 ? '#0F172A' : '#94A3B8',
              }}>
                {impactScore.toFixed(2)}
              </span>
              <span style={{ fontSize: '13px', color: '#64748B' }}>out of 5.00</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 6px',
                borderRadius: '3px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                ...(impactScore >= 3.5
                  ? { backgroundColor: '#E3FCEF', color: '#006644' }
                  : impactScore >= 2.0
                    ? { backgroundColor: '#DEEBFF', color: '#0747A6' }
                    : { backgroundColor: '#DFE1E6', color: '#253858' }),
              }}>
                {impactScore >= 3.5 ? 'HIGH' : impactScore >= 2.0 ? 'MEDIUM' : 'LOW'}
              </span>
            </div>

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
                  backgroundColor: '#E2E8F0', color: '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, flexShrink: 0,
                }}>
                  {dim.letter}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>{dim.name}</span>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>{dim.weight}</span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${(dim.score / 5) * 100}%`,
                      backgroundColor: dim.score > 0 ? '#2563EB' : 'transparent',
                      borderRadius: '2px', transition: 'width 300ms ease',
                    }} />
                  </div>
                </div>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 650,
                  color: dim.score > 0 ? '#0F172A' : '#94A3B8',
                  minWidth: '30px', textAlign: 'right',
                }}>
                  {dim.score.toFixed(1)}
                </span>
              </div>
            ))}
          </div>

          {/* Comments */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '12px' }}>
              COMMENTS
            </div>
            <CommentsSection ideaId={rawIdea.id} />
          </div>
        </div>

        {/* ─── FOOTER (edit mode) ─── */}
        {isEditing && (
          <div style={{
            padding: '12px 24px', borderTop: '1px solid rgba(15,23,42,0.08)',
            backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexShrink: 0,
          }}>
            <button onClick={() => { resetLocalState(); setIsEditing(false); }} style={{
              height: '36px', padding: '0 16px', borderRadius: '6px',
              border: '1px solid rgba(15,23,42,0.12)',
              background: '#FFFFFF', color: '#334155',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={updateIdea.isPending} style={{
              height: '36px', padding: '0 16px', borderRadius: '6px',
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

// ─── Shared styles ───────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  height: '32px', borderRadius: '4px', border: '1px solid rgba(15,23,42,0.14)',
  padding: '0 8px', fontSize: '13px', color: '#0F172A', width: '100%', outline: 'none',
};

const inputStyle: React.CSSProperties = {
  height: '32px', borderRadius: '4px', border: '1px solid rgba(15,23,42,0.14)',
  padding: '0 8px', fontSize: '13px', color: '#0F172A', width: '100%', outline: 'none',
};

// ─── Sub-components ──────────────────────────────────────────────
function FieldPair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const,
        letterSpacing: '0.06em', color: '#64748B', marginBottom: '6px',
      }}>
        {label}
      </div>
      <div>{value}</div>
    </div>
  );
}

function StatusLozenge({ status }: { status: string }) {
  const statusMap: Record<string, { bg: string; text: string }> = {
    'Draft':        { bg: '#DFE1E6', text: '#253858' },
    'New':          { bg: '#DFE1E6', text: '#253858' },
    'Submitted':    { bg: '#DFE1E6', text: '#253858' },
    'Under Review': { bg: '#DEEBFF', text: '#0747A6' },
    'In Progress':  { bg: '#DEEBFF', text: '#0747A6' },
    'Approved':     { bg: '#E3FCEF', text: '#006644' },
    'Converted':    { bg: '#E3FCEF', text: '#006644' },
    'Done':         { bg: '#E3FCEF', text: '#006644' },
  };
  const style = statusMap[status] ?? { bg: '#DFE1E6', text: '#253858' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '3px',
      backgroundColor: style.bg, color: style.text,
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
      height: 20, minWidth: 26, padding: '0 4px', borderRadius: 3,
      fontSize: '11px', fontWeight: 650,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {priority}
    </span>
  );
}

// ─── Comments Section ────────────────────────────────────────────
function CommentsSection({ ideaId }: { ideaId: string | null }) {
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

  if (isLoading) return <div style={{ fontSize: '13px', color: '#94A3B8' }}>Loading comments...</div>;

  return (
    <div>
      {comments.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>No comments yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {comments.map((c: any) => {
            const name = c.author_name || c.commenter_name || 'Unknown';
            const initials = name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);
            const timeAgo = c.created_at ? getRelativeTime(c.created_at) : '';
            return (
              <div key={c.id} style={{
                background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.06)',
                borderRadius: '6px', padding: '12px 16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', background: '#2563EB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#FFF', fontSize: '10px', fontWeight: 700,
                    }}>{initials}</div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{name}</span>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#94A3B8' }}>{timeAgo}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
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
            flex: 1, minHeight: '36px', maxHeight: '120px', resize: 'vertical',
            border: '1px solid rgba(15,23,42,0.12)', borderRadius: '6px', padding: '8px 12px',
            fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#0F172A',
          }}
        />
        {newComment.trim() && (
          <button
            onClick={handleSubmit}
            disabled={addComment.isPending}
            style={{
              background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px',
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
