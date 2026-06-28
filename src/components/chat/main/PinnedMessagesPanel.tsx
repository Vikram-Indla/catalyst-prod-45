/**
 * PinnedMessagesPanel — header affordance listing a conversation's pinned
 * messages (Slack J4/J5). The trigger button shows the pin count and is hidden
 * entirely when the count is 0 (no "0" state). Clicking opens a portal panel
 * (position:fixed + getBoundingClientRect) — the canonical Catalyst pattern
 * because @atlaskit/dropdown-menu collapses to (0,0) inside the dock's
 * position:fixed / overflow:hidden ancestry (CLAUDE.md 2026-06-13).
 *
 * Each item hydrates body preview + author from chat_messages/profiles and
 * jumps to the message via /chat?c=<conv>&m=<message_id> (deep-link support
 * added to ChatFullScreen by the routing change).
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useConversationPins } from '@/hooks/chat/usePinsBookmarks';

const db = supabase as unknown as { from: (table: string) => any };

interface PinnedDetail {
  message_id: string;
  body_text: string | null;
  author_name: string | null;
  pinned_at: string;
}

function usePinnedDetails(conversationId: string, messageIds: string[]) {
  const key = messageIds.slice().sort().join(',');
  return useQuery({
    queryKey: ['chat', 'pin-details', conversationId, key],
    enabled: messageIds.length > 0,
    queryFn: async () => {
      const { data: msgRows } = await db
        .from('chat_messages')
        .select('id, body_text, author_id')
        .in('id', messageIds);
      const msgs = (msgRows ?? []) as Array<{
        id: string; body_text: string | null; author_id: string | null;
      }>;

      const authorIds = Array.from(
        new Set(msgs.map(m => m.author_id).filter((x): x is string => !!x)),
      );
      const nameById = new Map<string, string>();
      if (authorIds.length > 0) {
        const { data: profRows } = await db
          .from('profiles')
          .select('id, full_name')
          .in('id', authorIds);
        for (const p of (profRows ?? []) as Array<{ id: string; full_name: string | null }>) {
          if (p.full_name) nameById.set(p.id, p.full_name);
        }
      }

      const byId = new Map<string, { body_text: string | null; author_name: string | null }>();
      for (const m of msgs) {
        byId.set(m.id, {
          body_text: m.body_text,
          author_name: m.author_id ? (nameById.get(m.author_id) ?? null) : null,
        });
      }
      return byId;
    },
  });
}

const PinIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);

export interface PinnedMessagesPanelProps {
  conversationId: string;
  /** Optional in-pane jump handler. When absent, navigates to /chat?c=&m=. */
  onJump?: (messageId: string) => void;
}

export function PinnedMessagesPanel({ conversationId, onJump }: PinnedMessagesPanelProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const { data: pins } = useConversationPins(conversationId);
  const pinList = pins ?? [];
  const messageIds = pinList.map(p => p.message_id);
  const { data: detailMap } = usePinnedDetails(conversationId, open ? messageIds : []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  // Zero state: hide the button entirely (no "0").
  if (pinList.length === 0) return null;

  const jump = (messageId: string) => {
    setOpen(false);
    if (onJump) onJump(messageId);
    else navigate(`/chat?c=${conversationId}&m=${messageId}`);
  };

  const rect = triggerRef.current?.getBoundingClientRect();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="cc-iconbtn"
        aria-label={`${pinList.length} pinned ${pinList.length === 1 ? 'message' : 'messages'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Pinned messages"
        onClick={() => setOpen(v => !v)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        <PinIcon />
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--c-chat-text-subtle, var(--ds-text-subtle, #44546F))' }}>
          {pinList.length}
        </span>
      </button>

      {open && rect && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Pinned messages"
          style={{
            position: 'fixed',
            top: rect.bottom + 4,
            right: Math.max(8, window.innerWidth - rect.right),
            width: 320,
            maxHeight: 400,
            overflowY: 'auto',
            background: 'var(--c-chat-surface-raised, var(--ds-surface-overlay, #FFFFFF))',
            border: '1px solid var(--c-chat-border, var(--ds-border, #DFE1E6))',
            borderRadius: 8,
            boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))',
            padding: 8,
            zIndex: 10000,
          }}
        >
          <div
            style={{
              padding: '4px 8px 8px',
              fontSize: 'var(--ds-font-size-100)',
              fontWeight: 600,
              textTransform: 'none',
              color: 'var(--c-chat-text-subtle, var(--ds-text-subtle, #44546F))',
            }}
          >
            Pinned messages
          </div>
          {pinList.map(p => {
            const d = detailMap?.get(p.message_id);
            const preview = d?.body_text?.trim() || 'Message';
            const author = d?.author_name;
            return (
              <button
                key={p.message_id}
                type="button"
                role="menuitem"
                onClick={() => jump(p.message_id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: 8,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'var(--c-chat-hover-bg, var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06)))';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                {author && (
                  <span style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--c-chat-text, var(--ds-text, #172B4D))' }}>
                    {author}
                  </span>
                )}
                <span
                  style={{
                    display: 'block',
                    fontSize: 'var(--ds-font-size-300)',
                    color: 'var(--c-chat-text-subtle, var(--ds-text-subtle, #44546F))',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {preview}
                </span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}

export default PinnedMessagesPanel;
