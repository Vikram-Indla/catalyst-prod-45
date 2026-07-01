import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Avatar } from '@/components/ads';
import type { CdsComment, CdsReaction, CdsUser } from '../types';
import { CommentAction } from './CommentAction';
import {
  AdfLightRenderer,
  hasComplexAdfNodes,
} from '@/components/shared/rich-text/atlaskit/adfLightRenderer';
import EpicDescriptionRenderer from '@/components/shared/rich-text/atlaskit/EpicDescriptionRenderer';
import {
  injectMentionStyles,
  markMentionsSelfStatus,
} from '@/components/shared/rich-text/mentions/mentionStyles';
import { useAuth } from '@/hooks/useAuth';
import { TicketLinkCard } from '@/components/shared/TicketLinkCard';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { parseMentions, type MentionRosterEntry } from '@/lib/mentions/parseMentions';
import { CatalystMention } from '@/components/shared/rich-text/mentions/CatalystMention';

// ─── Per-block direction detection for read mode ─────────────────────
//
// Mirrors DisplayView and the editor's AutoDirection: walk the
// rendered comment DOM, detect direction per block, and set the
// `dir` attribute so bullets / numbers / blockquote borders / panel
// decorations follow the content's language. Idempotent — the
// MutationObserver re-runs the walker on every DOM mutation (Suspense
// resolution, async loaders, etc.).

const ARABIC_DIR_RE_CMT =
  /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const LATIN_DIR_RE_CMT = /[A-Za-z]/;
const DIR_BLOCK_SELECTOR_CMT =
  'p, h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote, [data-panel-type], [data-block-type="panel"]';

function detectCommentBlockDir(el: HTMLElement): 'rtl' | 'ltr' | null {
  const text = el.textContent ?? '';
  for (const ch of text) {
    if (ARABIC_DIR_RE_CMT.test(ch)) return 'rtl';
    if (LATIN_DIR_RE_CMT.test(ch)) return 'ltr';
  }
  return null;
}

function applyCommentDirection(root: HTMLElement) {
  const blocks = root.querySelectorAll<HTMLElement>(DIR_BLOCK_SELECTOR_CMT);
  blocks.forEach((el) => {
    const detected = detectCommentBlockDir(el);
    if (!detected) return;
    if (el.getAttribute('dir') !== detected) {
      el.setAttribute('dir', detected);
    }
  });
}

