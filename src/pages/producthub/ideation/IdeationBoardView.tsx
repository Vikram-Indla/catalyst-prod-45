/**
 * IdeationBoardView — Kanban columns by status
 */
import React from 'react';
import { toast } from 'sonner';
import { Idea, IdeaStatus, STATUS_CONFIG, PRIORITY_CONFIG, AI_INSIGHTS, getImpactColor } from './ideation-data';

// Top 3 ideas by IMPACT score that have AI data get full insight strips
const TOP_AI_KEYS = new Set(['IDH-005', 'IDH-001', 'IDH-013']);

interface Props {
  ideas: Idea[];
  onOpenDetail: (key: string) => void;
}

const COLUMNS: { status: IdeaStatus; extra?: React.ReactNode }[] = [
  { status: 'submitted' },
  { status: 'under_review' },
  { status: 'approved', extra: <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: 600 }}>Ready to convert</span> },
  { status: 'converted', extra: <span style={{ fontSize: '10px', color: '#0D9488', fontWeight: 600 }}>→ Initiatives</span> },
  { status: 'draft' },
  { status: 'rejected' },
];

const INITIATIVE_LINKS: Record<string, string> = {
  'IDH-001': '↗ INIT-2026-001 · Linked Initiative',
  'IDH-013': '↗ INIT-2026-002 · 2 ideas merged',
};

export default function IdeationBoardView({ ideas, onOpenDetail }: Props) {
  return (
    <div style={{
      display: 'flex', gap: '12px', padding: '16px 28px',
      overflowX: 'auto', minHeight: 'calc(100vh - 280px)', alignItems: 'flex-start',
    }}>
      {COLUMNS.map(col => {
        const sc = STATUS_CONFIG[col.status];
        const colIdeas = ideas.filter(i => i.status === col.status);
        return (
          <div key={col.status} style={{ minWidth: '280px', width: '280px', flexShrink: 0 }}>
            {/* Column Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '0 4px',
            }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: sc.dot, flexShrink: 0 }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{sc.label}</span>
              <span style={{
                fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px',
                padding: '1px 7px', color: '#94A3B8',
              }}>
                {colIdeas.length}
              </span>
              <span style={{ flex: 1 }} />
              {col.extra}
            </div>

            {/* Cards */}
            {colIdeas.map(idea => (
              <IdeaBoardCard
                key={idea.key}
                idea={idea}
                columnStatus={col.status}
                onClick={() => onOpenDetail(idea.key)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function IdeaBoardCard({ idea, columnStatus, onClick }: { idea: Idea; columnStatus: IdeaStatus; onClick: () => void }) {
  const pc = PRIORITY_CONFIG[idea.priority] || PRIORITY_CONFIG.P4;
  const isAiReady = idea.ai === 'ready';
  const showFullAiStrip = isAiReady && TOP_AI_KEYS.has(idea.key) && AI_INSIGHTS[idea.key];
  const aiInsight = AI_INSIGHTS[idea.key];
  const initLink = INITIATIVE_LINKS[idea.key];

  const isApproved = columnStatus === 'approved';
  const isConverted = columnStatus === 'converted';
  const isDraft = columnStatus === 'draft';
  const isRejected = columnStatus === 'rejected';

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: isApproved
          ? 'linear-gradient(135deg, #F0FDF4, #EFF6FF)'
          : isConverted ? '#F0FDFA' : '#FFFFFF',
        border: `1px solid ${isApproved ? '#86EFAC' : isConverted ? '#CCFBF1' : '#E2E8F0'}`,
        borderRadius: '8px', padding: '12px', marginBottom: '8px', cursor: 'grab',
        opacity: isDraft ? 0.7 : isRejected ? 0.55 : 1,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.07)';
        e.currentTarget.style.borderColor = isApproved ? '#86EFAC' : isConverted ? '#99F6E4' : '#D4D4D8';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = isApproved ? '#86EFAC' : isConverted ? '#CCFBF1' : '#E2E8F0';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Small AI dot indicator (non-top-3 AI cards) */}
      {isAiReady && !showFullAiStrip && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED',
        }} />
      )}

      {/* Top row: key + priority */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600,
          color: isConverted ? '#0D9488' : '#2563EB',
        }}>
          {idea.key}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 800,
          background: pc.bg, color: pc.text, padding: '1px 5px', borderRadius: '3px',
        }}>
          {idea.priority}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontSize: '13px', fontWeight: 600,
        color: isConverted ? '#0D9488' : '#0F172A',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        marginBottom: '6px', lineHeight: 1.35,
      }}>
        {idea.title}
      </div>

      {/* Type badge — muted gray for all */}
      <div style={{ marginBottom: '8px' }}>
        <span style={{
          background: '#F4F4F5', color: '#71717A', padding: '2px 6px', borderRadius: '4px',
          fontSize: '10px', fontWeight: 600,
        }}>
          {idea.type.charAt(0).toUpperCase() + idea.type.slice(1)}
        </span>
      </div>

      {/* Divider + stats */}
      <div style={{ borderTop: '1px solid #F4F4F5', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
          IMPACT {idea.impact.toFixed(2)}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: 600,
          color: idea.votes > 0 ? '#16A34A' : idea.votes < 0 ? '#EF4444' : '#94A3B8',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          ▲ {idea.votes}
        </span>
      </div>

      {/* AI insight strip — only top 3 */}
      {showFullAiStrip && (
        <div style={{
          marginTop: '8px', background: '#F5F3FF', borderRadius: '6px',
          padding: '5px 8px', fontSize: '10px', color: '#7C3AED', fontWeight: 600,
        }}>
          {aiInsight}
        </div>
      )}

      {/* Initiative link (converted) */}
      {isConverted && initLink && (
        <div style={{
          marginTop: '8px', background: '#CCFBF1', border: '1px solid #0D9488',
          borderRadius: '6px', padding: '5px 8px', fontSize: '10px', color: '#0F766E', fontWeight: 600,
        }}>
          {initLink}
        </div>
      )}

      {/* Convert button (approved) */}
      {isApproved && (
        <button
          onClick={e => {
            e.stopPropagation();
            toast.success('Conversion initiated — redirecting to Initiative creation');
          }}
          style={{
            width: '100%', marginTop: '8px', padding: '6px', background: '#2563EB',
            color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px',
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          → Convert to Initiative
        </button>
      )}
    </div>
  );
}
