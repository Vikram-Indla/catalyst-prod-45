/**
 * CANONICAL — Description section for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Renders ADF (Atlassian Document Format) content with images when available,
 * falls back to plain text. Shows placeholder when empty.
 */
import React from 'react';
import type { PhIssue } from '../types';

interface CatalystDescriptionSectionProps {
  issue: PhIssue | null;
  /** Override the section heading (default: "Description") */
  label?: string;
}

export function CatalystDescriptionSection({ issue, label = 'Description' }: CatalystDescriptionSectionProps) {
  const hasAdf = issue?.description_adf != null;
  const hasText = !!issue?.description_text;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#172B4D', marginBottom: 8 }}>{label}</div>
      {hasAdf ? (
        <div
          className="catalyst-description-body"
          style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7, minHeight: 60 }}
          dangerouslySetInnerHTML={{
            __html: adfToSimpleHtml(issue!.description_adf),
          }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG') {
              const src = (target as HTMLImageElement).src;
              if (src) window.open(src, '_blank', 'noopener,noreferrer');
            }
          }}
        />
      ) : hasText ? (
        <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 60 }}>
          {issue!.description_text}
        </div>
      ) : (
        <div style={{ fontSize: 14, color: '#97A0AF', fontStyle: 'italic', minHeight: 60 }}>
          Add a description…
        </div>
      )}
    </div>
  );
}

/**
 * Simple ADF to HTML converter — handles paragraphs, text, hardBreaks,
 * inline images, links, and basic marks (bold, italic, underline, code).
 * For full ADF rendering, use AdfDescriptionRenderer from StoryDetailModal.
 */
function adfToSimpleHtml(adf: any): string {
  if (!adf) return '';
  if (typeof adf === 'string') {
    try { adf = JSON.parse(adf); } catch { return adf; }
  }
  if (!adf.content) return '';

  return adf.content.map((block: any) => {
    if (block.type === 'paragraph') {
      const inner = (block.content || []).map(renderInline).join('');
      return `<p style="margin:0 0 8px">${inner || '&nbsp;'}</p>`;
    }
    if (block.type === 'heading') {
      const level = block.attrs?.level || 3;
      const inner = (block.content || []).map(renderInline).join('');
      return `<h${level} style="margin:12px 0 4px;font-weight:600">${inner}</h${level}>`;
    }
    if (block.type === 'bulletList') {
      const items = (block.content || []).map((li: any) => {
        const inner = (li.content || []).map((p: any) => (p.content || []).map(renderInline).join('')).join('');
        return `<li style="margin-bottom:4px">${inner}</li>`;
      }).join('');
      return `<ul style="margin:4px 0 8px;padding-left:20px">${items}</ul>`;
    }
    if (block.type === 'orderedList') {
      const items = (block.content || []).map((li: any) => {
        const inner = (li.content || []).map((p: any) => (p.content || []).map(renderInline).join('')).join('');
        return `<li style="margin-bottom:4px">${inner}</li>`;
      }).join('');
      return `<ol style="margin:4px 0 8px;padding-left:20px">${items}</ol>`;
    }
    if (block.type === 'mediaSingle' || block.type === 'mediaGroup') {
      const media = block.content?.[0];
      if (media?.type === 'media' && media.attrs?.url) {
        return `<p style="margin:8px 0"><img src="${media.attrs.url}" alt="" style="max-width:100%;border-radius:4px" /></p>`;
      }
    }
    if (block.type === 'codeBlock') {
      const inner = (block.content || []).map((t: any) => t.text || '').join('');
      return `<pre style="background:#F4F5F7;padding:12px;border-radius:4px;font-size:13px;overflow-x:auto;margin:4px 0 8px"><code>${inner}</code></pre>`;
    }
    return '';
  }).join('');
}

function renderInline(node: any): string {
  if (node.type === 'text') {
    let text = (node.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'strong') text = `<strong>${text}</strong>`;
        if (mark.type === 'em') text = `<em>${text}</em>`;
        if (mark.type === 'underline') text = `<u>${text}</u>`;
        if (mark.type === 'code') text = `<code style="background:#F4F5F7;padding:2px 4px;border-radius:3px;font-size:12px">${text}</code>`;
        if (mark.type === 'link' && mark.attrs?.href) text = `<a href="${mark.attrs.href}" target="_blank" rel="noopener noreferrer" style="color:#0052CC">${text}</a>`;
      }
    }
    return text;
  }
  if (node.type === 'hardBreak') return '<br/>';
  if (node.type === 'inlineCard' && node.attrs?.url) {
    return `<a href="${node.attrs.url}" target="_blank" rel="noopener noreferrer" style="color:#0052CC">${node.attrs.url}</a>`;
  }
  if (node.type === 'media' && node.attrs?.url) {
    return `<img src="${node.attrs.url}" alt="" style="max-width:100%;border-radius:4px" />`;
  }
  if (node.type === 'mention' && node.attrs?.text) {
    return `<span style="color:#0052CC;font-weight:500">@${node.attrs.text}</span>`;
  }
  return '';
}
