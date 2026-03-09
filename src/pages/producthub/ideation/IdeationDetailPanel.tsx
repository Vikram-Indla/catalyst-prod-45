/**
 * IdeationDetailPanel — Single-page slide-over panel
 * Sections: Details → IMPACT → Comments (no tabs)
 */
import React, { useState, useEffect } from 'react';
import { X, Edit2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Idea, STATUS_CONFIG, TYPE_CONFIG, PRIORITY_CONFIG, IDEA_IMPACT_FACTORS, getImpactColor } from './ideation-data';
import { useIdeaRaw, useImpactFactors, useIdeaComments, useAddIdeaComment } from '@/hooks/useIdeation';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  ideaKey: string | null;
  onClose: () => void;
  onConvert?: (key: string) => void;
}

// Source enum formatter
const formatSource = (source: string): string => {
  const map: Record<string, string> = {
    'ministry_directive': 'Ministry Directive',
    'Ministry Directive': 'Ministry Directive',
    'internal': 'Internal',
    'Internal': 'Internal',
    'stakeholder': 'Stakeholder',
    'Stakeholder': 'Stakeholder',
    'customer': 'Customer Feedback',
    'Customer': 'Customer Feedback',
    'Customer Feedback': 'Customer Feedback',
    'research': 'Research',
    'Research': 'Research',
  };
  return map[source] || source;
};

// Parse tags from DB
const parseTags = (tags: string | string[] | null | undefined): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    return tags.replace(/[{}]/g, '').split(',').filter(Boolean);
  }
  return [];
};

export default function IdeationDetailPanel({ ideaKey, onClose, onConvert }: Props) {
  const { data: rawIdea, isLoading } = useIdeaRaw(ideaKey);

  const localIdea: Idea | null = rawIdea ? {
    key: rawIdea.idea_key,
    title: rawIdea.title,
    subtitle: `${rawIdea.source || 'Internal'} · ${rawIdea.created_at ? new Date(rawIdea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}`,
    status: ({'Draft': 'draft', 'Submitted': 'submitted', 'Under Review': 'under_review', 'Approved': 'approved', 'Rejected': 'rejected', 'Converted': 'converted'} as any)[rawIdea.status] || 'draft',
    type: ({'Opportunity': 'opportunity', 'Solution': 'solution', 'Feature Request': 'feature', 'Improvement': 'improvement', 'Problem': 'problem'} as any)[rawIdea.idea_type] || 'feature',
    priority: rawIdea.priority || 'P2',
    impact: parseFloat(rawIdea.impact_total) || 0,
    votes: rawIdea.vote_count || 0,
    initiative: rawIdea.linked_initiative_key || null,
    dept: rawIdea.department || '',
    assignee: rawIdea.assigned_to_name ? { name: rawIdea.assigned_to_name, initials: rawIdea.assigned_to_name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2), color: '#2563EB' } : null,
    ai: rawIdea.ai_enrichment_status === 'completed' ? 'ready' : 'pending',
    theme: rawIdea.theme || null,
    assigned_team: rawIdea.assigned_team || null,
    target_release_date: rawIdea.target_release_date || null,
  } : null;

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
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '680px', background: '#FFFFFF', zIndex: 201, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#94A3B8', fontSize: '14px' }}>Loading...</span>
      </div>
    </>
  );
  if (!localIdea) return null;

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200 }} />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '680px',
        background: '#FFFFFF', zIndex: 201, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease forwards',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 700,
            color: '#2563EB', background: '#EFF6FF', padding: '3px 10px', borderRadius: '6px',
          }}>
            {localIdea.key}
          </span>
          <span style={{ fontSize: '17px', fontWeight: 700, flex: 1, color: '#0F172A' }}>{localIdea.title}</span>
          <button onClick={() => {}} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#64748B' }}>
            <Edit2 size={14} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94A3B8' }}>
            <X size={18} />
          </button>
        </div>

        {/* Single scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* ─── DETAILS SECTION ─── */}
          <DetailsSection idea={localIdea} rawIdea={rawIdea} onConvert={onConvert} />

          {/* ─── Divider ─── */}
          <div style={{ height: '1px', background: '#E2E8F0', margin: '24px 0' }} />

          {/* ─── IMPACT SECTION ─── */}
          <SectionHeader label="IMPACT Score" />
          <ImpactSection idea={localIdea} ideaKey={ideaKey} rawIdea={rawIdea} />

          {/* ─── Divider ─── */}
          <div style={{ height: '1px', background: '#E2E8F0', margin: '24px 0' }} />

          {/* ─── COMMENTS SECTION ─── */}
          <SectionHeader label="Comments" />
          <CommentsSection ideaId={rawIdea?.id} />
        </div>
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

