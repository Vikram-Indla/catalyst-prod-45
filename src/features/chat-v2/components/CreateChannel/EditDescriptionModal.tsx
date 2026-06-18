/**
 * EditDescriptionModal — updates chat_conversations.description and emits a
 * system message "set the channel description: <text>".
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { XIcon } from '../shared/Icon';

interface EditDescriptionModalProps {
  conversationId: string;
  currentDescription: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const db = supabase as unknown as { from: (t: string) => any };

export function EditDescriptionModal({
  conversationId,
  currentDescription,
  onClose,
  onSaved,
}: EditDescriptionModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [value, setValue] = useState(currentDescription ?? '');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed !== (currentDescription ?? '').trim() && !submitting;

  const handleSave = async () => {
    if (!canSave) return;
    setSubmitting(true);
    try {
      const { error } = await db
        .from('chat_conversations')
        .update({ description: trimmed })
        .eq('id', conversationId);
      if (error) throw error;
      const { error: msgErr } = await db.from('chat_messages').insert({
        conversation_id: conversationId,
        body_text: `set the channel description: ${trimmed}`,
      });
      if (msgErr) throw msgErr;
      await qc.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      await qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      toast({ title: 'Description updated' });
      onSaved();
      onClose();
    } catch (e) {
      toast({ title: 'Could not save description', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit description"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--cv2-bg-overlay)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '18vh',
        zIndex: 'var(--cv2-modal-z, 1000)' as any,
      }}
    >
      <div
        style={{
          width: 560,
          maxWidth: '90vw',
          background: 'var(--cv2-bg-modal)',
          border: '1px solid var(--cv2-border-strong)',
          borderRadius: 'var(--cv2-radius-lg)',
          boxShadow: 'var(--cv2-shadow-modal)',
          padding: 22,
          fontFamily: 'var(--cv2-font)',
          color: 'var(--cv2-text)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--cv2-text-strong)' }}>
            Edit description
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={closeBtnStyle()}>
            <XIcon size={16} />
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleSave(); } }}
            placeholder="Add a description"
            maxLength={250}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'var(--cv2-bg-input)',
              color: 'var(--cv2-text)',
              border: '1px solid var(--cv2-accent)',
              borderRadius: 'var(--cv2-radius-sm)',
              fontFamily: 'inherit',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--cv2-text-subtle)' }}>
            Let people know what this channel is for.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 36,
              padding: '0 18px',
              background: 'transparent',
              color: 'var(--cv2-text)',
              border: '1px solid var(--cv2-border-strong)',
              borderRadius: 'var(--cv2-radius-sm)',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave}
            style={{
              height: 36,
              padding: '0 18px',
              background: !canSave ? 'var(--cv2-bg-row-hover)' : 'var(--cv2-success, #007A5A)',
              color: !canSave ? 'var(--cv2-text-muted)' : '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--cv2-radius-sm)',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 700,
              cursor: !canSave ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function closeBtnStyle(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: 'var(--cv2-text-subtle)',
    border: 'none',
    borderRadius: 'var(--cv2-radius-sm)',
    cursor: 'pointer',
  };
}
