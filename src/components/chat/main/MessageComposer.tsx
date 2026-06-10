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
import { useUploadAttachment, useBatchUploadAttachments, validateFile, FileValidationError } from '@/hooks/chat/useChatAttachments';
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
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null); // AtlaskitEditorRef
  const composerRef = useRef<HTMLDivElement>(null);
  const uploadAttachment = useUploadAttachment();
  const batchUploadAttachments = useBatchUploadAttachments();
  const [showSlashPalette, setShowSlashPalette] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState<Record<string, number>>({});
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

  const handleFileUpload = useCallback(
    async (files: File[]) => {
      if (!conversationId || !lastSentMessageId) {
        if (files.length > 0 && conversationId) {
          await onSend(`📎 ${files.map((f) => f.name).join(', ')}`);
        }
        return;
      }

      const validFiles: File[] = [];
      const errors: FileValidationError[] = [];

      for (const file of files) {
        const err = validateFile(file);
        if (err) {
          errors.push(err);
        } else {
          validFiles.push(file);
        }
      }

      errors.forEach((err) => {
        addFlag('error', `Cannot upload ${err.filename}`, err.message);
      });

      if (validFiles.length === 0) return;

      setUploading((prev) => ({
        ...prev,
        ...Object.fromEntries(validFiles.map((f) => [f.name, 0])),
      }));

      const attachments = await batchUploadAttachments({
        conversationId,
        messageId: lastSentMessageId,
        files: validFiles,
        onProgress: (filename, percent) => {
          setUploading((prev) => ({ ...prev, [filename]: percent }));
        },
        onError: (err) => {
          addFlag('error', `Failed to upload ${err.filename}`, err.message);
        },
      });

      setUploading((prev) => {
        const next = { ...prev };
        validFiles.forEach((f) => delete next[f.name]);
        return next;
      });

      if (attachments.length > 0) {
        addFlag(
          'success',
          `${attachments.length} file${attachments.length === 1 ? '' : 's'} uploaded`,
          `Attached to your message`,
        );
      }
    },
    [conversationId, lastSentMessageId, onSend, batchUploadAttachments],
  );

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (fileRef.current) fileRef.current.value = '';
    await handleFileUpload(files);
  };

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement | HTMLDivElement>) => {
      const files = e.clipboardData?.files ? Array.from(e.clipboardData.files) : [];
      if (files.length > 0) {
        e.preventDefault();
        void handleFileUpload(files);
      }
    },
    [handleFileUpload],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget === composerRef.current) {
      setDragActive(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
      if (files.length > 0) {
        void handleFileUpload(files);
      }
    },
    [handleFileUpload],
  );

  return (
    <div
      ref={composerRef}
      className="cc-composer"
      style={{
        position: 'relative',
        backgroundColor: dragActive ? 'var(--ds-background-neutral-subtle, #F7F8F9)' : undefined,
        borderRadius: dragActive ? 4 : 0,
        transition: 'background-color 0.2s',
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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

      {dragActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: '2px dashed var(--ds-background-information-bold, #0C66E4)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(12, 102, 228, 0.04)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--ds-text, #172B4D)',
              textAlign: 'center',
            }}
          >
            Drop files to attach
          </div>
        </div>
      )}

      <div className="cc-composer-box">
        {/* Upload progress indicators */}
        {Object.keys(uploading).length > 0 && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
            {Object.entries(uploading).map(([filename, percent]) => (
              <div key={filename} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, marginBottom: 4, color: 'var(--ds-text-subtle, #626F86)' }}>
                  {filename} ({percent}%)
                </div>
                <div
                  style={{
                    height: 4,
                    backgroundColor: 'var(--ds-background-neutral, #F1F2F4)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${percent}%`,
                      backgroundColor: 'var(--ds-background-success-bold, #216E4E)',
                      transition: 'width 0.2s',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

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
                onPaste={(e: any) => onPaste(e as React.ClipboardEvent<HTMLDivElement>)}
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
            onPaste={onPaste}
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
        <input
          ref={fileRef}
          type="file"
          multiple
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
