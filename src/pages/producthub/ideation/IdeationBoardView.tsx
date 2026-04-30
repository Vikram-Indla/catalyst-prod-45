/**
 * IdeationBoardView — Kanban columns by status
 * V12 Hybrid Precision — no teal on titles, 3-color lozenges
 */
import React from 'react';
import { toast } from 'sonner';
import { Idea, IdeaStatus, STATUS_CONFIG, PRIORITY_CONFIG, AI_INSIGHTS, getImpactColor } from './ideation-data';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';

const TOP_AI_KEYS = new Set(['IDH-005', 'IDH-001', 'IDH-013']);

interface Props {
  ideas: Idea[];
  onOpenDetail: (key: string) => void;
  onConvert?: (key: string) => void;
}

const COLUMNS: { status: IdeaStatus; extra?: React.ReactNode }[] = [
  { status: 'submitted' },
  { status: 'under_review' },
  { status: 'approved', extra: <span style={{ fontSize: '10px', color: '#FFFFFF', fontWeight: 600 }}>Ready to convert</span> },
  { status: 'converted', extra: <span style={{ fontSize: '10px', color: '#FFFFFF', fontWeight: 600 }}>→ Requests</span> },
  { status: 'draft' },
  { status: 'rejected' },
];

const INITIATIVE_LINKS: Record<string, string> = {
  'IDH-001': '↗ INIT-2026-001 · Linked Request',
  'IDH-013': '↗ INIT-2026-002 · 2 ideas merged',
};

function getInitiativeLink(idea: Idea): string | null {
  if (INITIATIVE_LINKS[idea.key]) return INITIATIVE_LINKS[idea.key];
  if (idea.request) return `↗ ${idea.request} · Linked Request`;
  return null;
}

export default function IdeationBoardView({ ideas, onOpenDetail, onConvert }: Props) {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;

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
              height: 50,
            }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '4px', background: sc.bg, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: dk.t2, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{sc.label}</span>
              <span style={{
                fontSize: '10px', fontFamily: 'var(--cp-font-mono)', fontWeight: 700,
                background: 'var(--cp-bg-sunken, #F1F5F9)', borderRadius: '100px',
                padding: '0 6px', height: 18, display: 'inline-flex', alignItems: 'center',
                color: dk.t3,
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
                onConvert={onConvert}
                isDark={isDark}
                dk={dk}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function IdeaBoardCard({ idea, columnStatus, onClick, onConvert, isDark, dk }: { idea: Idea; columnStatus: IdeaStatus; onClick: () => void; onConvert?: (key: string) => void; isDark: boolean; dk: typeof DK }) {
  const pc = PRIORITY_CONFIG[idea.priority] || PRIORITY_CONFIG.P4;
  const isAiReady = idea.ai === 'ready';
  const showFullAiStrip = isAiReady && TOP_AI_KEYS.has(idea.key) && AI_INSIGHTS[idea.key];
  const aiInsight = AI_INSIGHTS[idea.key];
  const initLink = getInitiativeLink(idea);

  const isApproved = columnStatus === 'approved';
  const isConverted = columnStatus === 'converted';
  const isDraft = columnStatus === 'draft';
  const isRejected = columnStatus === 'rejected';

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: isDark ? 'transparent' : '#FFFFFF',
        border: `1px solid ${dk.border}`,
        borderRadius: '8px', padding: '12px', marginBottom: '8px', cursor: 'grab',
        opacity: isDraft ? 0.7 : isRejected ? 0.55 : 1,
        transition: 'all 0.15s',
        boxShadow: isDark ? 'none' : undefined,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)';
        if (!isDark) e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = isDark ? 'transparent' : '#FFFFFF';
        if (!isDark) e.currentTarget.style.transform = 'none';
      }}
    >
      {/* AI dot */}
      {isAiReady && !showFullAiStrip && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6',
        }} />
      )}

      {/* Top row: key + priority */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{
          fontFamily: 'var(--cp-font-mono)', fontSize: '11px', fontWeight: 600,
          color: dk.blueKey,
        }}>
          {idea.key}
        </span>
        <span style={{
          fontFamily: 'var(--cp-font-mono)', fontSize: '9px', fontWeight: 800,
          background: isDark ? '#292929' : pc.bg, color: isDark ? dk.t2 : pc.text,
          padding: '1px 5px', borderRadius: '4px',
          border: `1px solid ${isDark ? dk.border : pc.border}`,
        }}>
          {idea.priority}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontSize: '13px', fontWeight: 650,
        color: dk.t1,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        marginBottom: '6px', lineHeight: 1.35,
      }}>
        {idea.title}
      </div>

      {/* Type badge + Ideas Theme */}
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        <span style={{
          background: 'var(--cp-bg-sunken, #F4F4F5)', color: dk.t2,
          padding: '2px 6px', borderRadius: '4px',
          fontSize: '10px', fontWeight: 600,
          border: isDark ? `1px solid ${dk.border}` : 'none',
        }}>
          {idea.type.charAt(0).toUpperCase() + idea.type.slice(1)}
        </span>
        {idea.theme && (
          <span style={{
            background: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF',
            color: isDark ? '#93C5FD' : '#1E40AF',
            padding: '2px 6px', borderRadius: '4px',
            fontSize: '10px', fontWeight: 600, maxWidth: '160px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {idea.theme}
          </span>
        )}
      </div>

      {/* Divider + stats */}
      <div style={{ borderTop: `1px solid ${dk.divider}`, paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: dk.t2, fontFamily: 'var(--cp-font-mono)' }}>
          IMPACT {idea.impact.toFixed(2)}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: 600,
          color: idea.votes > 0 ? '#16A34A' : idea.votes < 0 ? '#EF4444' : dk.t3,
          fontFamily: 'var(--cp-font-mono)',
        }}>
          ▲ {idea.votes}
        </span>
      </div>

      {/* AI insight strip */}
      {showFullAiStrip && (
        <div style={{
          marginTop: '8px', background: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF', borderRadius: '6px',
          padding: '5px 8px', fontSize: '10px', color: 'var(--cp-text-link, #2563EB)', fontWeight: 600,
        }}>
          {aiInsight}
        </div>
      )}

      {/* Request link (converted) */}
      {isConverted && initLink && (
        <div style={{
          marginTop: '8px', background: isDark ? 'rgba(22,163,74,0.12)' : '#1B7F37',
          border: `1px solid ${isDark ? 'rgba(22,163,74,0.25)' : '#B7EBD1'}`,
          borderRadius: '6px', padding: '5px 8px', fontSize: '10px', color: isDark ? '#86EFAC' : '#FFFFFF', fontWeight: 600,
        }}>
          {initLink}
        </div>
      )}

      {/* Convert button (approved) */}
      {isApproved && (
        <button
          onClick={e => { e.stopPropagation(); onConvert?.(idea.key); }}
          style={{
            width: '100%', marginTop: '8px', padding: '6px', background: '#2563EB',
            color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px',
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          → Convert to Request
        </button>
      )}
    </div>
  );
}
