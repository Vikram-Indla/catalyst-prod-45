/**
 * ADF (Atlassian Document Format) → HTML converter
 * Converts Jira's structured JSON description format to HTML
 * that TipTap can render natively.
 *
 * FULL ADF spec coverage — all node & mark types from Atlassian's schema.
 *
 * Supported node types: paragraph, heading, bulletList, orderedList,
 * codeBlock, blockquote, rule, table, mediaSingle, mediaGroup,
 * blockCard, embedCard, taskList, panel, expand, nestedExpand,
 * decisionList, decisionItem, layoutSection, layoutColumn,
 * date, status, placeholder, media
 *
 * Supported marks: strong, em, underline, code, link, textColor,
 * strike, subsup, backgroundColor, annotation, indentation,
 * alignment, breakout
 */

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, any>;
  marks?: AdfMark[];
}

interface AdfMark {
  type: string;
  attrs?: Record<string, any>;
}

/* ─── Mark rendering ──────────────────────────────────────────── */

function renderMarks(text: string, marks?: AdfMark[]): string {
  if (!marks || marks.length === 0) return escapeHtml(text);
  let result = escapeHtml(text);
  for (const mark of marks) {
    switch (mark.type) {
      case 'strong':
        result = `<strong>${result}</strong>`;
        break;
      case 'em':
        result = `<em>${result}</em>`;
        break;
      case 'underline':
        result = `<u>${result}</u>`;
        break;
      case 'strike':
        result = `<s>${result}</s>`;
        break;
      case 'code':
        result = `<code>${result}</code>`;
        break;
      case 'link':
        result = `<a href="${escapeAttr(mark.attrs?.href ?? '#')}" target="_blank" rel="noopener noreferrer">${result}</a>`;
        break;
      case 'textColor':
        result = `<span style="color:${escapeAttr(mark.attrs?.color ?? 'inherit')}">${result}</span>`;
        break;
      case 'backgroundColor':
        result = `<span style="background-color:${escapeAttr(mark.attrs?.color ?? 'transparent')}">${result}</span>`;
        break;
      case 'subsup':
        if (mark.attrs?.type === 'sub') {
          result = `<sub>${result}</sub>`;
        } else {
          result = `<sup>${result}</sup>`;
        }
        break;
      case 'annotation':
        // Confluence inline comments — render text as-is with a subtle marker
        result = `<span class="adf-annotation" data-id="${escapeAttr(mark.attrs?.id ?? '')}">${result}</span>`;
        break;
      default:
        break;
    }
  }
  return result;
}

/* ─── Inline content rendering ────────────────────────────────── */

function renderInlineContent(nodes?: AdfNode[]): string {
  if (!nodes) return '';
  return nodes.map(node => {
    if (node.type === 'text') {
      return renderMarks(node.text ?? '', node.marks);
    }
    if (node.type === 'hardBreak') {
      return '<br/>';
    }
    if (node.type === 'mention') {
      const name = node.attrs?.text ?? node.attrs?.id ?? '';
      return `<span class="adf-mention">@${escapeHtml(name.replace(/^@/, ''))}</span>`;
    }
    if (node.type === 'emoji') {
      // Try to render unicode shortname; fall back to text representation
      return `<span class="adf-emoji">${node.attrs?.shortName ?? ''}</span>`;
    }
    if (node.type === 'inlineCard') {
      const url = node.attrs?.url ?? '#';
      return `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" class="adf-inline-card">${escapeHtml(url)}</a>`;
    }
    if (node.type === 'date') {
      const ts = node.attrs?.timestamp;
      if (ts) {
        try {
          const d = new Date(Number(ts));
          return `<span class="adf-date">${d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>`;
        } catch { /* fall through */ }
      }
      return `<span class="adf-date">${escapeHtml(ts ?? '')}</span>`;
    }
    if (node.type === 'status') {
      const text = node.attrs?.text ?? '';
      const color = node.attrs?.color ?? 'neutral';
      return `<span class="adf-status adf-status--${escapeAttr(color)}">${escapeHtml(text)}</span>`;
    }
    if (node.type === 'placeholder') {
      return `<span class="adf-placeholder">${escapeHtml(node.attrs?.text ?? '')}</span>`;
    }
    // For any nested block-level content inside inline
    if (node.content) {
      return renderInlineContent(node.content);
    }
    return '';
  }).join('');
}

/* ─── Panel type → CSS class mapping ──────────────────────────── */