// ─── Section Header ──────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
      {label}
    </div>
  );
}

// ─── Details Section ─────────────────────────────────────────────
function DetailsSection({ idea, rawIdea, onConvert }: { idea: Idea; rawIdea: any; onConvert?: (key: string) => void }) {
  const sc = STATUS_CONFIG[idea.status];
  const tc = TYPE_CONFIG[idea.type];
  const pc = PRIORITY_CONFIG[idea.priority] || PRIORITY_CONFIG.P4;

  const description = rawIdea?.description || null;
  const source = rawIdea?.source ? formatSource(rawIdea.source) : idea.subtitle.split(' · ')[0];
  const tags = parseTags(rawIdea?.tags);
  const department = rawIdea?.department || idea.dept;

  return (
    <div>
      {/* Convert banner for approved ideas */}
      {idea.status === 'approved' && (
        <div style={{
          background: 'linear-gradient(90deg, #F0FDF4, #EFF6FF)', border: '1px solid #86EFAC',
          borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '20px' }}>🚀</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>This idea is approved and ready for promotion</div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Convert to an initiative to begin planning and execution.</div>
          </div>
          <button onClick={() => onConvert?.(idea.key)} style={{
            background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px',
            padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>
            → Convert to Initiative
          </button>
        </div>
      )}

      {/* Field grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <FieldRow label="Status">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: sc.bg, color: sc.text, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.dot }} />
            {sc.label}
          </span>
        </FieldRow>
        <FieldRow label="Priority">
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 800, background: pc.bg, color: pc.text, padding: '2px 7px', borderRadius: '4px' }}>{idea.priority}</span>
        </FieldRow>
        <FieldRow label="Type">
          <span style={{ background: tc.bg, color: tc.text, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{tc.label}</span>
        </FieldRow>
        <FieldRow label="Source"><span style={{ fontSize: '13px', color: '#334155' }}>{source}</span></FieldRow>
        <FieldRow label="Department"><span style={{ fontSize: '13px', color: '#334155' }}>{department}</span></FieldRow>
        <FieldRow label="Assignee">
          {idea.assignee ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: idea.assignee.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '9px', fontWeight: 700 }}>{idea.assignee.initials}</div>
              <span style={{ fontSize: '13px', color: '#334155' }}>{idea.assignee.name}</span>
            </div>
          ) : <span style={{ fontSize: '13px', color: '#94A3B8' }}>Unassigned</span>}
        </FieldRow>
        <FieldRow label="Created"><span style={{ fontSize: '13px', color: '#334155' }}>{idea.subtitle.split(' · ')[1]}</span></FieldRow>
        <FieldRow label="Votes">
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: idea.votes > 0 ? '#16A34A' : idea.votes < 0 ? '#EF4444' : '#94A3B8' }}>
            ▲ {idea.votes}
          </span>
        </FieldRow>
        <FieldRow label="Theme">
          <span style={{ fontSize: '13px', color: idea.theme ? '#334155' : '#94A3B8', fontStyle: idea.theme ? 'normal' : 'italic' }}>
            {idea.theme || 'No theme'}
          </span>
        </FieldRow>
        <FieldRow label="Assigned Team">
          <span style={{ fontSize: '13px', color: idea.assigned_team ? '#334155' : '#94A3B8', fontStyle: idea.assigned_team ? 'normal' : 'italic' }}>
            {idea.assigned_team || 'Unassigned'}
          </span>
        </FieldRow>
        <FieldRow label="Target Release">
          <span style={{ fontSize: '13px', color: idea.target_release_date ? '#334155' : '#94A3B8', fontStyle: idea.target_release_date ? 'normal' : 'italic' }}>
            {idea.target_release_date ? new Date(idea.target_release_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Not set'}
          </span>
        </FieldRow>
        <FieldRow label="Release Quarter">
          <span style={{ fontSize: '13px', color: idea.target_release_date ? '#334155' : '#94A3B8' }}>
            {idea.target_release_date ? `Q${Math.ceil((new Date(idea.target_release_date).getMonth() + 1) / 3)} ${new Date(idea.target_release_date).getFullYear()}` : '—'}
          </span>
        </FieldRow>
      </div>

      {/* Description */}
      <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #F4F4F5', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '6px', textTransform: 'uppercase' }}>Description</div>
        <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
          {description || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No description provided</span>}
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {tags.length > 0 ? (
          [...new Set(tags)].map(tag => (
            <span key={tag} style={{
              display: 'inline-flex', alignItems: 'center',
              background: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: '6px',
              fontSize: '11px', fontWeight: 500, border: '1px solid #E2E8F0',
            }}>{tag}</span>
          ))
        ) : (
          <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>No tags</span>
        )}
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
      {children}
    </div>
  );
}

// ─── IMPACT Section ──────────────────────────────────────────────
function ImpactSection({ idea, ideaKey, rawIdea }: { idea: Idea; ideaKey: string | null; rawIdea: any }) {
  const { data: dbFactors } = useImpactFactors(ideaKey);
  const factors = dbFactors || IDEA_IMPACT_FACTORS[idea.key] || { I: 3, M: 3, P: 3, A: 3, C: 3, T: 3 };

  const impactScore = rawIdea?.impact_total ? parseFloat(rawIdea.impact_total) : idea.impact;
  const ic = getImpactColor(impactScore);
  const ratingLabel = impactScore >= 4.0 ? 'Excellent' : impactScore >= 3.0 ? 'Good' : impactScore >= 2.0 ? 'Fair' : 'Low';
  const ratingBg = impactScore >= 4.0 ? '#DCFCE7' : impactScore >= 3.0 ? '#DBEAFE' : impactScore >= 2.0 ? '#FEF3C7' : '#FECACA';
  const ratingText = impactScore >= 4.0 ? '#15803D' : impactScore >= 3.0 ? '#1D4ED8' : impactScore >= 2.0 ? '#B45309' : '#B91C1C';

  const FACTOR_DEFS = [
    { key: 'I', name: 'Investor Fit', weight: 25, color: '#2563EB' },
    { key: 'M', name: 'Investor Size', weight: 20, color: '#0D9488' },
    { key: 'P', name: 'Problem Severity', weight: 20, color: '#D97706' },
    { key: 'A', name: 'Investor Benefit', weight: 15, color: '#16A34A' },
    { key: 'C', name: 'Complexity (inv.)', weight: 10, color: '#0D9488' },
    { key: 'T', name: 'Time to Value', weight: 10, color: '#EF4444' },
  ];

  return (
    <div>
      {/* Score header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '20px' }}>
        <span style={{ fontSize: '36px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-1px', color: ic.text }}>
          {impactScore.toFixed(2)}
        </span>
        <span style={{ fontSize: '13px', color: '#94A3B8' }}>out of 5.00</span>
        <span style={{ fontSize: '11px', fontWeight: 600, background: ratingBg, color: ratingText, padding: '3px 8px', borderRadius: '10px' }}>{ratingLabel}</span>
      </div>

      {/* Factor rows */}
      {FACTOR_DEFS.map(f => {
        const val = factors[f.key as keyof typeof factors];
        return (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
              {f.key}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{f.name}</span>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>{f.weight}%</span>
              </div>
              <div style={{ height: '8px', background: '#E4E4E7', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(val / 5) * 100}%`, height: '100%', background: f.color, borderRadius: '4px', transition: 'width 0.3s' }} />
              </div>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: f.color, minWidth: '28px', textAlign: 'right' }}>
              {val.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Comments Section ────────────────────────────────────────────
function CommentsSection({ ideaId }: { ideaId: string | null }) {
  const { data: comments = [], isLoading } = useIdeaComments(ideaId);
  const addComment = useAddIdeaComment(ideaId || '');
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');

  const handleSubmit = async () => {
    if (!newComment.trim() || !ideaId) return;
    try {
      await addComment.mutateAsync({ body: newComment.trim(), userId: user?.id });
      setNewComment('');
      toast.success('Comment added');
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

  if (isLoading) {
    return <div style={{ fontSize: '13px', color: '#94A3B8' }}>Loading comments...</div>;
  }

  return (
    <div>
      {comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8', fontSize: '13px', fontStyle: 'italic' }}>
          No comments yet. Be the first to add one.
        </div>
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

      {/* Comment input */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment... (Ctrl+Enter to send)"
          style={{
            flex: 1, minHeight: '36px', maxHeight: '120px', resize: 'vertical',
            border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px',
            fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none',
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

// ─── Relative time helper ────────────────────────────────────────
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
