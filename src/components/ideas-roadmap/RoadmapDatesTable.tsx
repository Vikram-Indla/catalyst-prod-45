import React from 'react';
import { MILESTONE_CONFIGS } from '@/types/ideasRoadmap';
import type { RoadmapIdea } from '@/types/ideasRoadmap';

interface RoadmapDatesTableProps {
  ideas: RoadmapIdea[];
  onSelectIdea: (idea: RoadmapIdea) => void;
  onToggleCommitted: (idea: RoadmapIdea) => void;
  mutatingIds: Set<string>;
}

const QUARTER_STYLES: Record<string, { bg: string; color: string }> = {
  Q1: { bg: '#F3E8FF', color: '#6D28D9' },
  Q2: { bg: 'rgba(59,130,246,0.06)', color: '#1D4ED8' },
  Q3: { bg: 'rgba(74,222,128,0.06)', color: '#4ADE80' },
  Q4: { bg: '#FFF7ED', color: '#FBBF24' },
};

const headerStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'rgba(237,237,237,0.40)', fontFamily: "'Inter', sans-serif",
  textTransform: 'uppercase', letterSpacing: '0.07em',
  background: 'var(--bg-1, #1A1A1A)', height: 50, padding: '8px 12px',
  borderBottom: '2px solid var(--bd-default, rgba(255,255,255,0.10))', position: 'sticky', top: 0, zIndex: 2,
  textAlign: 'left', whiteSpace: 'nowrap',
};

const cellStyle: React.CSSProperties = {
  height: 50, padding: '8px 12px', borderBottom: '1px solid #1A1A1A',
  verticalAlign: 'middle', whiteSpace: 'nowrap',
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

const isConverted = (status: string) => status.toLowerCase() === 'converted';

export function RoadmapDatesTable({ ideas, onSelectIdea, onToggleCommitted, mutatingIds }: RoadmapDatesTableProps) {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
        <thead>
          <tr>
            <th style={{ ...headerStyle, width: 100 }}>IDEA</th>
            <th style={{ ...headerStyle, minWidth: 200 }}>TITLE</th>
            <th style={{ ...headerStyle, width: 120 }}>TEAM</th>
            <th style={{ ...headerStyle, width: 80 }}>QTR</th>
            {MILESTONE_CONFIGS.map(m => (
              <th key={m.key} style={{ ...headerStyle, width: 90 }}>{m.label}</th>
            ))}
            <th style={{ ...headerStyle, width: 80 }}>STATUS</th>
            <th style={{ ...headerStyle, width: 60 }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {ideas.map(idea => {
            const isMutating = mutatingIds.has(idea.id);
            const qStyle = idea.quarter ? QUARTER_STYLES[idea.quarter] : null;
            return (
              <tr
                key={idea.id}
                onClick={() => onSelectIdea(idea)}
                style={{
                  cursor: 'pointer', transition: 'background 100ms, opacity 150ms',
                  opacity: isMutating ? 0.6 : 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1, #1A1A1A)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={cellStyle}>
                  <span style={{
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                    color: 'var(--fg-4)', textTransform: 'uppercase',
                  }}>{idea.ideaKey}</span>
                </td>
                <td style={{ ...cellStyle, fontSize: 13, fontWeight: 650, color: 'var(--fg-1)' }}>
                  <div
                    title={idea.title.length > 50 ? idea.title : undefined}
                    style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300,
                    }}
                  >{idea.title}</div>
                </td>
                <td style={cellStyle}>
                  {idea.team ? (
                    <span style={{
                      fontSize: 10, fontWeight: 600, background: '#1A1A1A',
                      color: 'var(--fg-2)', padding: '2px 6px', borderRadius: 4,
                    }}>{idea.team}</span>
                  ) : <span style={{ color: 'rgba(237,237,237,0.53)' }}>—</span>}
                </td>
                <td style={cellStyle}>
                  {qStyle ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700, height: 20, display: 'inline-flex',
                      alignItems: 'center', padding: '0 8px', borderRadius: 4,
                      background: qStyle.bg, color: qStyle.color,
                      fontFamily: "'Inter', sans-serif", textTransform: 'uppercase',
                    }}>{idea.quarter}</span>
                  ) : <span style={{ color: 'rgba(237,237,237,0.53)' }}>—</span>}
                </td>
                {MILESTONE_CONFIGS.map(m => (
                  <td key={m.key} style={cellStyle}>
                    <span style={{
                      fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                      color: idea.milestones[m.key] ? 'var(--fg-2)' : 'rgba(237,237,237,0.53)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>{formatDate(idea.milestones[m.key])}</span>
                  </td>
                ))}
                <td style={cellStyle}>
                  <button
                    onClick={e => { e.stopPropagation(); onToggleCommitted(idea); }}
                    disabled={isMutating}
                    style={{
                      width: 32, height: 18, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: idea.isCommitted ? 'var(--sem-success)' : 'rgba(237,237,237,0.53)', position: 'relative',
                      transition: 'background 150ms',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 3, width: 12, height: 12, borderRadius: 6,
                      background: 'var(--bg-app)', left: idea.isCommitted ? 17 : 3, transition: 'left 150ms',
                    }} />
                  </button>
                </td>
                <td style={cellStyle}>
                  {isConverted(idea.status) ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700, background: '#1B7F37', color: 'var(--bg-app)',
                      border: '1px solid #B7EBD1', padding: '2px 6px', borderRadius: 4,
                    }}>✓</span>
                  ) : idea.isCommitted ? (
                    <button
                      onClick={e => { e.stopPropagation(); onSelectIdea(idea); }}
                      style={{
                        height: 22, padding: '0 6px', borderRadius: 4,
                        border: '1px solid var(--divider)', background: 'var(--bg-app)',
                        color: 'var(--fg-3)', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 150ms',
                      }}
                    >→ Init</button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
