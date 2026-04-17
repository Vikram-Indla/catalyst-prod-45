/**
 * Jira wiki-markup and mention renderer for catalyst-ds Activity/Comment content.
 *
 * Jira-sourced strings arrive with:
 *   - Mentions:     [~accountid:712020:abc-def]
 *   - Links:        [display text|https://url?share=xxx&rtime=yyy]
 *   - Colors:       {color:#ffffff}text{color}
 *   - Emphasis:     *bold*  _italic_  +underline+  -strike-
 *   - Code:         {{monospace}}
 *   - Bare URLs:    https://moiksa-my.sharepoint.com/...?share=xxx&rtime=yyy
 *
 * Catalyst renders these as clean text + JSX for URLs/mentions.
 */
import * as React from 'react';

export type JiraUserMap = Record<string, string>; // jira_account_id -> display name

/** Strip Jira wiki-style color tags: {color:hex}x{color} → x */
function stripColorTags(s: string): string {
  return s.replace(/\{color[^}]*\}/g, '').replace(/\{\/color\}/g, '');
}

/** Strip common Jira wiki-markup delimiters so raw *bold*, _italic_, etc. don't leak. */
function stripWikiDelimiters(s: string): string {
  return s
    .replace(/\{\{([^}]+)\}\}/g, '$1')           // {{mono}}
    .replace(/(?:^|\s)\*([^*\n]+)\*(?=\s|$)/g, ' $1') // *bold*
    .replace(/(?:^|\s)_([^_\n]+)_(?=\s|$)/g, ' $1')   // _italic_
    .replace(/(?:^|\s)\+([^+\n]+)\+(?=\s|$)/g, ' $1') // +underline+
    .replace(/(?:^|\s)-([^-\n]+)-(?=\s|$)/g, ' $1');  // -strike-
}

/** Truncate a URL for display while preserving the href. */
export function prettyUrl(url: string, max = 50): string {
  try {
    const u = new URL(url);
    const base = `${u.hostname}${u.pathname}`;
    return base.length > max ? base.slice(0, max - 1) + '…' : base;
  } catch {
    return url.length > max ? url.slice(0, max - 1) + '…' : url;
  }
}

/** Replace Jira mentions [~accountid:id] with @Name (falls back to @User when no map hit). */
function replaceMentions(s: string, userMap?: JiraUserMap): string {
  return s.replace(/\[~accountid:([^\]]+)\]/g, (_m, id) => {
    const name = userMap?.[id];
    return name ? `@${name}` : '@User';
  });
}

export interface RenderJiraContentOptions {
  userMap?: JiraUserMap;
  /** When true, strip all wiki markup and mentions but keep plain text (no JSX). Default false. */
  plainTextOnly?: boolean;
}

/**
 * Normalize a Jira-formatted string to plain text. Used for single-line diffs
 * where JSX link elements would break the layout.
 */
export function normalizeJiraText(raw: string | null | undefined, opts: RenderJiraContentOptions = {}): string {
  if (!raw) return '';
  let s = raw;
  s = stripColorTags(s);
  s = replaceMentions(s, opts.userMap);
  // Replace [text|url] with just "text (prettyUrl)" so it stays inline-friendly.
  s = s.replace(/\[([^\]|[]+)\|([^\]]+)\]/g, (_m, text, url) => `${text.trim()} (${prettyUrl(url.trim())})`);
  // Replace bare URL with prettyUrl
  s = s.replace(/https?:\/\/\S+/g, (m) => prettyUrl(m));
  s = stripWikiDelimiters(s);
  // Collapse runs of whitespace
  return s.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Render Jira-formatted content as JSX fragments: clickable links, @mentions,
 * and cleaned text. Preserves href on links but displays prettyUrl.
 */
export function renderJiraContent(
  raw: string | null | undefined,
  opts: RenderJiraContentOptions = {}
): React.ReactNode {
  if (!raw) return null;

  let s = stripColorTags(raw);
  s = replaceMentions(s, opts.userMap);
  s = stripWikiDelimiters(s);

  // Tokenize into text + links. Use a split approach so we can emit <a> for URLs.
  const linkPattern = /\[([^\]|[]+)\|([^\]]+)\]|(https?:\/\/[^\s]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = linkPattern.exec(s)) !== null) {
    if (m.index > lastIdx) {
      parts.push(s.slice(lastIdx, m.index));
    }
    if (m[1] && m[2]) {
      // [text|url]
      const text = m[1].trim();
      const url = m[2].trim().split('|')[0]; // Jira sometimes duplicates url after | - take first
      parts.push(
        <a
          key={`link-${key++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0747A6] dark:text-[#4C9AFF] hover:underline"
        >
          {text}
        </a>
      );
    } else if (m[3]) {
      // bare URL
      const url = m[3];
      parts.push(
        <a
          key={`link-${key++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0747A6] dark:text-[#4C9AFF] hover:underline"
        >
          {prettyUrl(url)}
        </a>
      );
    }
    lastIdx = linkPattern.lastIndex;
  }
  if (lastIdx < s.length) {
    parts.push(s.slice(lastIdx));
  }

  return <>{parts}</>;
}
