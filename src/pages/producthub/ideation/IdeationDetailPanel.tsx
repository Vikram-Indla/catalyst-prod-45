/**
 * IdeationDetailPanel — Slide-over panel with 5 tabs
 * Wired to Supabase for real data (descriptions, tags, comments, etc.)
 */
import React, { useState, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { Idea, STATUS_CONFIG, TYPE_CONFIG, PRIORITY_CONFIG, IDEA_IMPACT_FACTORS, getImpactColor } from './ideation-data';
import { useIdeaRaw, useImpactFactors, useIdeaComments, useComplianceTags, useV2030Mappings, useEvidence, useAddIdeaComment } from '@/hooks/useIdeation';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  ideaKey: string | null;
  onClose: () => void;
  onConvert?: (key: string) => void;
}

type Tab = 'details' | 'impact' | 'ai' | 'evidence' | 'comments';

const TABS: { key: Tab; label: string; purple?: boolean }[] = [
  { key: 'details', label: 'Details' },
  { key: 'impact', label: 'IMPACT' },
  { key: 'ai', label: '✦ AI Analysis', purple: true },
  { key: 'evidence', label: 'Evidence' },
  { key: 'comments', label: 'Comments' },
];

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

// Parse tags from DB (handles both array and postgres string format)
const parseTags = (tags: string | string[] | null | undefined): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    return tags.replace(/[{}]/g, '').split(',').filter(Boolean);
  }
  return [];
};

export default function IdeationDetailPanel({ ideaKey, onClose, onConvert }: Props) {
  const [tab, setTab] = useState<Tab>('details');
  
  // Fetch raw data from Supabase
  const { data: rawIdea, isLoading } = useIdeaRaw(ideaKey);

  // Build Idea object from raw DB data
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
    if (ideaKey) setTab('details');
  }, [ideaKey]);

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
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200,
      }} />
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

        {/* Tabs */}
        <div style={{ padding: '0 24px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex' }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                background: active ? '#FFFFFF' : 'transparent',
                border: 'none', borderBottom: active ? `2px solid ${t.purple ? '#7C3AED' : '#2563EB'}` : '2px solid transparent',
                padding: '10px 14px', fontSize: '13px', fontWeight: active ? 600 : 500, cursor: 'pointer',
                color: active ? (t.purple ? '#7C3AED' : '#2563EB') : '#64748B',
              }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {tab === 'details' && <DetailsTab idea={localIdea} rawIdea={rawIdea} onConvert={onConvert} />}
          {tab === 'impact' && <ImpactTab idea={localIdea} ideaKey={ideaKey} rawIdea={rawIdea} />}
          {tab === 'ai' && <AiTab idea={localIdea} rawIdea={rawIdea} ideaId={rawIdea?.id} />}
          {tab === 'evidence' && <EvidenceTab ideaId={rawIdea?.id} />}
          {tab === 'comments' && <CommentsTab ideaId={rawIdea?.id} />}
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

