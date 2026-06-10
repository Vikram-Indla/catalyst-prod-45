/**
 * MessageComposer — bottom composer of the active conversation. A styled
 * auto-growing textarea plus a tool row (attach / emoji / @ mention / slash),
 * the static-rainbow "Ask Caty" CTA, and a primary Send button.
 *
 * Send is @atlaskit/button (primary). The textarea is intentionally NOT
 * @atlaskit/textfield (per spec — textfield is single-line).
 *
 * File upload methods: (1) button click, (2) paste (Ctrl+V / Cmd+V), (3) drag-drop.
 * Files are validated, uploaded to Supabase Storage, and attached to the last sent message.
 *
 * Forwards ref to the textarea element so callers can focus it programmatically.
 */
import React, { useCallback, useRef, useState, lazy, Suspense, useEffect, forwardRef } from 'react';
import Button from '@atlaskit/button/new';
import Flag from '@atlaskit/flag';
import { FlagGroup } from '@atlaskit/flag';
import ErrorIcon from '@atlaskit/icon/glyph/error';
import SuccessIcon from '@atlaskit/icon/glyph/check-circle';
import { MentionPicker } from './MentionPicker';
import { SlashCommandPalette } from './SlashCommandPalette';
import { ScheduleSendDropdown } from './ScheduleSendDropdown';
import { useComposerKeyboardShortcuts } from './useComposerKeyboardShortcuts';
import { useDraft } from '@/hooks/chat/useDraft';
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
    opts?: { adf?: unknown | null; scheduled_for?: string | null },
  ) => void | Promise<void>;
  onAskCaty?: () => void;
  /** Last message id created by onSend (passed back so attachments can bind). */
  lastSentMessageId?: string | null;
}

export const MessageComposer = forwardRef<HTMLTextAreaElement, MessageComposerProps>(
  function MessageComposer(
    {
      conversationTitle,
      conversationId,
      disabled,
      onSend,
      onAskCaty,
      lastSentMessageId,
    }: MessageComposerProps,
    ref,
  ) {
  // Drafts persist per conversation in localStorage. Clear on send.
  const draft = useDraft(conversationId ?? null);
  const value = draft.value;
  const setValue = draft.setValue;
  const [sending, setSending] = useState(false);
  const [richMode, setRichMode] = useState(false);
  const [richAdf, setRichAdf] = useState<ADFEntity>(createEmptyADF());
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const taRef = (ref as React.MutableRefObject<HTMLTextAreaElement | null>) ?? useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<any>(null); // AtlaskitEditorRef
  const composerRef = useRef<HTMLDivElement>(null);
  const [showSlashPalette, setShowSlashPalette] = useState(false);
  const [flags, setFlags] = useState<Array<{ id: string; type: 'error' | 'success'; title: string; description?: string }>>(
    [],
  );

  const addFlag = (type: 'error' | 'success', title: string, description?: string) => {
    const id = `flag-${Date.now()}-${Math.random()}`;
    setFlags((f) => [...f, { id, type, title, description }]);
    if (type === 'success') {
      setTimeout(() => {
        setFlags((f) => f.filter((x) => x.id !== id));
      }, 3000);
    }
  };

  const dismissFlag = (id: string) => {
    setFlags((f) => f.filter((x) => x.id !== id));
  };

  // Wire keyboard shortcuts (Cmd+B, Cmd+I, Cmd+/, etc.)
  useComposerKeyboardShortcuts({
    textareaRef: taRef,
    richMode,
    onToggleRich: () => setRichMode(m => !m),
    editorViewRef: richMode ? { current: editorRef.current?.getEditorView?.() } : undefined,
  });

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
      await onSend(text, { adf, scheduled_for: scheduledFor });
      draft.clear();
      setScheduledFor(null);
      if (richMode) setRichAdf(createEmptyADF());
      requestAnimationFrame(() => {
        if (taRef.current) taRef.current.style.height = 'auto';
      });
    } finally {
      setSending(false);
    }
  }, [value, disabled, sending, onSend, richMode, richAdf, scheduledFor]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
      return;
    }

    // Slash palette navigation and selection (only when open — checked via SlashCommandPalette)
    // These are handled by SlashCommandPalette's own useEffect, so we don't duplicate here.
    // Tab for indent/outdent in lists — deferred (currently plain textarea, not rich text)
  };

  const insert = (snippet: string) => {
    setValue(v => (v ? `${v}${snippet}` : snippet));
    requestAnimationFrame(() => {
      taRef.current?.focus();
      autoGrow();
    });
  };

  // Attachments are banned in Catalyst Chat (native-to-Catalyst decision,
  // 2026-06-10) — no picker, no paste-upload, no drag-drop. Tickets are the
  // attachment model.
  return (
    <div
      ref={composerRef}
      className="cc-composer"
      style={{ position: 'relative' }}
    >
      <FlagGroup onDismissed={(id) => dismissFlag(id)}>
        {flags.map((flag) => (
          <Flag
            key={flag.id}
            id={flag.id}
            icon={flag.type === 'error' ? <ErrorIcon label="Error" /> : <SuccessIcon label="Success" />}
            title={flag.title}
            description={flag.description}
            appearance={flag.type === 'error' ? 'error' : 'success'}
          />
        ))}
      </FlagGroup>

      <div className="cc-composer-box">
        {richMode ? (
          <Suspense fallback={<div style={{ padding: 12, fontSize: 13, color: 'var(--ds-text-subtle, #44546F)' }}>Loading editor…</div>}>
            <div style={{ padding: 4 }}>
              <AtlaskitEditor
                ref={editorRef}
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
        {!richMode && (
          <>
            <MentionPicker textareaRef={taRef} value={value} onChange={setValue} />
            <SlashCommandPalette
              textareaRef={taRef}
              value={value}
              onChange={setValue}
              onClose={() => setShowSlashPalette(false)}
            />
          </>
        )}
        {/* Attachments are banned in Catalyst Chat (native-to-Catalyst decision,
            2026-06-10) — everything links to tickets instead. No file input. */}
        <div className="cc-composer-tools">
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

          {/* Rich text toggle — single subtle icon button, sized like the
              other tool buttons. The previous bold "Aa" text was twice as
              large as siblings and read as a brand element. Use a script
              "A" icon so it sits inline with attach/emoji/@/slash. */}
          <button
            type="button"
            className="cc-toolbtn"
            aria-label={richMode ? 'Switch to plain text' : 'Switch to rich text'}
            title={richMode ? 'Plain text' : 'Rich text'}
            onClick={() => setRichMode((m) => !m)}
            style={{
              color: richMode ? 'var(--ds-icon-brand, #0C66E4)' : undefined,
            }}
          >
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M5 19h14M7 15l5-10 5 10M9 11h6" />
            </svg>
          </button>

          <div className="cc-composer-tools__spacer" />

          {/* Ask Caty pill REMOVED from composer (2026-06-08 design directive).
              Enterprise chat does not surface an AI affordance inside every
              message draft. AI access remains via the dock's top "Ask Caty"
              tab and the dedicated AI sidekick panel. */}

          <ScheduleSendDropdown
            onSchedule={(time) => {
              setScheduledFor(time);
            }}
            disabled={
              disabled ||
              (richMode
                ? adfToPlainText(richAdf).trim().length === 0
                : !value.trim())
            }
          />

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
},
);

export default MessageComposer;