const CMT_DIRECTION_STYLE_ID = 'catalyst-comment-direction-styles';
function injectCommentDirectionStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(CMT_DIRECTION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = CMT_DIRECTION_STYLE_ID;
  style.textContent = `
    .cds-comment-body ul[dir="rtl"],
    .cds-comment-body ol[dir="rtl"] {
      padding-inline-start: 24px !important;
      padding-left: 0 !important;
    }
    .cds-comment-body ul[dir="ltr"],
    .cds-comment-body ol[dir="ltr"] {
      padding-inline-start: 24px !important;
      padding-right: 0 !important;
    }
    .cds-comment-body blockquote[dir="rtl"],
    .cds-comment-body blockquote[dir="ltr"] {
      border-inline-start: 2px solid var(--ds-border) !important;
      border-left: none !important;
      border-right: none !important;
    }
    /* Atlaskit's renderer uses appearance="comment" which injects its
       own padding around the rendered document. Strip it so the body
       starts at the same left edge as the toolbar that follows. */
    .cds-comment-body > div,
    .cds-comment-body .ak-renderer-wrapper,
    .cds-comment-body .ak-renderer-document {
      padding-left: 0 !important;
      padding-right: 0 !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    .cds-comment-body p:first-child,
    .cds-comment-body h1:first-child,
    .cds-comment-body h2:first-child,
    .cds-comment-body h3:first-child {
      margin-top: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

function tryParseAdf(content: string): unknown | null {
  const v = content.trim();
  if (!v.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(v);
    if (parsed && parsed.type === 'doc') return parsed;
  } catch {
    /* fallthrough to legacy renderer */
  }
  return null;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatAbsoluteDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return (
    date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }) +
    ' at ' +
    date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  );
}

function renderContent(
  content: string,
  options?: { roster?: readonly MentionRosterEntry[]; currentUserId?: string | null },
): React.ReactNode {
  const roster = options?.roster ?? [];
  const currentUserId = options?.currentUserId ?? null;

  const adf = tryParseAdf(content);
  if (adf) {
    if (hasComplexAdfNodes(adf)) {
      return (
        <React.Suspense fallback={<span />}>
          <EpicDescriptionRenderer content={adf} />
        </React.Suspense>
      );
    }
    return <AdfLightRenderer adf={adf} />;
  }
  // Token-based renderer — handles inline images `![alt](url)`, legacy ADF
  // mentions `@[Name](id)`, Atlassian browse URLs, and bare ticket keys
  // (BAU-1234) → all rendered as smart TicketLinkCards. Free-text
  // `@Name` / `@first last` / `@FirstName LastName Lopez` mentions are
  // delegated to parseMentions which longest-matches against the people
  // roster, so multi-word AND lowercase names render as a single chip.
  //
  // URL alternative is listed before the bare-key alternative so that
  // when a full URL appears, the regex captures the whole URL in one go
  // (rather than matching the bare key inside it). Bare-key alternative
  // uses negative look-arounds so it never matches a key sitting INSIDE
  // a URL — those are handled by the browse-URL alternative above.
  const pattern =
    /!\[([^\]]*)\]\(([^)]+)\)|@\[([^\]]+)\]\(([^)]+)\)|https?:\/\/[a-z0-9-]+\.atlassian\.net\/browse\/([A-Z][A-Z0-9]{0,9}-\d+)(?:\?[^\s)]*)?(?:#[^\s)]*)?|(?<![A-Za-z0-9/?&=:_-])([A-Z][A-Z0-9]{0,9}-\d+)(?![A-Za-z0-9/?&=_-])/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  const emitText = (text: string) => {
    if (!text) return;
    // Roster-aware mention parsing — handles any number of words AND
    // lowercase names (e.g. `@vikram indla`, `@Maria Garcia Lopez`).
    const parts = parseMentions(text, roster);
    for (const part of parts) {
      if (part.type === 'mention') {
        nodes.push(
          <CatalystMention
            key={key++}
            name={part.name}
            userId={part.userId}
            currentUserId={currentUserId}
          />,
        );
      } else {
        nodes.push(<React.Fragment key={key++}>{part.value}</React.Fragment>);
      }
    }
  };

  while ((m = pattern.exec(content)) !== null) {
    if (m.index > lastIndex) {
      emitText(content.slice(lastIndex, m.index));
    }
    const match = m[0];
    if (match.startsWith('![')) {
      const alt = m[1] ?? '';
      const url = m[2] ?? '';
      nodes.push(
        <img
          key={key++}
          src={url}
          alt={alt}
          style={{ maxWidth: '100%', borderRadius: 4, display: 'block', margin: '4px 0' }}
        />
      );
    } else if (match.startsWith('@[')) {
      // Legacy ADF mention `@[Name](id)` — the id is the canonical USER_ID,
      // so this chip can paint self-vs-other directly.
      const name = m[3] ?? '';
      const mentionId = m[4] ?? '';
      nodes.push(
        <CatalystMention
          key={key++}
          name={name}
          userId={mentionId || null}
          currentUserId={currentUserId}
        />,
      );
    } else if (m[5]) {
      // Full Atlassian browse URL — group 5 captures the ticket key.
      nodes.push(<TicketLinkCard key={key++} issueKey={m[5]} />);
    } else if (m[6]) {
      // Bare ticket key (BAU-1234).
      nodes.push(<TicketLinkCard key={key++} issueKey={m[6]} />);
    }
    lastIndex = m.index + match.length;
  }
  if (lastIndex < content.length) {
    emitText(content.slice(lastIndex));
  }

  return nodes;
}

/**
 * Rendered comment body wrapped with a ref + MutationObserver so the
 * direction walker fires whenever the inner ADF renderer (Atlaskit or
 * AdfLight) finishes mounting / hydrates async content.
 */
function CommentBody({ content }: { content: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const { groups: peopleGroups } = useChatPeople();
  const roster = React.useMemo<MentionRosterEntry[]>(
    () =>
      peopleGroups.flatMap((g) =>
        g.people.map((p) => ({ name: p.name, userId: p.profileId })),
      ),
    [peopleGroups],
  );
  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    injectCommentDirectionStyles();
    injectMentionStyles();
    const apply = () => {
      applyCommentDirection(root);
      markMentionsSelfStatus(root, currentUserId);
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [content, currentUserId]);
  return (
    <div
      ref={ref}
      className="cds-comment-body"
      style={{ fontSize: 13, color: 'var(--ds-text)', whiteSpace: 'pre-wrap', lineHeight: 1.625 }}
    >
      {renderContent(content, { roster, currentUserId })}
    </div>
  );
}

export interface CommentProps {
  comment: CdsComment;
  /** Renders between the message body and the actions toolbar. Use
   *  for affordances that belong to the message (e.g. the Translate
   *  bar) but should sit directly under the text, not below the
   *  toolbar. */
  extras?: React.ReactNode;
  actions?: React.ReactNode;
  isHighlighted?: boolean;
  className?: string;
}

const Comment = React.forwardRef<HTMLDivElement, CommentProps>(
  ({ comment, extras, actions, isHighlighted, className }, ref) => {
    const { author, content, createdAt, isEdited, isSystem } = comment;

    return (
      <div
        ref={ref}
        className={className}
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 0',
          ...(isHighlighted && {
            background: 'var(--ds-background-information)',
            marginInline: -12,
            paddingInline: 12,
            borderRadius: 4,
          }),
        }}
      >
        <span style={{ flexShrink: 0 }}>
          <Avatar
            src={author.avatarUrl}
            name={isSystem ? 'System' : author.name}
            size="small"
          />
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: isSystem ? 'var(--ds-text-subtlest)' : 'var(--ds-text)' }}>
              {author.name}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', marginBottom: 8 }}>
            {formatAbsoluteDate(createdAt)}
            {isEdited && (
              <span style={{ fontStyle: 'italic', marginLeft: 8 }}>edited</span>
            )}
          </div>

          <CommentBody content={content} />

          {extras}

          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  }
);
Comment.displayName = 'Comment';

export { Comment, formatAbsoluteDate, getInitials, renderContent };
