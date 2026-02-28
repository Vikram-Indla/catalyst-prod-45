import React from 'react';
import type { KBQueryResponse } from '@/services/knowledgeBase';

interface KBResponseRendererProps {
  response: KBQueryResponse;
  language: 'en' | 'ar';
}

/* ── helpers ── */

const TICKET_RE = /`([A-Z]+-\d+)`/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;

const ISSUE_HEADERS = ['issues & risks', 'issues', 'risks', 'blockers'];

function isHeader(line: string) {
  return /^\*\*[A-Za-z &]+\*\*$/.test(line.trim());
}

function headerLabel(line: string) {
  return line.replace(/\*\*/g, '').trim();
}

function isDangerHeader(label: string) {
  return ISSUE_HEADERS.some((h) => label.toLowerCase().includes(h));
}

/** Render inline formatting: **bold names** and `TICKET-123` */
function renderInline(text: string): React.ReactNode[] {
  // Replace tickets first, then bold
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Merge both patterns
  const COMBINED = /`([A-Z]+-\d+)`|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = COMBINED.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{remaining.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      // Ticket
      parts.push(
        <code
          key={key++}
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            color: '#2563EB',
            background: '#EFF6FF',
            border: '1px solid #DBEAFE',
            borderRadius: 4,
            padding: '1px 6px',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {match[1]}
        </code>
      );
    } else if (match[2]) {
      // Bold name
      parts.push(
        <strong key={key++} style={{ color: '#1D4ED8', fontWeight: 700 }}>
          {match[2]}
        </strong>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < remaining.length) {
    parts.push(<span key={key++}>{remaining.slice(lastIndex)}</span>);
  }
  return parts;
}

export const KBResponseRenderer: React.FC<KBResponseRendererProps> = ({ response, language }) => {
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const lines = (response.answer || '').split('\n');

  const elements: React.ReactNode[] = [];
  let idx = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      idx++;
      continue;
    }

    // Section header
    if (isHeader(trimmed)) {
      const label = headerLabel(trimmed);
      const danger = isDangerHeader(label);
      elements.push(
        <div key={idx} style={{ marginTop: 20, marginBottom: 8 }}>
          <div
            style={{
              width: 40,
              height: 2,
              background: danger ? '#DC2626' : '#2563EB',
              borderRadius: 1,
              marginBottom: 8,
            }}
          />
          <h4
            style={{
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: '#18181B',
              margin: 0,
              fontFamily: "system-ui, -apple-system, 'DM Sans', sans-serif",
            }}
          >
            {label}
          </h4>
        </div>
      );
      idx++;
      continue;
    }

    // Bullet item
    if (trimmed.startsWith('- ')) {
      const content = trimmed.slice(2);
      const isIssue =
        elements.length > 0 &&
        elements.some(
          (el) =>
            React.isValidElement(el) &&
            el.key !== null &&
            typeof el.key === 'string'
        );
      // Determine bullet color by scanning backwards for last header
      let bulletColor = '#2563EB';
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (React.isValidElement(el)) {
          const h4 = (el as any)?.props?.children?.[1];
          if (h4 && typeof h4?.props?.children === 'string') {
            if (isDangerHeader(h4.props.children)) bulletColor = '#DC2626';
            break;
          }
        }
      }

      elements.push(
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 4,
            fontSize: 13.5,
            lineHeight: 1.7,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: bulletColor,
              flexShrink: 0,
              marginTop: 8,
            }}
          />
          <span>{renderInline(content)}</span>
        </div>
      );
      idx++;
      continue;
    }

    // Narrative paragraph
    elements.push(
      <p
        key={idx}
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 14.5,
          lineHeight: 1.8,
          color: '#18181B',
          margin: '6px 0',
        }}
      >
        {renderInline(trimmed)}
      </p>
    );
    idx++;
  }

  return (
    <div dir={dir}>
      {/* Title */}
      {response.title && (
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#09090B',
            margin: '0 0 6px',
            fontFamily: "system-ui, -apple-system, 'DM Sans', sans-serif",
          }}
        >
          {response.title}
        </h3>
      )}

      {/* Category badge */}
      {response.category && (
        <span
          style={{
            display: 'inline-block',
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: '#2563EB',
            background: '#EFF6FF',
            border: '1px solid #DBEAFE',
            borderRadius: 4,
            padding: '2px 8px',
            marginBottom: 10,
          }}
        >
          {response.category}
        </span>
      )}

      {/* Body */}
      <div>{elements}</div>

      {/* Meta footer */}
      <div
        style={{
          marginTop: 14,
          fontSize: 10,
          color: '#71717A',
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        <span>⚡ {response._meta.response_time_ms}ms</span>
        <span>·</span>
        <span>Source: {response._meta.source}</span>
        {response._meta.similarity != null && (
          <>
            <span>·</span>
            <span>{(response._meta.similarity * 100).toFixed(0)}% match</span>
          </>
        )}
      </div>
    </div>
  );
};

export default KBResponseRenderer;
