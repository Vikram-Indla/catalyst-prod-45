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

// ─── Complexity classifier ─────────────────────────────────────────────────

const COMPLEX_TYPES = new Set([
  'mediaSingle', 'mediaGroup', 'media',
  'expand', 'nestedExpand',
  'layoutSection', 'layoutColumn',
  'extension', 'inlineExtension', 'bodiedExtension',
  'status', 'date',
  'decisionList', 'decisionItem',
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
          background: token('color.background.neutral', 'rgba(9,30,66,0.06)'),
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
          style={{ color: token('color.text.brand', '#0052CC'), textDecoration: 'none' }}
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

function renderInline(node: AdfNode, index: number): React.ReactNode {
  const key = `inline-${index}`;
  if (node.type === 'hardBreak') return <br key={key} />;
  if (node.type === 'text') {
    let children: React.ReactNode = node.text ?? '';
    (node.marks ?? []).forEach((mark, mi) => {
      children = renderMark(children, mark, `${key}-m${mi}`);
    });
    return <React.Fragment key={key}>{children}</React.Fragment>;
  }
  // Inline nodes we don't support yet — render plain text fallback
  return <React.Fragment key={key}>{node.text ?? ''}</React.Fragment>;
}

// ─── Block content ───────────────────────────────────────────────────────

function renderBlock(node: AdfNode, index: number): React.ReactNode {
  const key = `block-${index}`;
  const inline = (node.content ?? []).map((c, i) => renderInline(c, i));

  switch (node.type) {
    case 'paragraph':
      return (
        <p key={key} style={{
          margin: '0 0 8px', fontWeight: 400,
          unicodeBidi: 'plaintext',
        }}>
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
        <ul key={key} style={{ margin: '4px 0 8px', paddingLeft: 24, listStyleType: 'disc' }}>
          {(node.content ?? []).map((item, i) => renderBlock(item, i))}
        </ul>
      );

    case 'orderedList':
      return (
        <ol key={key} style={{ margin: '4px 0 8px', paddingLeft: 24, listStyleType: 'decimal' }}>
          {(node.content ?? []).map((item, i) => renderBlock(item, i))}
        </ol>
      );

    case 'listItem':
      return (
        <li key={key} style={{ marginBottom: 4, unicodeBidi: 'plaintext' }}>
          {(node.content ?? []).map((c, i) => renderBlock(c, i))}
        </li>
      );

    case 'taskList':
      return (
        <ul key={key} style={{ margin: '4px 0 8px', paddingLeft: 24, listStyle: 'none' }}>
          {(node.content ?? []).map((item, i) => renderBlock(item, i))}
        </ul>
      );

    case 'taskItem': {
      const done = node.attrs?.state === 'DONE';
      return (
        <li key={key} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
          <input type="checkbox" readOnly checked={done} style={{ marginTop: 3 }} />
          <span style={{ flex: 1, unicodeBidi: 'plaintext' }}>
            {(node.content ?? []).map((c, i) => renderInline(c, i))}
          </span>
        </li>
      );
    }

    case 'blockquote':
      return (
        <blockquote key={key} style={{
          borderLeft: `2px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
          padding: '8px 12px', margin: '8px 0',
          color: token('color.text.subtle', '#44546F'),
        }}>
          {(node.content ?? []).map((c, i) => renderBlock(c, i))}
        </blockquote>
      );

    case 'codeBlock': {
      const lang = String(node.attrs?.language ?? '');
      const text = (node.content ?? []).map(c => c.text ?? '').join('');
      return (
        <pre key={key} style={{
          background: token('elevation.surface.sunken', '#F7F8F9'),
          padding: 12, borderRadius: 4, fontSize: 13,
          overflowX: 'auto', margin: '4px 0 8px',
          fontFamily: 'var(--cp-font-mono, ui-monospace, monospace)',
        }}>
          <code data-language={lang}>{text}</code>
        </pre>
      );
    }

    case 'rule':
      return (
        <hr key={key} style={{
          border: 'none',
          borderTop: `1px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
          margin: '16px 0',
        }} />
      );

    // ── Panel (info / note / warning / error / success / tip) ────────────
    case 'panel': {
      const panelType = String(node.attrs?.panelType ?? 'info');
      const panelStyles: Record<string, { bg: string; border: string; icon: string }> = {
        info:    { bg: token('color.background.information.subtle', '#E9F2FF'), border: token('color.border', 'rgba(11,18,14,0.14)'), icon: 'ℹ' },
        note:    { bg: token('color.background.information.subtle', '#E9F2FF'), border: token('color.border', 'rgba(11,18,14,0.14)'), icon: '📝' },
        tip:     { bg: token('color.background.success.subtle', '#DCFFF1'), border: token('color.border', 'rgba(11,18,14,0.14)'), icon: '💡' },
        success: { bg: token('color.background.success.subtle', '#DCFFF1'), border: token('color.border', 'rgba(11,18,14,0.14)'), icon: '✓' },
        warning: { bg: token('color.background.warning.subtle', '#FFF7D6'), border: token('color.border', 'rgba(11,18,14,0.14)'), icon: '⚠' },
        error:   { bg: token('color.background.danger.subtle', '#FFEDEB'),  border: token('color.border.danger', '#FF5630'), icon: '✕' },
      };
      const style = panelStyles[panelType] ?? panelStyles.info;
      return (
        <div key={key} style={{
          display: 'flex', gap: 8, padding: '10px 12px',
          background: style.bg,
          border: `1px solid ${style.border}`,
          borderRadius: 4, margin: '8px 0',
        }}>
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
        <th key={key} style={{
          border: `1px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
          padding: '6px 10px', textAlign: 'left',
          background: token('elevation.surface.sunken', '#F7F8F9'),
          fontWeight: 600, fontSize: 12,
          color: token('color.text', 'rgb(41,42,46)'),
        }}>
          {(node.content ?? []).map((c, i) => renderBlock(c, i))}
        </th>
      );

    case 'tableCell':
      return (
        <td key={key} style={{
          border: `1px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
          padding: '6px 10px',
          verticalAlign: 'top',
          color: token('color.text', 'rgb(41,42,46)'),
        }}>
          {(node.content ?? []).map((c, i) => renderBlock(c, i))}
        </td>
      );

    default:
      // Unknown block — render children as inline fallback
      return (
        <p key={key} style={{ margin: '0 0 8px', unicodeBidi: 'plaintext' }}>
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