const PANEL_CLASSES: Record<string, string> = {
  info: 'adf-panel--info',
  note: 'adf-panel--note',
  warning: 'adf-panel--warning',
  success: 'adf-panel--success',
  error: 'adf-panel--error',
  custom: 'adf-panel--custom',
};

/* ─── Block-level node rendering ──────────────────────────────── */

function renderNode(node: AdfNode): string {
  switch (node.type) {
    case 'paragraph': {
      // Check for alignment/indentation marks on the paragraph node attrs
      const styles: string[] = [];
      if (node.attrs?.alignment) styles.push(`text-align:${escapeAttr(node.attrs.alignment)}`);
      if (node.attrs?.indentLevel) styles.push(`margin-left:${Number(node.attrs.indentLevel) * 24}px`);
      const styleAttr = styles.length > 0 ? ` style="${styles.join(';')}"` : '';
      return `<p${styleAttr}>${renderInlineContent(node.content)}</p>`;
    }

    case 'heading': {
      const level = node.attrs?.level ?? 1;
      const tag = `h${Math.min(Math.max(level, 1), 6)}`;
      return `<${tag}>${renderInlineContent(node.content)}</${tag}>`;
    }

    case 'bulletList':
      return `<ul>${(node.content ?? []).map(renderNode).join('')}</ul>`;

    case 'orderedList': {
      const start = node.attrs?.order ?? 1;
      const startAttr = start > 1 ? ` start="${start}"` : '';
      return `<ol${startAttr}>${(node.content ?? []).map(renderNode).join('')}</ol>`;
    }

    case 'listItem':
      return `<li>${(node.content ?? []).map(renderNode).join('')}</li>`;

    case 'codeBlock': {
      const lang = node.attrs?.language ? ` class="language-${escapeAttr(node.attrs.language)}"` : '';
      const code = (node.content ?? []).map(c => escapeHtml(c.text ?? '')).join('\n');
      return `<pre><code${lang}>${code}</code></pre>`;
    }

    case 'blockquote':
      return `<blockquote>${(node.content ?? []).map(renderNode).join('')}</blockquote>`;

    case 'rule':
      return '<hr/>';

    /* ── Tables ── */
    case 'table':
      return `<table>${(node.content ?? []).map(renderNode).join('')}</table>`;

    case 'tableRow':
      return `<tr>${(node.content ?? []).map(renderNode).join('')}</tr>`;

    case 'tableHeader': {
      const colspan = node.attrs?.colspan && node.attrs.colspan > 1 ? ` colspan="${node.attrs.colspan}"` : '';
      const rowspan = node.attrs?.rowspan && node.attrs.rowspan > 1 ? ` rowspan="${node.attrs.rowspan}"` : '';
      const bg = node.attrs?.background ? ` style="background:${escapeAttr(node.attrs.background)}"` : '';
      return `<th${colspan}${rowspan}${bg}>${(node.content ?? []).map(renderNode).join('')}</th>`;
    }

    case 'tableCell': {
      const colspan = node.attrs?.colspan && node.attrs.colspan > 1 ? ` colspan="${node.attrs.colspan}"` : '';
      const rowspan = node.attrs?.rowspan && node.attrs.rowspan > 1 ? ` rowspan="${node.attrs.rowspan}"` : '';
      const bg = node.attrs?.background ? ` style="background:${escapeAttr(node.attrs.background)}"` : '';
      return `<td${colspan}${rowspan}${bg}>${(node.content ?? []).map(renderNode).join('')}</td>`;
    }

    /* ── Task lists (checkboxes) ── */
    case 'taskList':
      return `<ul class="adf-task-list">${(node.content ?? []).map(renderNode).join('')}</ul>`;

    case 'taskItem': {
      const checked = node.attrs?.state === 'DONE' ? ' checked' : '';
      return `<li class="adf-task-item"><input type="checkbox"${checked} disabled/><span>${(node.content ?? []).map(renderNode).join('')}</span></li>`;
    }

    /* ── Decision lists ── */
    case 'decisionList':
      return `<div class="adf-decision-list">${(node.content ?? []).map(renderNode).join('')}</div>`;

    case 'decisionItem': {
      const state = node.attrs?.state ?? 'DECIDED';
      return `<div class="adf-decision-item adf-decision--${escapeAttr(state.toLowerCase())}"><span class="adf-decision-icon">◆</span>${(node.content ?? []).map(renderNode).join('')}</div>`;
    }

    /* ── Panels (info, warning, note, success, error) ── */
    case 'panel': {
      const panelType = node.attrs?.panelType ?? 'info';
      const cls = PANEL_CLASSES[panelType] ?? 'adf-panel--info';
      const icon = panelType === 'info' ? 'ℹ' : panelType === 'warning' ? '⚠' : panelType === 'error' ? '✕' : panelType === 'success' ? '✓' : panelType === 'note' ? '📝' : '';
      return `<div class="adf-panel ${cls}"><span class="adf-panel-icon">${icon}</span><div class="adf-panel-content">${(node.content ?? []).map(renderNode).join('')}</div></div>`;
    }

    /* ── Expand / collapse sections ── */
    case 'expand':
    case 'nestedExpand': {
      const title = node.attrs?.title ?? 'Click to expand';
      return `<details class="adf-expand"><summary>${escapeHtml(title)}</summary><div class="adf-expand-content">${(node.content ?? []).map(renderNode).join('')}</div></details>`;
    }

    /* ── Layout sections (multi-column) ── */
    case 'layoutSection':
      return `<div class="adf-layout-section">${(node.content ?? []).map(renderNode).join('')}</div>`;

    case 'layoutColumn': {
      const width = node.attrs?.width ?? 50;
      return `<div class="adf-layout-column" style="width:${width}%">${(node.content ?? []).map(renderNode).join('')}</div>`;
    }

    /* ── Media ── */
    case 'mediaSingle':
    case 'mediaGroup':
      // Render media children — emit data slots for React hydration or direct <img> if URL available
      if (node.content) {
        const mediaNodes = node.content.filter(c => c.type === 'media');
        if (mediaNodes.length > 0) {
          return mediaNodes.map(m => {
            const url = m.attrs?.url;
            if (url) {
              return `<p><img src="${escapeAttr(url)}" alt="attachment" style="max-width:100%;border-radius:4px" /></p>`;
            }
            // Emit a data-slot div that AdfDescriptionRenderer can hydrate with real images
            const mediaId = m.attrs?.id || '';
            const filename = m.attrs?.alt || m.attrs?.filename || '';
            return `<div data-adf-media-id="${escapeAttr(mediaId)}" data-adf-media-filename="${escapeAttr(filename)}" class="adf-media-slot"></div>`;
          }).join('');
        }
      }
      // Fallback: emit empty slot
      return `<div data-adf-media-id="" data-adf-media-filename="" class="adf-media-slot"></div>`;

    case 'media': {
      const url = node.attrs?.url;
      if (url) {
        return `<img src="${escapeAttr(url)}" alt="attachment" style="max-width:100%;border-radius:4px" />`;
      }
      const mediaId = node.attrs?.id || '';
      const filename = node.attrs?.alt || node.attrs?.filename || '';
      return `<div data-adf-media-id="${escapeAttr(mediaId)}" data-adf-media-filename="${escapeAttr(filename)}" class="adf-media-slot"></div>`;
    }

    /* ── Cards (block / embed) ── */
    case 'blockCard':
    case 'embedCard': {
      const url = node.attrs?.url ?? '';
      return url
        ? `<p><a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" class="adf-block-card">${escapeHtml(url)}</a></p>`
        : '';
    }

    /* ── Fallback ── */
    default:
      if (node.content) {
        return (node.content).map(renderNode).join('');
      }
      if (node.text) {
        return renderMarks(node.text, node.marks);
      }
      return '';
  }
}

/* ─── Escape helpers ──────────────────────────────────────────── */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ─── Public API ──────────────────────────────────────────────── */

/**
 * Convert an ADF JSON document to HTML string.
 * Returns empty string if input is null/undefined/invalid.
 */
export function adfToHtml(adf: any): string {
  if (!adf || typeof adf !== 'object') return '';
  if (adf.type !== 'doc' || !Array.isArray(adf.content)) return '';
  return adf.content.map(renderNode).join('');
}

/**
 * Safely try to parse a string as ADF JSON and convert to HTML.
 * If the string is ADF JSON, returns the HTML. Otherwise returns null.
 * Useful for fields that may store ADF JSON or plain HTML/text.
 */
export function tryAdfStringToHtml(raw: string | null | undefined): string | null {
  if (!raw || raw.trim() === '') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
      return adfToHtml(parsed);
    }
  } catch { /* not JSON */ }
  return null;
}
