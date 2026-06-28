import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Avatar from '@atlaskit/avatar';
import { IconButton } from '@atlaskit/button/new';
import CrossIcon from '@atlaskit/icon/core/close';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { chatRealtime } from '@/lib/chat/ChatRealtimeManager';
import { MessageComposer } from '@/components/chat/main/MessageComposer';
import { MessageText } from '../feed/MessageText';
import type { ChatMessage, ChatReaction } from '@/types/chat';
import type { ThreadMode } from '../../hooks/useShellState';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './thread-pane.css';

// ── DB helpers (mirrors useMessages pattern) ───────────────────────────────

const db = supabase as unknown as { from: (t: string) => any };

interface MsgRow {
  id: string;
  conversation_id: string;
  parent_id: string | null;
  author_id: string;
  body_text: string | null;
  body_adf: unknown | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

interface ReactionRow { message_id: string; emoji: string; user_id: string; }
interface AuthorRow   { id: string; full_name: string | null; avatar_url: string | null; }

function aggregateReactions(rows: ReactionRow[], myId: string | null): Map<string, ChatReaction[]> {
  const byMsg = new Map<string, Map<string, { count: number; mine: boolean }>>();
  for (const r of rows) {
    let e = byMsg.get(r.message_id);
    if (!e) { e = new Map(); byMsg.set(r.message_id, e); }
    const v = e.get(r.emoji) ?? { count: 0, mine: false };
    v.count++;
    if (myId && r.user_id === myId) v.mine = true;
    e.set(r.emoji, v);
  }
  const out = new Map<string, ChatReaction[]>();
  byMsg.forEach((emojis, msgId) =>
    out.set(msgId, Array.from(emojis.entries()).map(([emoji, v]) => ({
      emoji, count: v.count, reactedByMe: v.mine,
    })))
  );
  return out;
}

async function fetchThread(
  conversationId: string,
  parentId: string,
  myId: string | null,
): Promise<{ parent: ChatMessage | null; replies: ChatMessage[] }> {
  try {
    const SELECT = 'id, conversation_id, parent_id, author_id, body_text, body_adf, created_at, edited_at, deleted_at';

    const [parentRes, repliesRes] = await Promise.all([
      db.from('chat_messages').select(SELECT).eq('id', parentId).maybeSingle(),
      db.from('chat_messages').select(SELECT)
        .eq('parent_id', parentId)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }),
    ]);

    const allRows: MsgRow[] = [
      ...(parentRes.data ? [parentRes.data as MsgRow] : []),
      ...((repliesRes.data ?? []) as MsgRow[]),
    ];

    if (allRows.length === 0) return { parent: null, replies: [] };

    const ids = allRows.map(m => m.id);
    const authorIds = Array.from(new Set(allRows.map(m => m.author_id))).filter(Boolean);

    const [reactRes, authRes] = await Promise.all([
      db.from('chat_message_reactions').select('message_id, emoji, user_id').in('message_id', ids),
      authorIds.length > 0
        ? db.from('profiles').select('id, full_name, avatar_url').in('id', authorIds)
        : Promise.resolve({ data: [] }),
    ]);

    const reactions = aggregateReactions((reactRes.data ?? []) as ReactionRow[], myId);
    const authorsById = new Map<string, AuthorRow>(
      ((authRes.data ?? []) as AuthorRow[]).map(a => [a.id, a])
    );

    const toMsg = (m: MsgRow): ChatMessage => {
      const a = authorsById.get(m.author_id);
      return {
        id: m.id,
        conversationId: m.conversation_id,
        parentId: m.parent_id ?? null,
        authorId: m.author_id,
        authorName: a?.full_name ?? '',
        authorAvatarUrl: a?.avatar_url ?? null,
        bodyText: m.body_text ?? '',
        bodyAdf: m.body_adf ?? null,
        createdAt: m.created_at,
        editedAt: m.edited_at ?? null,
        deletedAt: m.deleted_at ?? null,
        reactions: reactions.get(m.id) ?? [],
        replyCount: 0,
        lastReplyAt: null,
        isAlsoInChannel: false,
      };
    };

    return {
      parent: parentRes.data ? toMsg(parentRes.data as MsgRow) : null,
      replies: ((repliesRes.data ?? []) as MsgRow[]).map(toMsg),
    };
  } catch {
    return { parent: null, replies: [] };
  }
}

// ── useThread hook ─────────────────────────────────────────────────────────

