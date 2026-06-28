/**
 * ADF Light Renderer — zero-chunk read view for simple ADF documents.
 *
 * Replaces @atlaskit/renderer (~500KB) for descriptions that contain only
 * common prose nodes: paragraphs, headings, lists, blockquotes, code blocks,
 * inline marks (bold/italic/underline/strike/code/link/color), hard breaks,
 * and horizontal rules. No media, no tables, no panels, no expand.
 *
 * Performance contract:
 *   - No dynamic import. This module is <5KB and ships in the main chunk.
 *   - Renders synchronously with zero Suspense delay.
 *   - Falls back: callers must check hasComplexAdfNodes() first and use
 *     EpicDescriptionRenderer for complex docs.
 *
 * Jira parity: produces the same visual output as @atlaskit/renderer for
 * the supported node set (probed 2026-05-09: 14px/400/rgb(41,42,46)/lh 24px).
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import {
  ensureGrammar,
  highlightToHtml,
  resolvePrismId,
} from '@/components/catalyst-detail-views/shared/sections/Description/utils/prismHighlight';
import {
  TicketLinkCard,
  extractIssueKey,
  TICKET_KEY_REGEX,
} from '@/components/shared/TicketLinkCard';

// ─── Complexity classifier ─────────────────────────────────────────────────

const COMPLEX_TYPES = new Set([
  'mediaSingle', 'mediaGroup', 'media',
  'expand', 'nestedExpand',
  'layoutSection', 'layoutColumn',
  'extension', 'inlineExtension', 'bodiedExtension',
  'status', 'date',
  'decisionList', 'decisionItem',
  // NB: `mention`, `inlineCard`, and `blockCard` are handled directly
  // below by the light renderer — `mention` as a simple chip,
  // smart-cards via TicketLinkCard for ph_issues-backed cards.
  // Atlaskit's heavy renderer is intentionally bypassed for these so
  // the smart-card detection (link-marks pointing at browse URLs)
  // gets to fire on the read path.
]);

export function hasComplexAdfNodes(adf: unknown): boolean {
  if (!adf || typeof adf !== 'object') return false;
  const node = adf as { type?: string; content?: unknown[] };
  if (node.type && COMPLEX_TYPES.has(node.type)) return true;
  if (Array.isArray(node.content)) {
    return node.content.some(hasComplexAdfNodes);
  }
  return false;
}

// ─── Inline mark renderer ─────────────────────────────────────────────────

function renderMark(
  children: React.ReactNode,
  mark: { type: string; attrs?: Record<string, unknown> },
  key: string,
): React.ReactNode {
  switch (mark.type) {
    case 'strong':
      return <strong key={key}>{children}</strong>;
    case 'em':
      return <em key={key}>{children}</em>;
    case 'underline':
      return <u key={key}>{children}</u>;
    case 'strike':
      return <s key={key}>{children}</s>;
    case 'code':
      return (
        <code key={key} style={{
          background: token('color.background.neutral', 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'),
          padding: '1px 4px', borderRadius: 3,
          fontSize: '0.875em',
          fontFamily: 'var(--cp-font-mono, ui-monospace, monospace)',
        }}>
          {children}
        </code>
      );
    case 'link': {
      const href = String(mark.attrs?.href ?? mark.attrs?.url ?? '#');
      return (
        <a key={key} href={href}
          target="_blank" rel="noopener noreferrer"
          style={{ color: token('color.text.brand', 'var(--cp-primary-60, #0052CC)'), textDecoration: 'none' }}
        >
          {children}
        </a>
      );
    }
    case 'textColor':
      return (
        <span key={key} style={{ color: String(mark.attrs?.color ?? 'inherit') }}>
          {children}
        </span>
      );
    case 'subsup':
      return mark.attrs?.type === 'sub'
        ? <sub key={key}>{children}</sub>
        : <sup key={key}>{children}</sup>;
    default:
      return <React.Fragment key={key}>{children}</React.Fragment>;
  }
}

// ─── Inline content (text + marks) ───────────────────────────────────────

interface AdfNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: AdfNode[];
}

/**
 * Splits a plain text run into alternating string / ticket-key
 * segments using TICKET_KEY_REGEX. Used to convert bare Jira keys
 * inside paragraph text into TicketLinkCards while preserving the
 * surrounding text.
 */
