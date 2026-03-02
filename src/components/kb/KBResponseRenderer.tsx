import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import type { KBQueryResponse } from '@/services/knowledgeBase';

interface KBResponseRendererProps {
  response: KBQueryResponse;
  language: 'en';
  onFeedback?: (helpful: boolean) => void;
  feedbackGiven?: boolean;
}

/* ── helpers ── */
const ISSUE_HEADERS = ['issues & risks', 'issues', 'risks', 'blockers'];

const F = {
  inter: "'Inter', -apple-system, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

/* ── V12 Status Lozenge Detection ── */
const STATUS_PATTERNS: Record<string, { bg: string; color: string }> = {
  'done': { bg: '#E3FCEF', color: '#006644' },
  'to do': { bg: '#E3FCEF', color: '#006644' },
  'todo': { bg: '#E3FCEF', color: '#006644' },
  'available': { bg: '#E3FCEF', color: '#006644' },
  'open': { bg: '#E3FCEF', color: '#006644' },
  'ready': { bg: '#E3FCEF', color: '#006644' },
  'fixed': { bg: '#E3FCEF', color: '#006644' },
  'in progress': { bg: '#DEEBFF', color: '#0747A6' },
  're-open': { bg: '#DEEBFF', color: '#0747A6' },
  'reopen': { bg: '#DEEBFF', color: '#0747A6' },
  're-opened': { bg: '#DEEBFF', color: '#0747A6' },
  'blocked': { bg: '#DEEBFF', color: '#0747A6' },
  'under review': { bg: '#DEEBFF', color: '#0747A6' },
  'in review': { bg: '#DEEBFF', color: '#0747A6' },
  'analysis': { bg: '#DEEBFF', color: '#0747A6' },
  'deferred': { bg: '#DFE1E6', color: '#253858' },
  'closed': { bg: '#DFE1E6', color: '#253858' },
  'resolved': { bg: '#DFE1E6', color: '#253858' },
  'at capacity': { bg: '#DFE1E6', color: '#253858' },
  'critical': { bg: '#DFE1E6', color: '#253858' },
  'high': { bg: '#DFE1E6', color: '#253858' },
  'medium': { bg: '#DFE1E6', color: '#253858' },
  'low': { bg: '#DFE1E6', color: '#253858' },
  'backlog': { bg: '#DFE1E6', color: '#253858' },
};

function isStatusText(text: string): { bg: string; color: string } | null {
  const clean = text.replace(/^\*+|\*+$/g, '').trim().toLowerCase();
  return STATUS_PATTERNS[clean] || null;
}

/* ── Issue Key Detection (e.g. BAU-5054, SIMP-3245) ── */
const ISSUE_KEY_RE = /^`?([A-Z]{2,10}-\d{1,6})`?$/;

function isIssueKey(text: string): string | null {
  const match = text.trim().match(ISSUE_KEY_RE);
  return match ? match[1] : null;
}

/* ── Ageing Detection (e.g. 4h, 2d, 15h, <1h) ── */
const AGE_RE = /^[⏱\s]*<?(\d+\.?\d*)\s*(h|d|m|hr|hrs|day|days)>?$/i;

function isAgeing(text: string): { value: string; color: string } | null {
  const clean = text.replace(/[⏱\s]/g, '').trim();
  const match = clean.match(AGE_RE);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  let color = '#16A34A'; // green ≤12h
  if (unit.startsWith('d')) {
    color = num > 3 ? '#DC2626' : '#D97706';
  } else if ((unit === 'h' || unit === 'hr' || unit === 'hrs') && num > 12) {
    color = '#D97706';
  }
  return { value: clean, color };
}

function isHeader(line: string) {
  return /^\*\*[A-Za-z &/]+\*\*$/.test(line.trim());
}
function headerLabel(line: string) {
  return line.replace(/\*\*/g, '').trim();
}
function isDangerHeader(label: string) {
  return ISSUE_HEADERS.some((h) => label.toLowerCase().includes(h));
}

function renderInline(text: string): React.ReactNode[] {
  const COMBINED = /`([A-Z]+-\d+)`|\*\*([^*]+)\*\*|\[SOURCE-(\d+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = COMBINED.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(
        <code key={key++} style={{
          fontFamily: F.mono,
          color: '#2563EB', background: '#EFF6FF', border: '1px solid #DBEAFE',
          borderRadius: 4, padding: '1px 6px', fontSize: 12, fontWeight: 600,
        }}>{match[1]}</code>
      );
    } else if (match[2]) {
      parts.push(<strong key={key++} style={{ color: '#1D4ED8', fontWeight: 700, fontFamily: 'system-ui' }}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(
        <sup key={key++} style={{
          fontSize: 10, color: '#2563EB', fontWeight: 700, cursor: 'pointer',
          verticalAlign: 'super',
        }} title={`Source ${match[3]}`}>[{match[3]}]</sup>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  return parts;
}

/* ── Smart Cell Renderer: detects status, keys, ageing ── */
function renderSmartCell(cellText: string, colIndex: number): React.ReactNode {
  const trimmed = cellText.trim();

  // Check for issue key
  const key = isIssueKey(trimmed);
  if (key) {
    return (
      <span style={{
        fontSize: 12, fontWeight: 500, color: '#2563EB', fontFamily: F.mono,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}>{key}</span>
    );
  }

  // Check for status lozenge
  const status = isStatusText(trimmed);
  if (status) {
    const label = trimmed.replace(/^\*+|\*+$/g, '').trim();
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', height: 20,
        padding: '0 6px', borderRadius: 3,
        background: status.bg, color: status.color,
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.03em', fontFamily: F.inter,
        lineHeight: '20px', whiteSpace: 'nowrap',
      }}>{label.toUpperCase()}</span>
    );
  }

  // Check for ageing value
  const age = isAgeing(trimmed);
  if (age) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: age.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontFamily: F.mono, color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>{age.value}</span>
      </span>
    );
  }

  // Default: render with inline formatting
  return <>{renderInline(trimmed)}</>;
}

export const KBResponseRenderer: React.FC<KBResponseRendererProps> = ({
  response, language, onFeedback, feedbackGiven,
}) => {
  const dir = 'ltr';
  const lines = (response.answer || '').split('\n');
  const _sourcesAvailable = response.references && response.references.length > 0; // kept for internal use
  const [feedbackState, setFeedbackState] = useState<'none' | 'up' | 'down'>('none');
  const [showThanks, setShowThanks] = useState(false);

  const isLiveData = response.category === 'live_data' || response._meta?.source === 'live_query';

  const elements: React.ReactNode[] = [];
  let idx = 0;
  let lastHeaderDanger = false;

  // Detect table rows (pipe-delimited)
  const isTableRow = (l: string) => l.trim().startsWith('|') && l.trim().endsWith('|');

  // Group consecutive table rows
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) { i++; continue; }

    // Table block — enhanced with V12 styling for live data
    if (isTableRow(trimmed)) {
      const tableRows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        const cells = lines[i].trim().split('|').filter(Boolean).map(c => c.trim());
        tableRows.push(cells);
        i++;
      }

      if (isLiveData && tableRows.length > 0) {
        // V12 styled table for live data
        elements.push(
          <div key={idx} style={{
            border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6,
            overflow: 'hidden', margin: '8px 0',
          }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed',
            }}>
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr
                    key={ri}
                    style={{
                      height: 36,
                      borderBottom: ri < tableRows.length - 1 ? '0.75px solid rgba(15,23,42,0.06)' : 'none',
                      background: ri === 0 ? '#F1F5F9' : 'transparent',
                      transition: 'background 80ms',
                    }}
                    onMouseEnter={ri > 0 ? (e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,23,42,0.04)'; } : undefined}
                    onMouseLeave={ri > 0 ? (e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; } : undefined}
                  >
                    {row.map((cell, ci) => {
                      if (ri === 0) {
                        return (
                          <th key={ci} style={{
                            padding: '10px 12px', fontSize: 11, fontWeight: 650,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            color: '#64748B', fontFamily: F.inter, textAlign: 'left',
                            whiteSpace: 'nowrap',
                            borderBottom: '1.5px solid rgba(15,23,42,0.12)',
                          }}>{cell}</th>
                        );
                      }
                      return (
                        <td key={ci} style={{
                          padding: '8px 12px', fontSize: 13, color: '#0F172A',
                          fontFamily: F.inter, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          verticalAlign: 'middle',
                        }}>
                          {renderSmartCell(cell, ci)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      } else {
        // Standard table for non-live data
        elements.push(
          <div key={idx} style={{ overflowX: 'auto', margin: '8px 0' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse', fontSize: 12.5,
              fontFamily: F.inter,
            }}>
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr key={ri} style={{
                    borderBottom: '1px solid #F4F4F5',
                    background: ri % 2 === 0 ? '#FAFAFA' : '#FFFFFF',
                  }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: '6px 10px', verticalAlign: 'top',
                        whiteSpace: ci === 0 ? 'nowrap' : 'normal',
                        color: ci === 0 ? '#2563EB' : '#374151',
                        fontFamily: ci === 0 ? F.mono : 'inherit',
                        fontWeight: ci === 0 ? 600 : 400,
                        fontSize: ci === 0 ? 11.5 : 12.5,
                        lineHeight: 1.6,
                      }}>{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      idx++;
      continue;
    }

    if (isHeader(trimmed)) {
      const label = headerLabel(trimmed);
      const danger = isDangerHeader(label);
      lastHeaderDanger = danger;
      elements.push(
        <div key={idx} style={{ marginTop: 20, marginBottom: 6 }}>
          <div style={{ width: 24, height: 2, background: danger ? '#DC2626' : '#2563EB', borderRadius: 1, marginBottom: 8 }} />
          <h4 style={{
            fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px',
            color: danger ? '#DC2626' : '#2563EB', margin: 0,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}>{label}</h4>
        </div>
      );
      i++; idx++; continue;
    }

    // Horizontal rule
    if (trimmed === '---') { i++; continue; }

    // Subheading (#### TITLE)
    if (trimmed.startsWith('####')) {
      const label = trimmed.replace(/^#{1,4}\s*/, '').trim();
      elements.push(
        <div key={idx} style={{ marginTop: 16, marginBottom: 6 }}>
          <div style={{ width: 24, height: 2, background: '#2563EB', borderRadius: 1, marginBottom: 8 }} />
          <h4 style={{
            fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px',
            color: '#2563EB', margin: 0, fontFamily: "system-ui, -apple-system, sans-serif",
          }}>{label}</h4>
        </div>
      );
      i++; idx++; continue;
    }

    if (trimmed.startsWith('- ')) {
      const content = trimmed.slice(2);
      elements.push(
        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4, fontSize: 13.5, lineHeight: 1.7 }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: lastHeaderDanger ? '#DC2626' : '#2563EB', flexShrink: 0, marginTop: 9 }} />
          <span style={{ color: '#374151' }}>{renderInline(content)}</span>
        </div>
      );
      i++; idx++; continue;
    }

    elements.push(
      <p key={idx} style={{
        fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14.5, lineHeight: 1.8,
        color: '#1F2937', margin: '6px 0', letterSpacing: '0.01em',
      }}>{renderInline(trimmed)}</p>
    );
    i++; idx++;
  }

  // Confidence
  const confidence = (response as any).confidence_level || (
    response.confidence >= 0.8 ? 'high' : response.confidence >= 0.5 ? 'medium' : 'low'
  );
  const confConfig = {
    high: { color: '#0D7331', label: 'High confidence' },
    medium: { color: '#D97706', label: 'Medium confidence' },
    low: { color: '#DC2626', label: 'Low confidence — verify with sources' },
    insufficient: { color: '#DC2626', label: 'Insufficient data' },
  }[confidence] || { color: '#71717A', label: '' };

  const handleFeedbackClick = (helpful: boolean) => {
    setFeedbackState(helpful ? 'up' : 'down');
    setShowThanks(true);
    onFeedback?.(helpful);
    setTimeout(() => setShowThanks(false), 2000);
  };

  return (
    <div dir={dir}>
      {/* Title */}
      {response.title && (
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#09090B', margin: '0 0 6px', fontFamily: "system-ui, sans-serif" }}>
          {response.title}
        </h3>
      )}

      {/* Category badge */}
      {response.category && (
        <span style={{
          display: 'inline-block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.5px', color: '#2563EB', background: '#EFF6FF', border: '1px solid #DBEAFE',
          borderRadius: 4, padding: '2px 8px', marginBottom: 10,
        }}>{response.category}</span>
      )}

      {/* Body */}
      <div>{elements}</div>

      {/* Confidence indicator */}
      {confConfig.label && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: confConfig.color }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: confConfig.color }}>{confConfig.label}</span>
        </div>
      )}

      {/* Sources kept in background — not shown to users */}

      {/* Feedback */}
      {!feedbackGiven && feedbackState === 'none' && onFeedback && (
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          <button
            onClick={() => handleFeedbackClick(true)}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none', background: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 200ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F0FDF4'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            <ThumbsUp size={14} color="#A1A1AA" />
          </button>
          <button
            onClick={() => handleFeedbackClick(false)}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none', background: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 200ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            <ThumbsDown size={14} color="#A1A1AA" />
          </button>
        </div>
      )}
      {(feedbackGiven || feedbackState !== 'none') && (
        <div style={{ fontSize: 10, color: '#71717A', marginTop: 8, transition: 'opacity 200ms' }}>
          {showThanks ? (
            <span style={{ animation: 'kb-feedback-bounce 200ms ease' }}>Thanks for the feedback</span>
          ) : '✓ Feedback recorded'}
        </div>
      )}

      {/* Meta (hover-visible via parent CSS) */}
      <div className="kb-response-meta" style={{
        marginTop: 8, fontSize: 10, color: '#D4D4D8', opacity: 0, transition: 'opacity 200ms',
      }}>
        ⚡ {response._meta.response_time_ms}ms · {response._meta.source}
        {response._meta.similarity != null && ` · ${(response._meta.similarity * 100).toFixed(0)}% match`}
      </div>

      <style>{`
        @keyframes kb-feedback-bounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default KBResponseRenderer;