function useThread(conversationId: string, parentId: string) {
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['chat', 'thread', conversationId, parentId],
    queryFn: () => fetchThread(conversationId, parentId, myId),
    enabled: !!conversationId && !!parentId,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!conversationId) return;
    const unsub = chatRealtime.subscribeMessages(conversationId, () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'thread', conversationId, parentId] });
    });
    return unsub;
  }, [conversationId, parentId, queryClient]);

  const sendReply = useCallback(
    async (text: string, opts?: { alsoInChannel?: boolean }) => {
      if (!myId || !text.trim()) return;
      try {
        const trimmed = text.trim();
        await db.from('chat_messages').insert({
          conversation_id: conversationId,
          parent_id: parentId,
          author_id: myId,
          body_text: trimmed,
        });
        if (opts?.alsoInChannel) {
          await db.from('chat_messages').insert({
            conversation_id: conversationId,
            parent_id: null,
            author_id: myId,
            body_text: trimmed,
            is_also_in_channel: true,
          });
        }
        await queryClient.invalidateQueries({ queryKey: ['chat', 'thread', conversationId, parentId] });
        await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      } catch {
        // defensive: don't throw
      }
    },
    [conversationId, parentId, myId, queryClient],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!myId) return;
      try {
        const { data: existing } = await db
          .from('chat_message_reactions')
          .select('id')
          .eq('message_id', messageId)
          .eq('user_id', myId)
          .eq('emoji', emoji)
          .maybeSingle();
        if (existing?.id) {
          await db.from('chat_message_reactions').delete().eq('id', existing.id);
        } else {
          await db.from('chat_message_reactions').insert({ message_id: messageId, user_id: myId, emoji });
        }
        await queryClient.invalidateQueries({ queryKey: ['chat', 'thread', conversationId, parentId] });
      } catch {
        // defensive
      }
    },
    [conversationId, parentId, myId, queryClient],
  );

  return {
    parent: query.data?.parent ?? null,
    replies: query.data?.replies ?? [],
    isLoading: query.isLoading,
    sendReply,
    toggleReaction,
    currentUserId: myId,
  };
}

// ── Helpers (shared with feed) ─────────────────────────────────────────────

function getTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// ── MessageRow: renders one message (full or compact) ─────────────────────

