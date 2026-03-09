import React from 'react';
import { MILESTONE_CONFIGS } from '@/types/ideasRoadmap';
import type { RoadmapIdea } from '@/types/ideasRoadmap';

interface RoadmapDatesTableProps {
  ideas: RoadmapIdea[];
  onSelectIdea: (idea: RoadmapIdea) => void;
  onToggleCommitted: (idea: RoadmapIdea) => void;
  mutatingIds: Set<string>;
}

const headerStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: "'Inter', sans-serif",
  textTransform: 'uppercase', letterSpacing: '0.04em',
  background: '#F8FAFC', height: 36, padding: '0 10px',
  borderBottom: '2px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 2,
  textAlign: 'left', whiteSpace: 'nowrap',
};

const cellStyle: React.CSSProperties = {
  height: 36, padding: '0 10px', borderBottom: '1px solid #F1F5F9',
  verticalAlign: 'middle', whiteSpace: 'nowrap',
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

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
            return (
              <tr
                key={idea.id}
                onClick={() => onSelectIdea(idea)}
                style={{
                  cursor: 'pointer', transition: 'background 100ms, opacity 150ms',
                  opacity: isMutating ? 0.6 : 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={cellStyle}>
                  <span style={{
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                    color: '#94A3B8', textTransform: 'uppercase',
                  }}>
                    {idea.ideaKey}
                  </span>
                </td>
                <td style={{ ...cellStyle, fontSize: 13, fontWeight: 650, color: '#0F172A' }}>
                  <div style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300,
                  }}>
                    {idea.title}
                  </div>
                </td>
                <td style={cellStyle}>
                  {idea.team ? (
                    <span style={{
                      fontSize: 10, fontWeight: 600, background: '#F1F5F9',
                      color: '#475569', padding: '2px 6px', borderRadius: 4,
                    }}>
                      {idea.team}
                    </span>
                  ) : (
                    <span style={{ color: '#CBD5E1' }}>—</span>
                  )}
                </td>
                <td style={cellStyle}>
                  {idea.quarter ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700, background: '#F0FDFA',
                      color: '#0D9488', padding: '2px 8px', borderRadius: 100,
                    }}>
                      {idea.quarter}
                    </span>
                  ) : (
                    <span style={{ color: '#CBD5E1' }}>—</span>
                  )}
                </td>
                {MILESTONE_CONFIGS.map(m => (
                  <td key={m.key} style={cellStyle}>
                    <span style={{
                      fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                      color: idea.milestones[m.key] ? '#334155' : '#CBD5E1',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {formatDate(idea.milestones[m.key])}
                    </span>
                  </td>
                ))}
                <td style={cellStyle}>
                  <button
                    onClick={e => { e.stopPropagation(); onToggleCommitted(idea); }}
                    disabled={isMutating}
                    style={{
                      width: 32, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer',
                      background: idea.isCommitted ? '#0D9488' : '#CBD5E1',
                      position: 'relative',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 3, width: 12, height: 12, borderRadius: 6,
                      background: '#FFFFFF',
                      left: idea.isCommitted ? 17 : 3,
                    }} />
                  </button>
                </td>
                <td style={cellStyle}>
                  {idea.isCommitted && (
                    <button
                      onClick={e => { e.stopPropagation(); onSelectIdea(idea); }}
                      style={{
                        height: 22, padding: '0 6px', borderRadius: 4,
                        border: '1px solid #E2E8F0', background: '#FFFFFF',
                        color: '#64748B', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      → Init
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
