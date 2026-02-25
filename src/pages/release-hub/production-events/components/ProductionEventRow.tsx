import { useState } from 'react';
import { ChevronRight, Pin } from 'lucide-react';
import type { ProductionEvent } from '../hooks/useProductionEvents';
import { formatDeploymentDate } from '../utils/period-helpers';
import { getClassifiedColors, type ClassifiedEventType } from '../utils/event-colors';
import { formatNarrative, generateImpact, cleanSubtitle, getDisplayRelease } from '../utils/narrative-helpers';

interface Props {
  event: ProductionEvent & { eventType: string };
  index: number;
  expanded: boolean;
  onToggle: () => void;
}

const JIRA_BASE = 'https://jira.example.com/browse/';

const EVENT_TYPE_LABELS: Record<string, string> = {
  feature: 'Feature',
  incident: 'Incident',
  improvement: 'Improvement',
  security: 'Security',
};

export function ProductionEventRow({ event, index, expanded, onToggle }: Props) {
  const [hovered, setHovered] = useState(false);
  const colors = getClassifiedColors(event.eventType as ClassifiedEventType);
  const impactLabel = event.eventType === 'incident' ? 'Resolution Impact' : 'Investor Impact';
  const displayRelease = getDisplayRelease(event.release);

  return (
    <>
      <tr
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          cursor: 'pointer',
          background: hovered ? '#EFF6FF' : expanded ? '#FAFBFD' : '#FFFFFF',
          transition: 'background 120ms ease',
          borderBottom: expanded ? 'none' : '1px solid #F1F5F9',
        }}
      >
        {/* # */}
        <td style={{
          width: 48, padding: '14px 16px', paddingLeft: 20, textAlign: 'center',
          fontSize: 13, fontWeight: 500, color: '#64748B',
          fontFamily: "'Inter', sans-serif", verticalAlign: 'top',
          boxShadow: `inset 4px 0 0 ${colors.border}`,
        }}>
          {index + 1}
          {event.stories.length > 3 && (
            <div style={{ marginTop: 4 }}>
              <Pin size={12} color="#B45309" style={{ transform: 'rotate(45deg)' }} />
            </div>
          )}
        </td>

        {/* Event */}
        <td style={{ padding: '14px 16px', maxWidth: 480, verticalAlign: 'top' }}>
          <div className="flex items-start gap-2">
            <ChevronRight
              size={14}
              color="#94A3B8"
              style={{
                transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
                transition: 'transform 150ms ease',
                flexShrink: 0, marginTop: 3,
                opacity: expanded ? 1 : 0,
              }}
            />
            <div style={{ minWidth: 0 }} dir="auto">
              {/* Fix 8: font-weight 600 not 700 */}
              <div style={{
                fontSize: 14, fontWeight: 600, color: '#0F172A',
                fontFamily: "'Inter', sans-serif", lineHeight: 1.35,
              }}>
                {event.title}
              </div>
              {/* Fix 9: subtitle color #64748B */}
              {event.subtitle && (
                <div style={{
                  fontSize: 12.5, fontWeight: 400, color: '#64748B', marginTop: 2,
                  lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {cleanSubtitle(event.subtitle)}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Type pill */}
        <td style={{ width: 140, padding: '14px 16px', verticalAlign: 'top' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', fontSize: 11.5, fontWeight: 700,
            borderRadius: 4, background: colors.pillBg, color: colors.pillText,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: colors.dot, flexShrink: 0,
            }} />
            {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
          </span>
        </td>

        {/* Release — Fix 28: clean version display */}
        <td style={{ width: 140, padding: '14px 16px', verticalAlign: 'top' }}>
          {displayRelease ? (
            <span style={{
              display: 'inline-block',
              padding: '3px 10px', fontSize: 12, fontWeight: 600,
              borderRadius: 4, border: '1px solid #E2E8F0',
              color: '#1E293B', background: '#F8FAFC',
              fontFamily: "'Inter', sans-serif",
            }}>
              {displayRelease}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: '#64748B' }}>—</span>
          )}
        </td>

        {/* Deployed */}
        <td style={{
          width: 170, padding: '14px 16px', verticalAlign: 'top',
          fontSize: 13, fontWeight: 400, color: '#475569',
        }}>
          {formatDeploymentDate(event.deployedAt)}
        </td>

        {/* Stories */}
        <td style={{
          width: 100, padding: '14px 16px', textAlign: 'center', verticalAlign: 'top',
          fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap',
        }}>
          {event.stories.length} {event.stories.length === 1 ? 'story' : 'stories'}
        </td>
      </tr>

      {/* Expanded Detail Panel */}
      {expanded && (
        <tr>
          <td colSpan={6} style={{
            padding: 0,
            borderBottom: '2px solid #E2E8F0', /* Fix 37: stronger bottom border */
          }}>
            <div style={{
              padding: '28px 32px 28px 68px',
              background: '#FAFBFD',
              boxShadow: `inset 4px 0 0 ${colors.border}`,
            }}>
              {/* Fix 5-7: Georgia serif 20px title */}
              <h2 dir="auto" style={{
                fontSize: 20, fontWeight: 700, color: '#020617',
                fontFamily: "Georgia, 'Times New Roman', serif",
                margin: '0 0 20px', lineHeight: 1.3, letterSpacing: '-0.01em',
              }}>
                {event.title}
              </h2>

              {/* WHAT CHANGED — Fix 10: section label */}
              <div style={{ marginBottom: 22 }}>
                <h3 style={{
                  fontSize: 11.5, fontWeight: 700, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  margin: '0 0 8px', fontFamily: "'Inter', sans-serif",
                }}>
                  What Changed
                </h3>
                {/* Fix 5: Georgia 15px narrative */}
                <p dir="auto" style={{
                  fontSize: 15, color: '#1E293B', lineHeight: 1.72,
                  fontFamily: "Georgia, 'Times New Roman', serif", margin: 0,
                }}>
                  {formatNarrative(event)}
                </p>
              </div>

              {/* IMPACT BLOCK — Fix 16: tinted bg + asymmetric radius */}
              <div style={{
                borderLeft: `4px solid ${colors.border}`,
                background: colors.impactBg,
                padding: '16px 20px',
                borderRadius: '2px 8px 8px 2px',
                marginBottom: 22,
              }}>
                {/* Fix 11: impact label color = type-specific */}
                <h4 style={{
                  fontSize: 11.5, fontWeight: 800, color: colors.impactLabel,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  margin: '0 0 8px', fontFamily: "'Inter', sans-serif",
                }}>
                  {impactLabel}
                </h4>
                {/* Fix 7: Georgia 14.5px impact */}
                <p dir="auto" style={{
                  fontSize: 14.5, color: '#0F172A', lineHeight: 1.65,
                  fontFamily: "Georgia, 'Times New Roman', serif", margin: 0,
                }}>
                  {generateImpact(event)}
                </p>
              </div>

              {/* CONSOLIDATED TICKETS — Fix 12: tabular nums */}
              <div style={{ marginBottom: 22 }}>
                <h3 style={{
                  fontSize: 11.5, fontWeight: 700, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  margin: '0 0 8px', fontFamily: "'Inter', sans-serif",
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
                          color: colors.ticketColor, textDecoration: 'none',
                          minWidth: 100, display: 'inline-block',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {story.issue_key}
                      </a>
                      <span dir="auto" style={{ color: '#334155', fontFamily: "'Inter', sans-serif" }}>
                        {story.summary}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* METADATA BAR — Fix 24: stacked labels */}
              <div style={{
                display: 'flex', background: '#F8FAFC',
                border: '1px solid #F1F5F9', borderRadius: 6,
                overflow: 'hidden', marginTop: 24,
              }}>
                {[
                  { label: 'Epic', value: event.parentKey ? `${event.parentSummary} (${event.parentKey})` : '—' },
                  { label: 'Release', value: displayRelease || '—', isLink: !!displayRelease },
                  { label: 'Change', value: '—' },
                  { label: 'Status', value: 'In Production' },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    style={{
                      padding: '10px 16px',
                      borderRight: i < 3 ? '1px solid #F1F5F9' : 'none',
                      flex: 1, minWidth: 140,
                    }}
                  >
                    <strong style={{
                      display: 'block', fontWeight: 700, color: '#0F172A',
                      fontSize: 12, marginBottom: 1,
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {item.label}
                    </strong>
                    <div style={{
                      fontSize: 12.5, fontWeight: 500,
                      color: item.isLink ? '#2563EB' : '#1E293B',
                      fontFamily: "'Inter', sans-serif", lineHeight: 1.4,
                    }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Fix 34: Regenerate button */}
              <button
                onClick={e => e.stopPropagation()}
                style={{
                  marginTop: 16, fontSize: 11.5, fontWeight: 500,
                  color: '#94A3B8', background: 'transparent',
                  border: '1px solid transparent', borderRadius: 6,
                  padding: '4px 12px', cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => {
                  const btn = e.target as HTMLButtonElement;
                  btn.style.background = '#F8FAFC';
                  btn.style.color = '#475569';
                  btn.style.borderColor = '#E2E8F0';
                }}
                onMouseLeave={e => {
                  const btn = e.target as HTMLButtonElement;
                  btn.style.background = 'transparent';
                  btn.style.color = '#94A3B8';
                  btn.style.borderColor = 'transparent';
                }}
              >
                ↻ Regenerate Narrative
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
