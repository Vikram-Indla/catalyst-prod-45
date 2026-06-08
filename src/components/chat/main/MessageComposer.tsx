/**
 * MessageComposer — bottom composer of the active conversation. A styled
 * auto-growing textarea plus a tool row (attach / emoji / @ mention / slash),
 * the static-rainbow "Ask Caty" CTA, and a primary Send button.
 *
 * Send is @atlaskit/button (primary). The textarea is intentionally NOT
 * @atlaskit/textfield (per spec — textfield is single-line).
 */
import React, { useCallback, useRef, useState, lazy, Suspense } from 'react';
import Button from '@atlaskit/button/new';
import { MentionPicker } from './MentionPicker';
import { useUploadAttachment } from '@/hooks/chat/useChatAttachments';
import { adfToPlainText } from '@/utils/adf';
import { createEmptyADF } from '@/utils/adf';
import type { ADFEntity } from '@atlaskit/adf-utils/types';

// Lazy-loaded — avoids dragging @atlaskit/editor-core into the dock bundle.
const AtlaskitEditor = lazy(() => import('@/components/shared/AtlaskitEditor'));

export interface MessageComposerProps {
  conversationTitle?: string;
  conversationId?: string;
  disabled?: boolean;
  onSend: (
    text: string,
    opts?: { adf?: unknown | null },
  ) => void | Promise<void>;
  onAskCaty?: () => void;
  /** Last message id created by onSend (passed back so attachments can bind). */
  lastSentMessageId?: string | null;
}

export function MessageComposer({
  conversationTitle,
  conversationId,
  disabled,
  onSend,
  onAskCaty,
  lastSentMessageId,
}: MessageComposerProps) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [richMode, setRichMode] = useState(false);
  const [richAdf, setRichAdf] = useState<ADFEntity>(createEmptyADF());
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadAttachment = useUploadAttachment();

  const placeholder = conversationTitle ? `Message ${conversationTitle}` : 'Write a message…';

  const autoGrow = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const submit = useCallback(async () => {
    if (disabled || sending) return;
    let text = value.trim();
    let adf: ADFEntity | null = null;
    if (richMode) {
      const candidate = adfToPlainText(richAdf).trim();
      if (!candidate) return;
      text = candidate;
      adf = richAdf;
    } else if (!text) {
      return;
    }
    setSending(true);
    try {
      await onSend(text, { adf });
      setValue('');
      if (richMode) setRichAdf(createEmptyADF());
      requestAnimationFrame(() => {
        if (taRef.current) taRef.current.style.height = 'auto';
      });
    } finally {
      setSending(false);
    }
  }, [value, disabled, sending, onSend, richMode, richAdf]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const insert = (snippet: string) => {
    setValue(v => (v ? `${v}${snippet}` : snippet));
    requestAnimationFrame(() => {
      taRef.current?.focus();
      autoGrow();
    });
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId || !lastSentMessageId) {
      // No message anchor yet — fall back to sending an empty message first.
      if (file && conversationId) {
        await onSend(`📎 ${file.name}`);
        // The caller updates lastSentMessageId on next render; user can re-pick.
      }
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    await uploadAttachment({
      conversationId,
      messageId: lastSentMessageId,
      file,
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="cc-composer" style={{ position: 'relative' }}>
      <div className="cc-composer-box">
        {richMode ? (
          <Suspense fallback={<div style={{ padding: 12, fontSize: 13, color: 'var(--ds-text-subtle, #44546F)' }}>Loading editor…</div>}>
            <div style={{ padding: 4 }}>
              <AtlaskitEditor
                appearance="comment"
                placeholder={placeholder}
                defaultValue={richAdf}
                onChange={(adf) => setRichAdf(adf)}
                minHeight={80}
              />
            </div>
          </Suspense>
        ) : (
          <textarea
            ref={taRef}
            className="cc-composer-input"
            placeholder={placeholder}
            value={value}
            rows={1}
            disabled={disabled}
            onChange={e => {
              setValue(e.target.value);
              autoGrow();
            }}
            onKeyDown={onKeyDown}
            aria-label={placeholder}
          />
        )}
        {!richMode && <MentionPicker textareaRef={taRef} value={value} onChange={setValue} />}
        <input
          ref={fileRef}
          type="file"
          style={{ display: 'none' }}
          onChange={onPickFile}
        />
        <div className="cc-composer-tools">
          <button
            type="button"
            className="cc-toolbtn"
            aria-label="Attach file"
            onClick={() => fileRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21.4 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.48" />
            </svg>
          </button>
          <button type="button" className="cc-toolbtn" aria-label="Add emoji">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>
          <button type="button" className="cc-toolbtn" aria-label="Mention someone" onClick={() => insert('@')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="4" />
              <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
            </svg>
          </button>
          <button type="button" className="cc-toolbtn" aria-label="Slash command" onClick={() => insert('/')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="15" y1="4" x2="9" y2="20" />
            </svg>
          </button>

          <button
            type="button"
            className="cc-toolbtn"
            aria-label={richMode ? 'Switch to plain text' : 'Switch to rich text'}
            title={richMode ? 'Plain text' : 'Rich text (Aa)'}
            onClick={() => setRichMode((m) => !m)}
            style={{
              background: richMode ? 'var(--ds-background-selected, #E9F2FE)' : undefined,
              color: richMode ? 'var(--ds-text-selected, #0C66E4)' : undefined,
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Aa
          </button>

          <div className="cc-composer-tools__spacer" />

          <button type="button" className="cc-caty-btn is-sm" onClick={onAskCaty} aria-label="Ask Caty">
            <span className="cc-caty-btn__inner">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--ds-icon-discovery, #6E5DC6)" strokeWidth={2}>
                <path d="M12 3l1.9 5.8L20 10l-5.1 1.9L12 18l-1.9-6.1L5 10l5.1-1.2z" />
              </svg>
              Ask Caty
            </span>
          </button>

          <Button
            appearance="primary"
            onClick={() => void submit()}
            isDisabled={
              disabled ||
              (richMode
                ? adfToPlainText(richAdf).trim().length === 0
                : !value.trim())
            }
            isLoading={sending}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MessageComposer;
