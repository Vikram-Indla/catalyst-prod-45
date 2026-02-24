import { useState } from 'react';
import { ChevronRight, Pin } from 'lucide-react';
import type { ProductionEvent } from '../hooks/useProductionEvents';
import { formatDeploymentDate } from '../utils/period-helpers';
import { getIssueTypeColor } from '../utils/event-colors';

interface Props {
  event: ProductionEvent;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}

const JIRA_BASE = 'https://jira.example.com/browse/';

export function ProductionEventRow({ event, index, expanded, onToggle }: Props) {
  const [hovered, setHovered] = useState(false);
  const typeColor = getIssueTypeColor(event.issueType);

  return (
    <>
      {/* Summary Row */}
      <tr
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          cursor: 'pointer',
          background: hovered ? '#EFF6FF' : expanded ? '#FAFBFD' : '#FFFFFF',
          transition: 'background 120ms ease',
          borderLeft: `3px solid ${typeColor}`,
          borderBottom: expanded ? 'none' : '1px solid #F1F5F9',
        }}
      >
        {/* # */}
        <td style={{
          width: 48, padding: '12px 14px', textAlign: 'center',
          fontSize: 13, fontWeight: 500, color: '#64748B',
          fontFamily: "'Inter', sans-serif", verticalAlign: 'top',
        }}>
          {index + 1}
          {event.stories.length > 3 && (
            <div style={{ marginTop: 4 }}>
              <Pin size={12} color="#B45309" style={{ transform: 'rotate(45deg)' }} />
            </div>
          )}
        </td>

        {/* Event — title + subtitle */}
        <td style={{ padding: '12px 14px', maxWidth: 380, verticalAlign: 'top' }}>
          <div className="flex items-start gap-2">
            <ChevronRight
              size={14}
              color="#94A3B8"
              style={{
                transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
                transition: 'transform 150ms ease',
                flexShrink: 0,
                marginTop: 3,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: '#0F172A',
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.35,
              }}>
                {event.title}
              </div>
              {event.subtitle && (
                <div style={{
                  fontSize: 12.5, color: '#64748B', marginTop: 3,
                  lineHeight: 1.4,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {event.subtitle}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Type pill */}
        <td style={{ width: 130, padding: '12px 14px', verticalAlign: 'top' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', fontSize: 12, fontWeight: 600,
            borderRadius: 14,
            background: `${typeColor}14`, color: typeColor,
            border: `1px solid ${typeColor}30`,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: typeColor, flexShrink: 0,
            }} />
            {event.issueType}
          </span>
        </td>

        {/* Release */}
        <td style={{ width: 130, padding: '12px 14px', verticalAlign: 'top' }}>
          {event.release ? (
            <span style={{
              display: 'inline-block',
              padding: '3px 10px', fontSize: 12, fontWeight: 600,
              borderRadius: 5, border: '1px solid #E2E8F0',
              color: '#334155', background: '#F8FAFC',
              fontFamily: "'Inter', sans-serif",
            }}>
              {event.release}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: '#94A3B8' }}>—</span>
          )}
        </td>

        {/* Deployed */}
        <td style={{
          width: 160, padding: '12px 14px', verticalAlign: 'top',
          fontSize: 13, fontWeight: 400, color: '#475569',
        }}>
          {formatDeploymentDate(event.deployedAt)}
        </td>

        {/* Stories count */}
        <td style={{
          width: 80, padding: '12px 14px', textAlign: 'center', verticalAlign: 'top',
          fontSize: 13, fontWeight: 600, color: '#334155',
        }}>
          {event.stories.length} {event.stories.length === 1 ? 'story' : 'stories'}
        </td>
      </tr>

      {/* Expanded Detail Panel */}
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0, borderLeft: `3px solid ${typeColor}`, borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ padding: '32px 48px 32px 64px', background: '#FFFFFF' }}>

              {/* Title */}
              <h2 style={{
                fontSize: 22, fontWeight: 800, color: '#0F172A',
                fontFamily: "'Georgia', serif", margin: '0 0 24px',
                lineHeight: 1.3,
              }}>
                {event.title}
              </h2>

              {/* WHAT CHANGED */}
              <div style={{ marginBottom: 28 }}>
                <h3 style={{
                  fontSize: 11, fontWeight: 700, color: '#0F172A',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  margin: '0 0 10px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  What Changed
                </h3>
                <p style={{
                  fontSize: 15, color: '#334155', lineHeight: 1.7,
                  fontFamily: "'Georgia', serif", margin: 0,
                }}>
                  {event.stories.map(s => s.summary).join('. ')}.
                </p>
              </div>

              {/* IMPACT BLOCK */}
              <div style={{
                borderLeft: `3px solid ${typeColor}`,
                background: '#F8FAFC',
                padding: '16px 20px',
                borderRadius: '0 8px 8px 0',
                marginBottom: 28,
              }}>
                <h4 style={{
                  fontSize: 11, fontWeight: 700, color: typeColor,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  margin: '0 0 8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Business Impact
                </h4>
                <p style={{
                  fontSize: 14, color: '#334155', lineHeight: 1.65,
                  fontFamily: "'Georgia', serif", margin: 0,
                }}>
                  {event.stories.length} ticket{event.stories.length > 1 ? 's' : ''} deployed to production
                  covering {event.issueType.toLowerCase()} work
                  {event.parentKey ? ` under ${event.parentKey}` : ''}.
                </p>
              </div>

              {/* CONSOLIDATED TICKETS */}
              <div style={{ marginBottom: 28 }}>
                <h3 style={{
                  fontSize: 11, fontWeight: 700, color: '#0F172A',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  margin: '0 0 12px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Consolidated Tickets
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {event.stories.map(story => (
                    <div key={story.issue_key} className="flex items-center gap-4" style={{ fontSize: 14 }}>
                      <a
                        href={`${JIRA_BASE}${story.issue_key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 13, fontWeight: 700,
                          color: typeColor, textDecoration: 'none',
                          minWidth: 120,
                        }}
                      >
                        {story.issue_key}
                      </a>
                      <span style={{ color: '#334155', fontFamily: "'Inter', sans-serif" }}>
                        {story.summary}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer metadata */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                border: '1px solid #E2E8F0', borderRadius: 8,
                overflow: 'hidden',
              }}>
                {[
                  { label: 'Epic', value: event.parentKey ? `${event.parentSummary} (${event.parentKey})` : '—' },
                  { label: 'Release', value: event.release || '—', isLink: !!event.release },
                  { label: 'Project', value: event.stories[0]?.project_name || event.stories[0]?.project_key || '—' },
                  { label: 'Status', value: 'In Production' },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    style={{
                      padding: '14px 16px',
                      borderRight: i < 3 ? '1px solid #E2E8F0' : 'none',
                      background: '#FAFBFD',
                    }}
                  >
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: '#64748B',
                      fontFamily: "'Inter', sans-serif",
                      marginBottom: 4,
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 500,
                      color: item.isLink ? '#2563EB' : '#0F172A',
                      fontFamily: "'Inter', sans-serif",
                      lineHeight: 1.4,
                    }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
