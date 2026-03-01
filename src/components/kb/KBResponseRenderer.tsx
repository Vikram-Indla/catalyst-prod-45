import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronRight } from 'lucide-react';
import type { KBQueryResponse } from '@/services/knowledgeBase';

interface KBResponseRendererProps {
  response: KBQueryResponse;
  language: 'en';
  onFeedback?: (helpful: boolean) => void;
  feedbackGiven?: boolean;
}

/* ── helpers ── */
const ISSUE_HEADERS = ['issues & risks', 'issues', 'risks', 'blockers'];
const SOURCE_RE = /\[SOURCE-(\d+)\]/g;

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
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
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

export const KBResponseRenderer: React.FC<KBResponseRendererProps> = ({
  response, language, onFeedback, feedbackGiven,
}) => {
  const dir = 'ltr';
  const lines = (response.answer || '').split('\n');
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [feedbackState, setFeedbackState] = useState<'none' | 'up' | 'down'>('none');
  const [showThanks, setShowThanks] = useState(false);

  const elements: React.ReactNode[] = [];
  let idx = 0;
  let lastHeaderDanger = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { idx++; continue; }

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
      idx++; continue;
    }

    if (trimmed.startsWith('- ')) {
      const content = trimmed.slice(2);
      elements.push(
        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4, fontSize: 13.5, lineHeight: 1.7 }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: lastHeaderDanger ? '#DC2626' : '#2563EB', flexShrink: 0, marginTop: 9 }} />
          <span style={{ color: '#374151' }}>{renderInline(content)}</span>
        </div>
      );
      idx++; continue;
    }

    elements.push(
      <p key={idx} style={{
        fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14.5, lineHeight: 1.8,
        color: '#1F2937', margin: '6px 0', letterSpacing: '0.01em',
      }}>{renderInline(trimmed)}</p>
    );
    idx++;
  }

  // Confidence
  const confidence = (response as any).confidence_level || (
    response.confidence >= 0.8 ? 'high' : response.confidence >= 0.5 ? 'medium' : 'low'
  );
  const confConfig = {
    high: { color: '#16A34A', label: 'High confidence' },
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

      {/* Sources toggle */}
      {response.references && response.references.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setSourcesOpen(!sourcesOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: '#71717A', padding: 0,
            }}
          >
            {sourcesOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Sources ({response.references.length})
          </button>
          {sourcesOpen && (
            <div style={{ marginTop: 6, paddingLeft: 16 }}>
              {response.references.map((ref, i) => (
                <div key={i} style={{ fontSize: 11, color: '#71717A', marginBottom: 2 }}>
                  [{i + 1}] {ref.source_type}{ref.source_url ? ` — ${ref.source_url}` : ''} ({(ref.similarity * 100).toFixed(0)}%)
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
