/**
 * ADF (Atlassian Document Format) → HTML converter
 * Converts Jira's structured JSON description format to HTML
 * that TipTap can render natively.
 *
 * Supported node types: paragraph, heading, bulletList, orderedList,
 * codeBlock, blockquote, rule, table, mediaSingle, mediaGroup,
 * blockCard, embedCard, taskList
 *
 * Supported marks: strong, em, underline, code, link, textColor
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
      case 'code':
        result = `<code>${result}</code>`;
        break;
      case 'link':
        result = `<a href="${escapeAttr(mark.attrs?.href ?? '#')}" target="_blank" rel="noopener noreferrer">${result}</a>`;
        break;
      case 'textColor':
        result = `<span style="color:${escapeAttr(mark.attrs?.color ?? 'inherit')}">${result}</span>`;
        break;
      default:
        break;
    }
  }
  return result;
}

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
      return `<strong>@${escapeHtml(node.attrs?.text ?? node.attrs?.id ?? '')}</strong>`;
    }
    if (node.type === 'emoji') {
      return node.attrs?.shortName ?? '';
    }
    if (node.type === 'inlineCard') {
      const url = node.attrs?.url ?? '#';
      return `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
    }
    // For any nested block-level content inside inline
    if (node.content) {
      return renderInlineContent(node.content);
    }
    return '';
  }).join('');
}

function renderNode(node: AdfNode): string {
  switch (node.type) {
    case 'paragraph':
      return `<p>${renderInlineContent(node.content)}</p>`;

    case 'heading': {
      const level = node.attrs?.level ?? 1;
      const tag = `h${Math.min(Math.max(level, 1), 6)}`;
      return `<${tag}>${renderInlineContent(node.content)}</${tag}>`;
    }

    case 'bulletList':
      return `<ul>${(node.content ?? []).map(renderNode).join('')}</ul>`;

    case 'orderedList':
      return `<ol>${(node.content ?? []).map(renderNode).join('')}</ol>`;

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

    case 'table':
      return `<table>${(node.content ?? []).map(renderNode).join('')}</table>`;

    case 'tableRow':
      return `<tr>${(node.content ?? []).map(renderNode).join('')}</tr>`;

    case 'tableHeader':
      return `<th>${(node.content ?? []).map(renderNode).join('')}</th>`;

    case 'tableCell':
      return `<td>${(node.content ?? []).map(renderNode).join('')}</td>`;

    case 'taskList':
      return `<ul class="task-list">${(node.content ?? []).map(renderNode).join('')}</ul>`;

    case 'taskItem': {
      const checked = node.attrs?.state === 'DONE' ? ' checked' : '';
      return `<li class="task-item"><input type="checkbox"${checked} disabled/>${(node.content ?? []).map(renderNode).join('')}</li>`;
    }

    case 'mediaSingle':
    case 'mediaGroup':
      // Media nodes reference Jira attachments by ID — render placeholder
      return `<p><em>[Media attachment]</em></p>`;

    case 'blockCard':
    case 'embedCard': {
      const url = node.attrs?.url ?? '';
      return url ? `<p><a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></p>` : '';
    }

    default:
      // Fallback: try to render children
      if (node.content) {
        return (node.content).map(renderNode).join('');
      }
      if (node.text) {
        return renderMarks(node.text, node.marks);
      }
      return '';
  }
}

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

/**
 * Convert an ADF JSON document to HTML string.
 * Returns empty string if input is null/undefined/invalid.
 */
export function adfToHtml(adf: any): string {
  if (!adf || typeof adf !== 'object') return '';
  if (adf.type !== 'doc' || !Array.isArray(adf.content)) return '';
  return adf.content.map(renderNode).join('');
}