function splitByTicketKeys(
  text: string,
): Array<{ type: 'text'; value: string } | { type: 'key'; value: string }> {
  if (!text) return [];
  // Reset stateful regex before iteration.
  TICKET_KEY_REGEX.lastIndex = 0;
  const out: Array<{ type: 'text'; value: string } | { type: 'key'; value: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = TICKET_KEY_REGEX.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', value: text.slice(last, m.index) });
    out.push({ type: 'key', value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

function renderInline(node: AdfNode, index: number): React.ReactNode {
  const key = `inline-${index}`;
  if (node.type === 'hardBreak') return <br key={key} />;

  // ADF mention — render as a simple chip. data-mention-id is
  // consumed by the runtime walker in Comment.tsx / DisplayView to
  // paint self vs other styling. Matches the token-based renderer.
  if (node.type === 'mention') {
    const text = String(node.attrs?.text ?? '');
    const id = String(node.attrs?.id ?? '');
    return (
      <span
        key={key}
        data-mention-id={id}
        style={{ display: 'inline-block', fontSize: '0.9em' }}
      >
        {text}
      </span>
    );
  }

  // Smart-card inline node — Jira/ADF "inlineCard" carries a URL that
  // usually points at a browse link. Render our internal TicketLinkCard
  // when the URL resolves to a key; otherwise fall back to a plain link.
  if (node.type === 'inlineCard') {
    const url = String(node.attrs?.url ?? '');
    const issueKey = extractIssueKey(url);
    if (issueKey) return <TicketLinkCard key={key} issueKey={issueKey} />;
    if (url) {
      return (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: token('color.link', 'var(--ds-link, #0052CC)') }}
        >
          {url}
        </a>
      );
    }
    return null;
  }

  if (node.type === 'text') {
    const text = node.text ?? '';
    const marks = node.marks ?? [];

    // A `link` mark whose href OR visible text contains a Jira
    // ticket key renders as the smart card. Checking the visible
    // text covers the case where the editor stored just the host as
    // the display string ("digital-transformation.atlassian.net")
    // while the href carries the full /browse/KEY path.
    const linkMark = marks.find((m) => m.type === 'link');
    if (linkMark) {
      const href = String(linkMark.attrs?.href ?? linkMark.attrs?.url ?? '');
      const issueKey = extractIssueKey(href) ?? extractIssueKey(text);
      if (issueKey) return <TicketLinkCard key={key} issueKey={issueKey} />;
    }

    // No marks → safe to split on bare ticket keys. With marks we keep
    // the mark wrappers intact and skip card detection (avoids losing
    // bold/italic on the surrounding text).
    if (marks.length === 0) {
      const segs = splitByTicketKeys(text);
      if (segs.length > 1) {
        return (
          <React.Fragment key={key}>
            {segs.map((s, i) =>
              s.type === 'key' ? (
                <TicketLinkCard key={`${key}-k${i}`} issueKey={s.value} />
              ) : (
                <React.Fragment key={`${key}-t${i}`}>{s.value}</React.Fragment>
              ),
            )}
          </React.Fragment>
        );
      }
    }

    let children: React.ReactNode = text;
    marks.forEach((mark, mi) => {
      children = renderMark(children, mark, `${key}-m${mi}`);
    });
    return <React.Fragment key={key}>{children}</React.Fragment>;
  }
  // Inline nodes we don't support yet — render plain text fallback
  return <React.Fragment key={key}>{node.text ?? ''}</React.Fragment>;
}

// ─── Direction detection ────────────────────────────────────────────────
//
// Mirrors the editor's `AutoDirection` extension so read mode flips
// bullets / numbering / blockquote borders / panel icons to the same
// inline-end side that edit mode shows. First an explicit `dir` attr
// on the node wins (set by translation / AutoDirection at write time);
// otherwise we run the same first-strong-character algorithm browsers
// use for `dir='auto'`.

const ARABIC_DIR_RE =
  /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const LATIN_DIR_RE = /[A-Za-z]/;

function collectNodeText(node: AdfNode): string {
  if (typeof node.text === 'string') return node.text;
  if (!node.content) return '';
  let out = '';
  for (const c of node.content) out += collectNodeText(c);
  return out;
}

function blockDir(node: AdfNode): 'rtl' | 'ltr' | undefined {
  const explicit = node.attrs?.dir;
  if (explicit === 'rtl' || explicit === 'ltr') return explicit;
  const text = collectNodeText(node);
  for (const ch of text) {
    if (ARABIC_DIR_RE.test(ch)) return 'rtl';
    if (LATIN_DIR_RE.test(ch)) return 'ltr';
  }
  return undefined;
}

// ─── Block content ───────────────────────────────────────────────────────

function renderBlock(node: AdfNode, index: number): React.ReactNode {
  const key = `block-${index}`;
  const inline = (node.content ?? []).map((c, i) => renderInline(c, i));
  const dir = blockDir(node);

  switch (node.type) {
    case 'paragraph':
      return (
        <p
          key={key}
          dir={dir}
          style={{
            margin: '0 0 8px',
            fontWeight: 400,
            unicodeBidi: 'plaintext',
          }}
        >
          {inline}
        </p>
      );

    case 'heading': {
      const level = Number(node.attrs?.level ?? 1);
      const sizes: Record<number, string> = {
        1: '24px', 2: '20px', 3: '16px', 4: '14px', 5: '13px', 6: '12px',
      };
      const weights: Record<number, number> = {
        1: 700, 2: 600, 3: 600, 4: 600, 5: 600, 6: 600,
      };
      return React.createElement(
        `h${level}`,
        {
          key,
          dir,
          style: {
            fontSize: sizes[level] ?? '14px',
            fontWeight: weights[level] ?? 600,
            margin: level <= 2 ? '16px 0 8px' : '12px 0 4px',
            color: token('color.text', 'rgb(41,42,46)'),
            lineHeight: 1.3,
            unicodeBidi: 'plaintext',
          },
        },
        ...inline,
      );
    }

    case 'bulletList':
      return (
        <ul
          key={key}
          dir={dir}
          style={{
            margin: '4px 0 8px',
            paddingInlineStart: 24,
            listStyleType: 'disc',
          }}
        >
          {(node.content ?? []).map((item, i) => renderBlock(item, i))}
        </ul>
      );

    case 'orderedList':
      return (
        <ol
          key={key}
          dir={dir}
          style={{
            margin: '4px 0 8px',
            paddingInlineStart: 24,
            listStyleType: 'decimal',
          }}
        >
          {(node.content ?? []).map((item, i) => renderBlock(item, i))}
        </ol>
      );

    case 'listItem':
      return (
        <li
          key={key}
          dir={dir}
          style={{ marginBottom: 4, unicodeBidi: 'plaintext' }}
        >
          {(node.content ?? []).map((c, i) => renderBlock(c, i))}
        </li>
      );

    case 'taskList':
      return (
        <ul
          key={key}
          dir={dir}
          style={{
            margin: '4px 0 8px',
            paddingInlineStart: 24,
            listStyle: 'none',
          }}
        >
          {(node.content ?? []).map((item, i) => renderBlock(item, i))}
        </ul>
      );

    case 'taskItem': {
      const done = node.attrs?.state === 'DONE';
      return (
        <li
          key={key}
          dir={dir}
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 4,
            alignItems: 'flex-start',
          }}
        >
          <input type="checkbox" readOnly checked={done} style={{ marginTop: 3 }} />
          <span style={{ flex: 1, unicodeBidi: 'plaintext' }}>
            {(node.content ?? []).map((c, i) => renderInline(c, i))}
          </span>
        </li>
      );
    }

    case 'blockquote':
      return (
        <blockquote
          key={key}
          dir={dir}
          style={{
            borderInlineStart: `2px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
            padding: '8px 12px',
            margin: '8px 0',
            color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
          }}
        >
          {(node.content ?? []).map((c, i) => renderBlock(c, i))}
        </blockquote>
      );

    case 'codeBlock': {
      // Read-mode code block — mirrors the edit-view CodeBlockWithGutter
      // NodeView (useTiptapEditor.ts): a 2-column CSS grid with the
      // line-number gutter on the left and the code on the right. All
      // font/line-height/padding values match the edit-mode rules in
      // editorStyles.ts (.catalyst-code-block, .catalyst-code-block-pre,
      // .catalyst-code-block-gutter) so toggling between read and edit
      // doesn't shift a single pixel.
      // Syntax highlight via Prism — see PrismCodeBlock for the
      // grammar-loading lifecycle (mirrors edit-mode highlighting).
      const lang = String(node.attrs?.language ?? '');
      const text = (node.content ?? []).map(c => c.text ?? '').join('');
      return <PrismCodeBlock key={key} text={text} language={lang} />;
    }

    case 'rule':
      return (
        <hr key={key} style={{
          border: 'none',
          borderTop: `1px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
          margin: '16px 0',
        }} />
      );

    // ── Smart link block — ph_issues-backed TicketLinkCard ───────────────
    case 'blockCard': {
      const url = String(node.attrs?.url ?? '');
      const issueKey = extractIssueKey(url);
      if (issueKey) {
        return (
          <div key={key} style={{ margin: '8px 0' }}>
            <TicketLinkCard issueKey={issueKey} block />
          </div>
        );
      }
      if (url) {
        return (
          <div key={key} style={{ margin: '8px 0' }}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: token('color.link', 'var(--ds-link, #0052CC)') }}
            >
              {url}
            </a>
          </div>
        );
      }
      return null;
    }

    // ── Panel (info / note / warning / error / success / tip) ────────────
    case 'panel': {
      const panelType = String(node.attrs?.panelType ?? 'info');
      const panelStyles: Record<string, { bg: string; border: string; icon: string }> = {
        info:    { bg: token('color.background.information.subtle', 'var(--ds-background-selected, #E9F2FF)'), border: token('color.border', 'rgba(11,18,14,0.14)'), icon: 'ℹ' },
        note:    { bg: token('color.background.information.subtle', 'var(--ds-background-selected, #E9F2FF)'), border: token('color.border', 'rgba(11,18,14,0.14)'), icon: '📝' },
        tip:     { bg: token('color.background.success.subtle', 'var(--ds-background-success, #DFFCF0)'), border: token('color.border', 'rgba(11,18,14,0.14)'), icon: '💡' },
        success: { bg: token('color.background.success.subtle', 'var(--ds-background-success, #DFFCF0)'), border: token('color.border', 'rgba(11,18,14,0.14)'), icon: '✓' },
        warning: { bg: token('color.background.warning.subtle', 'var(--ds-background-warning, #FFF7D6)'), border: token('color.border', 'rgba(11,18,14,0.14)'), icon: '⚠' },
        error:   { bg: token('color.background.danger.subtle', 'var(--ds-background-danger, #FFECEB)'),  border: token('color.border.danger', 'var(--ds-background-danger-bold, var(--ds-background-danger-bold, #C9372C))'), icon: '✕' },
      };
      const style = panelStyles[panelType] ?? panelStyles.info;
      return (
        <div
          key={key}
          dir={dir}
          style={{
            display: 'flex',
            gap: 8,
            padding: '10px 12px',
            background: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: 4,
            margin: '8px 0',
          }}
        >
          <span style={{ flexShrink: 0, fontSize: 14, lineHeight: '24px' }} aria-hidden="true">{style.icon}</span>
          <div style={{ flex: 1 }}>
            {(node.content ?? []).map((c, i) => renderBlock(c, i))}
          </div>
        </div>
      );
    }

    // ── Table ─────────────────────────────────────────────────────────────
    case 'table':
      return (
        <div key={key} style={{ overflowX: 'auto', margin: '8px 0 12px' }}>
          <table style={{
            borderCollapse: 'collapse', width: '100%',
            fontSize: 14, lineHeight: '20px',
          }}>
            <tbody>
              {(node.content ?? []).map((row, i) => renderBlock(row, i))}
            </tbody>
          </table>
        </div>
      );

    case 'tableRow':
      return (
        <tr key={key}>
          {(node.content ?? []).map((cell, i) => renderBlock(cell, i))}
        </tr>
      );

    case 'tableHeader':
      return (
        <th
          key={key}
          dir={dir}
          style={{
            border: `1px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
            padding: '6px 10px',
            textAlign: 'start',
            background: token('elevation.surface.sunken', 'var(--ds-surface-sunken, #F7F8F9)'),
            fontWeight: 600,
            fontSize: 12,
            color: token('color.text', 'rgb(41,42,46)'),
          }}
        >
          {(node.content ?? []).map((c, i) => renderBlock(c, i))}
        </th>
      );

    case 'tableCell':
      return (
        <td
          key={key}
          dir={dir}
          style={{
            border: `1px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
            padding: '6px 10px',
            verticalAlign: 'top',
            color: token('color.text', 'rgb(41,42,46)'),
          }}
        >
          {(node.content ?? []).map((c, i) => renderBlock(c, i))}
        </td>
      );

    default:
      // Unknown block — render children as inline fallback
      return (
        <p
          key={key}
          dir={dir}
          style={{ margin: '0 0 8px', unicodeBidi: 'plaintext' }}
        >
          {(node.content ?? []).map((c, i) => renderInline(c, i))}
        </p>
      );
  }
}

