import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
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
      border-inline-start: 2px solid var(--ds-border, rgba(11,18,14,0.14)) !important;
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

function renderContent(content: string, currentUserId?: string): React.ReactNode {
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
  // Token-based renderer — handles inline images `![alt](url)`,
  // legacy ADF mentions `@[Name](id)`, multi-word `@Capitalized Name`
  // mentions, plain `@word` mentions, Atlassian browse URLs, and
  // bare ticket keys (BAU-1234) → all rendered as smart TicketLinkCards.
  //
  // URL alternative is listed before the bare-key alternative so that
  // when a full URL appears, the regex captures the whole URL in one
  // go (rather than matching the bare key inside it).
  // Bare-key alternative uses negative look-arounds so it never
  // matches a key sitting INSIDE a URL — those are handled by the
  // browse-URL alternative above.
  const pattern =
    /!\[([^\]]*)\]\(([^)]+)\)|@\[([^\]]+)\]\([^)]+\)|@[A-Z][\w.]*(?:\s[A-Z][\w.]*)*|@\w+|https?:\/\/[a-z0-9-]+\.atlassian\.net\/browse\/([A-Z][A-Z0-9]{0,9}-\d+)(?:\?[^\s)]*)?(?:#[^\s)]*)?|(?<![A-Za-z0-9/?&=:_-])([A-Z][A-Z0-9]{0,9}-\d+)(?![A-Za-z0-9/?&=_-])/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(content)) !== null) {
    if (m.index > lastIndex) {
      nodes.push(<React.Fragment key={key++}>{content.slice(lastIndex, m.index)}</React.Fragment>);
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
      const name = m[3] ?? '';
      // Extract the id portion from `@[Name](id)` so the runtime
      // walker can stamp self vs other classes on this chip.
      const idMatch = /^@\[[^\]]+\]\(([^)]+)\)$/.exec(match);
      const mentionId = idMatch?.[1] ?? '';
      nodes.push(
        <span
          key={key++}
          data-mention-id={mentionId}
          style={{ display: 'inline-block', fontSize: '0.9em' }}
        >
          @{name}
        </span>
      );
    } else if (m[4]) {
      // Full Atlassian browse URL — group 4 captures the ticket key.
      nodes.push(<TicketLinkCard key={key++} issueKey={m[4]} />);
    } else if (m[5]) {
      // Bare ticket key (BAU-1234).
      nodes.push(<TicketLinkCard key={key++} issueKey={m[5]} />);
    } else if (match.startsWith('@')) {
      // Plain @word mention — no id, so always renders as other-user.
      nodes.push(
        <span
          key={key++}
          data-mention-id=""
          style={{ display: 'inline-block', fontSize: '0.9em' }}
        >
          {match}
        </span>
      );
    }
    lastIndex = m.index + match.length;
  }
  if (lastIndex < content.length) {
    nodes.push(<React.Fragment key={key++}>{content.slice(lastIndex)}</React.Fragment>);
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
      className="cds-comment-body text-[13px] text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))] dark:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))] whitespace-pre-wrap leading-relaxed"
    >
      {renderContent(content)}
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
        className={cn(
          'flex gap-3 py-3',
          isHighlighted && 'bg-[#DEEBFF]/30 dark:bg-[#1C3A5C]/20 -mx-3 px-3 rounded',
          className
        )}
      >
        <span className="shrink-0">
          <Avatar
            src={author.avatarUrl}
            name={isSystem ? 'System' : author.name}
            size="small"
          />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={cn(
                'text-[14px] font-semibold',
                isSystem
                  ? 'text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)]'
                  : 'text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)]'
              )}
            >
              {author.name}
            </span>
          </div>
          <div className="text-[12px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)] mb-2">
            {formatAbsoluteDate(createdAt)}
            {isEdited && (
              <span className="italic ml-2">edited</span>
            )}
          </div>

          <CommentBody content={content} />

          {extras}

          {/* Reaction chips */}
          {reactions && reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {reactions.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => onToggleReaction?.(comment.id, r.emoji)}
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[12px] border transition-colors',
                    r.reacted_by_me
                      ? 'bg-[var(--ds-background-selected,#DEEBFF)] border-[var(--ds-border-selected,#0052CC)] text-[var(--ds-text-selected,#0052CC)]'
                      : 'bg-[var(--ds-surface,#FFFFFF)] border-[var(--ds-border,#DFE1E6)] text-[var(--ds-text-subtlest,#6B778C)] hover:bg-[var(--ds-background-neutral-subtle-hovered,#F1F2F4)]',
                    'dark:bg-[var(--ds-surface,#1A1A1A)]'
                  )}
                >
                  <span>{r.emoji}</span>
                  <span>{r.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Action bar — Reply, Emoji, ⋯ More (legacy `actions` prop still supported) */}
          {!isSystem && (
            <div className="flex items-center gap-1 mt-2">
              {actions ?? (
                <>
                  {onReply && (
                    <CommentAction
                      onClick={() => onReply(comment.id)}
                      icon={<Reply />}
                      aria-label="Reply"
                      title="Reply"
                    />
                  )}
                  {onQuote && (
                    <CommentAction
                      onClick={() => onQuote(comment.id)}
                      icon={<Quote />}
                      aria-label="Quote reply"
                      title="Quote reply"
                    />
                  )}

                  {/* Emoji quick picker */}
                  {onToggleReaction && (
                    <div className="relative" ref={emojiRef}>
                      <CommentAction
                        onClick={() => setEmojiOpen(!emojiOpen)}
                        icon={<SmilePlus />}
                        aria-label="Add reaction"
                        title="Add reaction"
                      />
                      {emojiOpen && (
                        <div className="absolute left-0 bottom-full mb-1 z-50 bg-[var(--ds-surface-overlay,#FFFFFF)] dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-[var(--ds-border,#DFE1E6)] rounded-md shadow-lg p-1 flex gap-0.5">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                onToggleReaction(comment.id, emoji);
                                setEmojiOpen(false);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--ds-background-neutral-subtle-hovered,#F1F2F4)] text-[16px] transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ⋯ More dropdown */}
                  {(canEdit || canDelete || onCopyLink) && (
                    <div className="relative" ref={moreRef}>
                      <CommentAction
                        onClick={() => setMoreOpen(!moreOpen)}
                        icon={<MoreHorizontal />}
                        aria-label="More actions"
                        title="More actions"
                      />
                      {moreOpen && (
                        <div className="absolute left-0 top-full mt-1 z-50 bg-[var(--ds-surface-overlay,#FFFFFF)] dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-[var(--ds-border,#DFE1E6)] rounded-md shadow-lg py-1 min-w-[140px]">
                          {onCopyLink && (
                            <button
                              type="button"
                              onClick={handleCopyLink}
                              className="w-full text-left px-3 py-1.5 text-[13px] text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)] hover:bg-[var(--ds-background-neutral-subtle-hovered,#F1F2F4)] flex items-center gap-2"
                            >
                              <Link2 className="h-3.5 w-3.5" /> Copy link
                            </button>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => { onEdit!(comment.id); setMoreOpen(false); }}
                              className="w-full text-left px-3 py-1.5 text-[13px] text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)] hover:bg-[var(--ds-background-neutral-subtle-hovered,#F1F2F4)] flex items-center gap-2"
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => { onDelete!(comment.id); setMoreOpen(false); }}
                              className="w-full text-left px-3 py-1.5 text-[13px] text-[var(--ds-text-danger,#AE2A19)] hover:bg-[var(--ds-background-neutral-subtle-hovered,#F1F2F4)] flex items-center gap-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);
Comment.displayName = 'Comment';

export { Comment, formatAbsoluteDate, getInitials, renderContent };