function MsgRow({
  msg,
  isFull,
  currentUserId,
  onToggleReaction,
}: {
  msg: ChatMessage;
  isFull: boolean;
  currentUserId: string | null;
  onToggleReaction: (msgId: string, emoji: string) => void;
}) {
  return (
    <div
      className={`c-msg ${isFull ? 'c-msg--full' : 'c-msg--compact'}`}
      data-message-id={msg.id}
    >
      <div className="c-msg__avatar">
        {isFull ? (
          <Avatar
            name={msg.authorName}
            src={msg.authorAvatarUrl ?? undefined}
            size="medium"
            appearance="circle"
          />
        ) : (
          <span className="c-msg__compact-ts" aria-hidden="true">
            {getTimeLabel(msg.createdAt)}
          </span>
        )}
      </div>

      <div className="c-msg__body">
        {isFull && (
          <div className="c-msg__meta">
            <span className="c-msg__author">{msg.authorName}</span>
            <time className="c-msg__ts" dateTime={msg.createdAt}>
              {getTimeLabel(msg.createdAt)}
            </time>
          </div>
        )}

        {msg.deletedAt ? (
          <p className="c-msg__text c-msg__text--deleted">This message was deleted.</p>
        ) : (
          <MessageText className="c-msg__text" text={msg.bodyText ?? ''} />
        )}

        {msg.editedAt && !msg.deletedAt && (
          <span className="c-msg__edited">(edited)</span>
        )}

        {msg.reactions.length > 0 && (
          <div className="c-msg__reactions">
            {msg.reactions.map(r => (
              <button
                key={r.emoji}
                className={`c-reaction-pill${r.reactedByMe ? ' c-reaction-pill--mine' : ''}`}
                onClick={() => onToggleReaction(msg.id, r.emoji)}
                aria-label={`${r.emoji}, ${r.count}`}
                aria-pressed={r.reactedByMe}
              >
                <span className="c-reaction-pill__emoji">{r.emoji}</span>
                <span className="c-reaction-pill__count">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ThreadPane ─────────────────────────────────────────────────────────────

function CatyStarIcon({ label: _ }: { label: string }) {
  return (
    <span aria-hidden="true" style={{ fontSize: 'var(--ds-font-size-300)', lineHeight: 1, display: 'flex', alignItems: 'center', fontFamily: 'var(--ds-font-family-body)' }}>✦</span>
  );
}

interface Props {
  conversationId: string;
  parentMessageId: string;
  threadMode: ThreadMode;
  onClose: () => void;
  onAskCaty?: () => void;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ThreadPane({ conversationId, parentMessageId, threadMode, onClose, onAskCaty }: Props) {
  const { parent, replies, isLoading, sendReply, toggleReaction, currentUserId } =
    useThread(conversationId, parentMessageId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const prevCountRef = useRef(0);
  const [alsoInChannel, setAlsoInChannel] = useState(false);

  const isOverlay = threadMode === 'overlay';

  // Focus trap for overlay mode
  useEffect(() => {
    if (!isOverlay) return;
    const pane = paneRef.current;
    if (!pane) return;

    prevFocusRef.current = document.activeElement as HTMLElement;

    const focusable = pane.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusable.length > 0) focusable[0].focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = Array.from(pane.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        el => el.offsetParent !== null,
      );
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handler, true);
    return () => {
      document.removeEventListener('keydown', handler, true);
      const prev = prevFocusRef.current;
      if (prev && document.contains(prev)) prev.focus();
    };
  }, [isOverlay]);

  // Auto-scroll when new replies arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const added = replies.length - prevCountRef.current;
    prevCountRef.current = replies.length;
    if (added > 0) el.scrollTop = el.scrollHeight;
  }, [replies.length]);

  // Scroll to bottom on thread open
  useEffect(() => {
    prevCountRef.current = 0;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [parentMessageId]);

  // Group replies by author continuity
  const replyGroups = groupReplies(replies);

  return (
    <>
      {isOverlay && (
        <div
          className="c-thread-overlay-backdrop"
          data-active="true"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        ref={paneRef}
        className="c-chat-thread-pane c-thread"
        data-mode={isOverlay ? 'overlay' : undefined}
        role="complementary"
        aria-label="Thread"
      >
        {/* Header */}
        <header className="c-thread__hdr">
          <h2 className="c-thread__title">Thread</h2>
          {onAskCaty && (
            <IconButton
              icon={CatyStarIcon}
              label="Summarize thread with Caty"
              appearance="subtle"
              onClick={onAskCaty}
            />
          )}
          <button className="c-thread__hdr-btn" onClick={onClose} aria-label="Close thread">
            <CrossIcon label="Close" LEGACY_size="small" />
          </button>
        </header>

        {/* Parent message */}
        {parent && (
          <div className="c-thread__parent">
            <p className="c-thread__parent-label">Original message</p>
            <MsgRow
              msg={parent}
              isFull
              currentUserId={currentUserId}
              onToggleReaction={toggleReaction}
            />
          </div>
        )}

        {/* Replies */}
        <div
          ref={scrollRef}
          className="c-thread__scroll"
          role="log"
          aria-live="polite"
          aria-atomic="false"
          aria-label="Thread replies"
        >
          {isLoading && (
            <div className="c-feed__skeleton" aria-hidden="true">
              {[['60%', '80%'], ['45%', '70%']].map((lines, i) => (
                <div key={i} className="c-skel-row">
                  <div className="c-skel-avatar" />
                  <div className="c-skel-lines">
                    {lines.map((w, j) => <div key={j} className="c-skel-line" style={{ width: w }} />)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && replies.length === 0 && (
            <div className="c-thread__empty">
              <p>No replies yet. Start the thread below.</p>
            </div>
          )}

          {!isLoading && replies.length > 0 && (
            <>
              <div className="c-thread__reply-count">
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </div>
              {replyGroups.map((group, gi) => (
                <div
                  key={group.key}
                  className="c-msg-group"
                  role="group"
                  aria-label={`Replies from ${group.authorName}`}
                >
                  {group.messages.map((msg, idx) => (
                    <MsgRow
                      key={msg.id}
                      msg={msg}
                      isFull={idx === 0}
                      currentUserId={currentUserId}
                      onToggleReaction={toggleReaction}
                    />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="c-thread__composer">
          <label className="c-thread__also-in-channel">
            <input
              type="checkbox"
              checked={alsoInChannel}
              onChange={e => setAlsoInChannel(e.target.checked)}
            />
            <span>Also send to channel</span>
          </label>
          <MessageComposer
            onSend={async (text, opts) => sendReply(text, { alsoInChannel })}
            conversationTitle="thread"
            conversationId={`${conversationId}:thread:${parentMessageId}`}
            minHeight={60}
          />
        </div>
      </div>
    </>
  );
}

// ── groupReplies ───────────────────────────────────────────────────────────

const GROUP_GAP_MS = 5 * 60_000;

interface ReplyGroup {
  key: string;
  authorId: string;
  authorName: string;
  messages: ChatMessage[];
}

function groupReplies(replies: ChatMessage[]): ReplyGroup[] {
  const groups: ReplyGroup[] = [];
  for (let i = 0; i < replies.length; i++) {
    const msg = replies[i];
    const prev = replies[i - 1];
    const authorChanged = !prev || prev.authorId !== msg.authorId;
    const gapTooLong =
      prev && new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > GROUP_GAP_MS;
    if (authorChanged || gapTooLong) {
      groups.push({ key: `rg-${msg.id}`, authorId: msg.authorId, authorName: msg.authorName, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}