// ─── Root component ───────────────────────────────────────────────────────

interface AdfLightRendererProps {
  adf: unknown;
}

export function AdfLightRenderer({ adf }: AdfLightRendererProps) {
  if (!adf || typeof adf !== 'object') return null;
  const doc = adf as AdfNode;
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return null;

  return (
    <div
      className="atlaskit-renderer-wrapper adf-light-renderer"
      style={{
        fontSize: 14, fontWeight: 400,
        color: token('color.text', 'rgb(41,42,46)'),
        lineHeight: '24px',
        fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
      }}
    >
      {doc.content.map((node, i) => renderBlock(node, i))}
    </div>
  );
}

/* ────────────────── PrismCodeBlock ──────────────────
 *
 * Read-mode code-block wrapper with line-number gutter + Prism-driven
 * syntax highlighting. Mirrors the edit-view CodeBlockWithGutter
 * structure 1:1 (same fonts, paddings, line-height, classes) so users
 * can't see a layout difference between read and edit.
 *
 * Grammar loading: `highlightToHtml` returns escaped text plus an
 * optional `pendingLoad` promise. When the grammar isn't bundled
 * eagerly, the first render shows plain text, then re-renders with
 * coloured tokens once the dynamic import resolves.
 */
interface PrismCodeBlockProps {
  text: string;
  language: string;
}