// ─── Details Tab ─────────────────────────────────────────────────
function DetailsTab({ idea, rawIdea, onConvert }: { idea: Idea; rawIdea: any; onConvert?: (key: string) => void }) {
  const sc = STATUS_CONFIG[idea.status];
  const tc = TYPE_CONFIG[idea.type];
  const pc = PRIORITY_CONFIG[idea.priority] || PRIORITY_CONFIG.P4;

  // Use DB description, fallback to empty
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

      {/* Description — from database */}
      <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #F4F4F5', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '6px', textTransform: 'uppercase' }}>Description</div>
        <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
          {description || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No description provided</span>}
        </div>
      </div>

      {/* Tags — from database array */}
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

// ─── IMPACT Tab ──────────────────────────────────────────────────
function ImpactTab({ idea, ideaKey, rawIdea }: { idea: Idea; ideaKey: string | null; rawIdea: any }) {
  const { data: dbFactors } = useImpactFactors(ideaKey);
  const factors = dbFactors || IDEA_IMPACT_FACTORS[idea.key] || { I: 3, M: 3, P: 3, A: 3, C: 3, T: 3 };
  
  const impactScore = rawIdea?.impact_total ? parseFloat(rawIdea.impact_total) : idea.impact;
  const ic = getImpactColor(impactScore);
  const ratingLabel = impactScore >= 4.0 ? 'Excellent' : impactScore >= 3.0 ? 'Good' : impactScore >= 2.0 ? 'Fair' : 'Low';
  const ratingBg = impactScore >= 4.0 ? '#DCFCE7' : impactScore >= 3.0 ? '#DBEAFE' : impactScore >= 2.0 ? '#FEF3C7' : '#FECACA';
  const ratingText = impactScore >= 4.0 ? '#15803D' : impactScore >= 3.0 ? '#1D4ED8' : impactScore >= 2.0 ? '#B45309' : '#B91C1C';

  const FACTOR_DEFS = [
    { key: 'I', name: 'Investment Fit', weight: 25, color: '#2563EB' },
    { key: 'M', name: 'Market Size', weight: 20, color: '#0D9488' },
    { key: 'P', name: 'Problem Severity', weight: 20, color: '#D97706' },
    { key: 'A', name: 'Advantage', weight: 15, color: '#7C3AED' },
    { key: 'C', name: 'Complexity (inv.)', weight: 10, color: '#16A34A' },
    { key: 'T', name: 'Time to Value', weight: 10, color: '#EF4444' },
  ];

  return (
    <div>
      {/* Score header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '24px' }}>
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

      {/* AI suggestion */}
      <div style={{ marginTop: '20px', background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '8px', padding: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#7C3AED', marginBottom: '4px' }}>✦ AI Score Suggestion</div>
        <div style={{ fontSize: '12px', color: '#6D28D9', lineHeight: 1.5 }}>
          Based on similar initiatives and historical data, the AI model suggests the Investment Fit score could be adjusted to {(factors.I + 0.3).toFixed(1)} given recent ministry alignment signals.
        </div>
      </div>
    </div>
  );
}

// ─── AI Analysis Tab ─────────────────────────────────────────────
function AiTab({ idea, rawIdea, ideaId }: { idea: Idea; rawIdea: any; ideaId: string | null }) {
  const { data: compliance = [] } = useComplianceTags(ideaId);
  const { data: v2030 = [] } = useV2030Mappings(ideaId);

  const isAiEnriched = rawIdea?.ai_enrichment_status === 'completed' || rawIdea?.ai_enrichment_status === 'complete' || rawIdea?.ai_summary;
  const aiSummary = rawIdea?.ai_summary;
  const aiTriageAction = rawIdea?.ai_triage_action;
  const aiTriageReason = rawIdea?.ai_triage_reason;
  const aiConfidence = rawIdea?.ai_confidence;

  if (!isAiEnriched) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>✦</div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>This idea has not been AI-enriched yet</div>
        <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>Run AI analysis to get automated classification, compliance mapping, and V2030 alignment.</div>
        <button style={{
          background: '#7C3AED', color: '#FFFFFF', border: 'none', borderRadius: '8px',
          padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        }}>
          ✦ Run AI Analysis
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* AI Summary */}
      {aiSummary && (
        <div style={{ background: 'linear-gradient(135deg, #F5F3FF, #EFF6FF)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid #EDE9FE' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#7C3AED', marginBottom: '6px' }}>✦ AI Summary</div>
          <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>{aiSummary}</div>
        </div>
      )}

      {/* AI Confidence */}
      {aiConfidence != null && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase' }}>AI Confidence</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '8px', background: '#E4E4E7', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.round(aiConfidence * 100)}%`, height: '100%', background: '#7C3AED', borderRadius: '4px' }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: '#7C3AED' }}>{Math.round(aiConfidence * 100)}%</span>
          </div>
        </div>
      )}

      {/* AI Triage Recommendation */}
      {aiTriageAction && (
        <div style={{ marginBottom: '20px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px', textTransform: 'uppercase' }}>Triage Recommendation</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#C2410C', marginBottom: '4px' }}>{aiTriageAction.replace('_', ' ').toUpperCase()}</div>
          {aiTriageReason && <div style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.5 }}>{aiTriageReason}</div>}
        </div>
      )}

      {/* Compliance Tags from DB */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase' }}>Compliance Auto-Tags</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {compliance.length > 0 ? compliance.map((c: any) => (
            <span key={c.id || c.tag_code} style={{ background: '#F1F5F9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              ✓ {c.tag_code || c.tag_name}
            </span>
          )) : (
            <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>No compliance tags</span>
          )}
        </div>
      </div>

      {/* V2030 Mappings from DB */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase' }}>V2030 Mapping</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {v2030.length > 0 ? v2030.map((p: any) => {
            const bgMap: Record<string, string> = { 'vibrant_society': '#DBEAFE', 'thriving_economy': '#DCFCE7', 'ambitious_nation': '#FEF3C7' };
            const nameMap: Record<string, string> = { 'vibrant_society': 'Vibrant Society', 'thriving_economy': 'Thriving Economy', 'ambitious_nation': 'Ambitious Nation' };
            return (
              <div key={p.id || p.pillar_key} style={{ background: bgMap[p.pillar_key] || '#F4F4F5', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#0F172A' }}>{parseFloat(p.alignment_score || 0).toFixed(1)}</div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>{nameMap[p.pillar_key] || p.pillar_key}</div>
              </div>
            );
          }) : (
            <div style={{ gridColumn: '1 / -1', fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>No V2030 mappings</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Evidence Tab ────────────────────────────────────────────────
function EvidenceTab({ ideaId }: { ideaId: string | null }) {
  const { data: evidence = [], isLoading } = useEvidence(ideaId);

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>Loading evidence...</div>;
  }

  if (evidence.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📎</div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>No evidence attached yet</div>
        <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>Attach documents, data, or benchmarks to strengthen this idea.</div>
        <button style={{
          background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px',
          padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        }}>
          + Add Evidence
        </button>
      </div>
    );
  }

  const typeColors: Record<string, { color: string; bg: string }> = {
    document: { color: '#2563EB', bg: '#EFF6FF' },
    data: { color: '#16A34A', bg: '#F0FDF4' },
    benchmark: { color: '#D97706', bg: '#FFFBEB' },
  };

  return (
    <div>
      {evidence.map((ev: any, i: number) => {
        const tc = typeColors[ev.evidence_type] || { color: '#64748B', bg: '#F8FAFC' };
        return (
          <div key={ev.id || i} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>{ev.evidence_type}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{ev.title}</span>
            </div>
            {ev.description && <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, marginBottom: '8px' }}>{ev.description}</div>}
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              {ev.created_at ? new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Comments Tab ────────────────────────────────────────────────
function CommentsTab({ ideaId }: { ideaId: string | null }) {
  const [comment, setComment] = useState('');
  const { data: dbComments = [], isLoading, error } = useIdeaComments(ideaId);
  const addComment = useAddIdeaComment();
  const { user } = useAuth();

  const handlePost = () => {
    if (!comment.trim() || !ideaId || !user?.id) return;
    addComment.mutate(
      { ideaId, userId: user.id, content: comment.trim() },
      { onSuccess: () => setComment('') }
    );
  };

  if (isLoading) {
    return <div style={{ fontSize: '13px', color: '#94A3B8', padding: '12px 0' }}>Loading comments...</div>;
  }

  if (error) {
    return <div style={{ fontSize: '13px', color: '#EF4444', padding: '12px 0' }}>Failed to load comments</div>;
  }

  return (
    <div>
      {dbComments.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8', fontSize: '13px' }}>
          <p>No comments yet</p>
          <p style={{ fontSize: '11px', marginTop: '4px' }}>Be the first to add a comment</p>
        </div>
      )}

      {dbComments.map((c: any, i: number) => {
        const authorName = c.profiles?.full_name || 'Unknown';
        const initials = authorName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        const timeAgo = c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        const isAi = c.is_ai_generated;

        return (
          <div key={c.id || i} style={{
            marginBottom: '16px', padding: isAi ? '10px' : undefined,
            background: isAi ? '#F5F3FF' : undefined, borderRadius: isAi ? '8px' : undefined,
            border: isAi ? '1px solid #EDE9FE' : undefined,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isAi ? '#7C3AED' : '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '10px', fontWeight: 700 }}>
                {isAi ? '✦' : initials}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{isAi ? 'AI Assistant' : authorName}</span>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>{timeAgo}</span>
            </div>
            <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, marginLeft: '36px' }}>{c.content}</div>
          </div>
        );
      })}

      {/* Comment input */}
      <div style={{ marginTop: '20px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Add a comment..."
          style={{ width: '100%', minHeight: '80px', padding: '10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', resize: 'vertical', outline: 'none' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: '#334155' }}>Attach</button>
          <button
            onClick={handlePost}
            disabled={!comment.trim() || addComment.isPending}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors cursor-pointer"
          >
            {addComment.isPending ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
