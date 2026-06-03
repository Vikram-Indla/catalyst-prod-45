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
import { Reply, SmilePlus, MoreHorizontal, Edit, Trash2, Link2, Quote } from '@/lib/atlaskit-icons';

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
  const pattern = /!\[([^\]]*)\]\(([^)]+)\)|@\[([^\]]+)\]\(([^)]*)\)|@[A-Z][\w.]*(?:\s[A-Z][\w.]*)*|@\w+/g;
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
      const mentionId = m[4] ?? '';
      const isSelf = currentUserId && mentionId === currentUserId;
      nodes.push(
        <span
          key={key++}
          style={{
            display: 'inline-block',
            background: isSelf
              ? 'var(--ds-background-selected, #DEEBFF)'
              : 'var(--ds-background-neutral, #F4F5F7)',
            color: isSelf
              ? 'var(--ds-text-selected, #0747A6)'
              : 'var(--ds-link, #0052CC)',
            borderRadius: 3,
            padding: '2px 4px',
            fontSize: '0.9em',
            fontWeight: 500,
          }}
        >
          @{name}
        </span>
      );
    } else {
      nodes.push(
        <span
          key={key++}
          style={{
            display: 'inline-block',
            background: 'var(--ds-background-neutral, #F4F5F7)',
            color: 'var(--ds-link, #0052CC)',
            borderRadius: 3,
            padding: '0 4px',
            fontSize: '0.9em',
            fontWeight: 500,
          }}
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

const QUICK_EMOJIS = ['👍', '👏', '🎉', '❤️', '🚀', '👀'];

export interface CommentProps {
  comment: CdsComment;
  currentUser?: CdsUser;
  onReply?: (commentId: string) => void;
  onEdit?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onCopyLink?: (commentId: string) => void;
  onQuote?: (commentId: string) => void;
  onToggleReaction?: (commentId: string, emoji: string) => void;
  actions?: React.ReactNode;
  isHighlighted?: boolean;
  className?: string;
}

const Comment = React.forwardRef<HTMLDivElement, CommentProps>(
  ({ comment, currentUser, onReply, onEdit, onDelete, onCopyLink, onQuote, onToggleReaction, actions, isHighlighted, className }, ref) => {
    const { author, content, createdAt, isEdited, isSystem, reactions } = comment;
    const [moreOpen, setMoreOpen] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);
    const emojiRef = useRef<HTMLDivElement>(null);

    const canEdit = onEdit && currentUser && author.id === currentUser.id;
    const canDelete = onDelete && currentUser && author.id === currentUser.id;

    useEffect(() => {
      if (!moreOpen && !emojiOpen) return;
      const handler = (e: MouseEvent) => {
        if (moreOpen && moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
        if (emojiOpen && emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [moreOpen, emojiOpen]);

    const handleCopyLink = useCallback(() => {
      onCopyLink?.(comment.id);
      setMoreOpen(false);
    }, [onCopyLink, comment.id]);

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

          <div className="text-[14px] text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)] whitespace-pre-wrap leading-relaxed">
            {renderContent(content, currentUser?.id)}
          </div>

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