const PrismCodeBlock: React.FC<PrismCodeBlockProps> = ({ text, language }) => {
  const prismId = React.useMemo(() => resolvePrismId(language), [language]);
  // version state is bumped whenever the async grammar import resolves,
  // forcing a re-render with the now-registered grammar.
  const [version, setVersion] = React.useState(0);

  React.useEffect(() => {
    if (!prismId) return;
    let cancelled = false;
    ensureGrammar(prismId).then(() => {
      if (!cancelled) setVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [prismId]);

  const { html } = React.useMemo(
    () => highlightToHtml(text, prismId),
    // version intentionally in deps so the memo re-runs after grammar
    // loads; html itself is the input we hand to dangerouslySetInnerHTML.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, prismId, version],
  );

  const lineCount = Math.max(1, text.split('\n').length);
  const lineNumbers: number[] = [];
  for (let i = 1; i <= lineCount; i++) lineNumbers.push(i);
  const monoFamily =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

  return (
    <div
      className="catalyst-code-block"
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        alignItems: 'stretch',
        background: token('elevation.surface.sunken', 'var(--ds-surface-sunken, #F7F8F9)'),
        margin: '4px 0 8px',
        fontFamily: monoFamily,
        fontSize: 13,
        lineHeight: '20px',
        borderRadius: 0,
      }}
    >
      <div
        aria-hidden="true"
        className="catalyst-code-block-gutter"
        style={{
          background: token('color.background.neutral', '#E4E6EA'),
          color: token('color.text.subtle', 'var(--ds-text-subtlest, #6B778C)'),
          padding: '8px 10px',
          margin: 0,
          textAlign: 'right',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          fontFamily: monoFamily,
          fontSize: 13,
          lineHeight: '20px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {lineNumbers.map((n) => (
          <span
            key={n}
            className="catalyst-code-block-ln"
            style={{ display: 'block', lineHeight: '20px' }}
          >
            {n}
          </span>
        ))}
      </div>
      <pre
        className="catalyst-code-block-pre"
        style={{
          background: 'transparent',
          padding: '8px 12px',
          margin: 0,
          overflowX: 'auto',
          minWidth: 0,
          fontFamily: monoFamily,
          fontSize: 13,
          lineHeight: '20px',
          border: 0,
          borderRadius: 0,
        }}
      >
        <code
          data-language={language}
          dangerouslySetInnerHTML={{ __html: html }}
          style={{
            background: 'none',
            padding: 0,
            margin: 0,
            fontFamily: monoFamily,
            fontSize: 13,
            lineHeight: '20px',
            border: 0,
            borderRadius: 0,
          }}
        />
      </pre>
    </div>
  );
};
