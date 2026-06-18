/**
 * EditScheduledMessagePanel — mounted above the composer when the user
 * clicks a row on the Scheduled tab. The panel shows the queued
 * message body and three actions:
 *  - Edit: deletes the chat_messages row + writes the body to
 *    chat_message_drafts for this conversation so the composer
 *    re-seeds. Dismisses on completion.
 *  - Send now: flips delivered_at to now() so the message becomes
 *    visible to all members.
 *  - Delete: hard-deletes the chat_messages row.
 *
 * Esc dismisses without action.
 */
import React, { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import type { ScheduledMessage } from '../../hooks/useMyScheduledMessages';
import { formatRelativeSend } from './ScheduledRow';
import {
  isDraftsTableAvailable,
  isMissingTableError,
  markDraftsTableMissing,
} from '../../lib/chatDraftsFlags';
import { XIcon } from '../shared/Icon';

const db = supabase as unknown as { from: (t: string) => any };

interface EditScheduledMessagePanelProps {
  message: ScheduledMessage;
  onDismiss: () => void;
  /** Called after Edit succeeds — the message has been removed from
   *  the scheduled queue and its body persisted as a draft for the
   *  current conversation. The shell can use this to invalidate or
   *  re-mount the composer if it caches initialDraft. */
  onAfterEdit?: () => void;
}

export function EditScheduledMessagePanel({
  message,
  onDismiss,
  onAfterEdit,
}: EditScheduledMessagePanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    if (!user?.id) return;
    queryClient.invalidateQueries({ queryKey: ['chat-v2', 'my-scheduled', user.id] });
    queryClient.invalidateQueries({
      queryKey: ['chat-v2', 'my-scheduled-count', user.id],
    });
    queryClient.invalidateQueries({
      queryKey: ['chat', 'messages', message.conversationId],
    });
    queryClient.invalidateQueries({ queryKey: ['chat-v2', 'my-sent', user.id] });
  }, [queryClient, user?.id, message.conversationId]);

  const handleDelete = useCallback(async () => {
    if (!user?.id) return;
    try {
      await db
        .from('chat_messages')
        .delete()
        .eq('id', message.id)
        .eq('author_id', user.id)
        .is('delivered_at', null);
    } catch (err) {
      console.warn('[chat-v2] scheduled delete failed', err);
    }
    invalidateAll();
    onDismiss();
  }, [user?.id, message.id, invalidateAll, onDismiss]);

  const handleSendNow = useCallback(async () => {
    if (!user?.id) return;
    try {
      const now = new Date().toISOString();
      await db
        .from('chat_messages')
        .update({ scheduled_for: null, delivered_at: now })
        .eq('id', message.id)
        .eq('author_id', user.id);
    } catch (err) {
      console.warn('[chat-v2] scheduled send-now failed', err);
    }
    invalidateAll();
    onDismiss();
  }, [user?.id, message.id, invalidateAll, onDismiss]);

  const handleEdit = useCallback(async () => {
    if (!user?.id) return;
    // 1. Delete the scheduled row.
    try {
      await db
        .from('chat_messages')
        .delete()
        .eq('id', message.id)
        .eq('author_id', user.id)
        .is('delivered_at', null);
    } catch (err) {
      console.warn('[chat-v2] scheduled edit-delete failed', err);
      onDismiss();
      return;
    }
    // 2. Persist its body as a draft for the same conversation, so the
    //    composer re-seeds when it remounts.
    if (isDraftsTableAvailable()) {
      try {
        await db.from('chat_message_drafts').upsert(
          {
            user_id: user.id,
            conversation_id: message.conversationId,
            body_md: message.bodyMd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,conversation_id' },
        );
        queryClient.setQueryData(
          ['chat-v2', 'draft', user.id, message.conversationId],
          { body_md: message.bodyMd, updated_at: new Date().toISOString() },
        );
      } catch (err) {
        if (isMissingTableError(err)) markDraftsTableMissing();
      }
    }
    invalidateAll();
    onAfterEdit?.();
    onDismiss();
  }, [
    user?.id,
    message.id,
    message.conversationId,
    message.bodyMd,
    queryClient,
    invalidateAll,
    onAfterEdit,
    onDismiss,
  ]);

  // Esc dismisses (capture phase so a parent doesn't swallow it first).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onDismiss]);

  return (
    <div
      role="region"
      aria-label="Edit scheduled message"
      style={{
        margin: '0 0 8px',
        padding: '12px 14px',
        background: 'var(--cv2-bg-row-hover)',
        border: '1px solid var(--cv2-border)',
        borderRadius: 8,
        fontFamily: 'var(--cv2-font)',
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 22,
          height: 22,
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: 'var(--cv2-text-subtle)',
          cursor: 'pointer',
          borderRadius: 4,
        }}
      >
        <XIcon size={12} />
      </button>
      <div
        style={{
          fontSize: 12,
          color: 'var(--cv2-text-subtle)',
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        Scheduled to send {formatRelativeSend(message.scheduledFor)}
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--cv2-text)',
          marginBottom: 10,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 140,
          overflowY: 'auto',
        }}
      >
        {message.bodyMd || '(empty)'}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => { void handleEdit(); }}
          style={primaryBtn}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => { void handleSendNow(); }}
          style={subtleBtn}
        >
          Send now
        </button>
        <button
          type="button"
          onClick={() => { void handleDelete(); }}
          style={dangerBtn}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid var(--cv2-accent)',
  background: 'var(--cv2-accent)',
  color: '#FFFFFF',
  fontFamily: 'var(--cv2-font)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const subtleBtn: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid var(--cv2-border)',
  background: 'transparent',
  color: 'var(--cv2-text)',
  fontFamily: 'var(--cv2-font)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const dangerBtn: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid var(--cv2-border)',
  background: 'transparent',
  color: 'var(--cv2-danger, #E01E5A)',
  fontFamily: 'var(--cv2-font)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};
