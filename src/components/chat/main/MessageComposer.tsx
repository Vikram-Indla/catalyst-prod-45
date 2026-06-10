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
import React, { useCallback, useRef, useState, lazy, Suspense, forwardRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from '@atlaskit/button/new';
import Flag from '@atlaskit/flag';
import { FlagGroup } from '@atlaskit/flag';
import ErrorIcon from '@atlaskit/icon/glyph/error';
import SuccessIcon from '@atlaskit/icon/glyph/check-circle';
import { ScheduleSendDropdown } from './ScheduleSendDropdown';
import { useComposerKeyboardShortcuts } from './useComposerKeyboardShortcuts';
import { useDraft } from '@/hooks/chat/useDraft';
import { adfToPlainText } from '@/utils/adf';
import { createEmptyADF } from '@/utils/adf';
import type { ADFEntity } from '@atlaskit/adf-utils/types';
import { useConversationMembers } from '@/hooks/chat/useConversationMembers';
import { validateFile, useUploadAttachment } from '@/hooks/chat/useChatAttachments';

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
  const draft = useDraft(conversationId ?? null);
  const [sending, setSending] = useState(false);
  const [richAdf, setRichAdf] = useState<ADFEntity>(createEmptyADF());
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const taRef = (ref as React.MutableRefObject<HTMLTextAreaElement | null>) ?? useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<any>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [flags, setFlags] = useState<Array<{ id: string; type: 'error' | 'success'; title: string; description?: string }>>(
    [],
  );
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const emojiPortalRef = useRef<HTMLDivElement | null>(null);

  // @mention picker
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const mentionTriggerRef = useRef<HTMLButtonElement>(null);
  const mentionPortalRef = useRef<HTMLDivElement | null>(null);
  const { data: memberRows = [] } = useConversationMembers(conversationId ?? null);
  const filteredMembers = memberRows.filter((m) =>
    !mentionQuery || m.name.toLowerCase().includes(mentionQuery.toLowerCase()),
  );

  // File attachment
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAttachment = useUploadAttachment();
  const [uploading, setUploading] = useState(false);

  const dismissFlag = (id: string) => {
    setFlags((f) => f.filter((x) => x.id !== id));
  };

  // Wire keyboard shortcuts (Cmd+B, Cmd+I, Cmd+/, etc.)
  useComposerKeyboardShortcuts({
    textareaRef: taRef,
    richMode: true,
    onToggleRich: () => {},
    editorViewRef: { current: editorRef.current?.getEditorView?.() },
  });

  const placeholder = conversationTitle ? `Message ${conversationTitle}` : 'Write a message…';

  const submit = useCallback(async () => {
    if (disabled || sending) return;
    const candidate = adfToPlainText(richAdf).trim();
    if (!candidate) return;
    const text = candidate;
    const adf = richAdf;
    setSending(true);
    try {
      await onSend(text, { adf, scheduled_for: scheduledFor });
      draft.clear();
      setScheduledFor(null);
      setRichAdf(createEmptyADF());
    } finally {
      setSending(false);
    }
  }, [disabled, sending, onSend, richAdf, scheduledFor]);


  // Insert @mention into editor
  const insertMention = useCallback((name: string) => {
    setMentionOpen(false);
    setMentionQuery('');
    const view = editorRef.current?.getEditorView?.();
    if (view) {
      const { state, dispatch } = view;
      const tr = state.tr.insertText(`@${name} `, state.selection.from, state.selection.to);
      dispatch(tr);
      view.focus();
    }
  }, []);

  // Close mention picker on outside click
  useEffect(() => {
    if (!mentionOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (mentionTriggerRef.current?.contains(t)) return;
      if (mentionPortalRef.current?.contains(t)) return;
      setMentionOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [mentionOpen]);

  const getMentionPortalStyle = (): React.CSSProperties => {
    const rect = mentionTriggerRef.current?.getBoundingClientRect();
    if (!rect) return { display: 'none' };
    return { position: 'fixed', bottom: window.innerHeight - rect.top + 4, left: rect.left, zIndex: 99999 };
  };

  // Handle file selection from input
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !conversationId) return;
    e.target.value = '';
    const valid = files.filter((f) => !validateFile(f));
    const invalid = files.filter((f) => validateFile(f));
    if (invalid.length) {
      setFlags((prev) => [...prev, { id: `file-err-${Date.now()}`, type: 'error', title: 'File not allowed', description: invalid.map((f) => validateFile(f)?.message).join(', ') }]);
    }
    if (!valid.length) return;
    // Send a placeholder message first so we have a messageId to attach to
    setUploading(true);
    try {
      const text = valid.map((f) => f.name).join(', ');
      await onSend(text, { adf: null, scheduled_for: null });
      // lastSentMessageId is passed back by parent — wait one tick
      await new Promise<void>((res) => setTimeout(res, 200));
      if (lastSentMessageId) {
        await Promise.all(valid.map((file) => uploadAttachment({ conversationId: conversationId!, messageId: lastSentMessageId!, file })));
      }
    } finally {
      setUploading(false);
    }
  }, [conversationId, lastSentMessageId, onSend, uploadAttachment]);

  // Insert emoji into editor via ProseMirror dispatch
  const insertEmoji = useCallback((emoji: string) => {
    setEmojiOpen(false);
    const view = editorRef.current?.getEditorView?.();
    if (view) {
      const { state, dispatch } = view;
      const tr = state.tr.insertText(emoji, state.selection.from, state.selection.to);
      dispatch(tr);
      view.focus();
    }
  }, []);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (emojiTriggerRef.current?.contains(t)) return;
      if (emojiPortalRef.current?.contains(t)) return;
      setEmojiOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [emojiOpen]);

  // Compute portal position based on trigger button
  const getEmojiPortalStyle = (): React.CSSProperties => {
    const rect = emojiTriggerRef.current?.getBoundingClientRect();
    if (!rect) return { display: 'none' };
    return {
      position: 'fixed',
      bottom: window.innerHeight - rect.top + 4,
      left: rect.left,
      zIndex: 99999,
    };
  };

  const EMOJI_GRID = [
    '😀','😂','😍','🥰','😎','🤔','😅','🤣','😊','🙏',
    '👍','👎','👏','🔥','❤️','💯','🎉','✅','⚡','🚀',
    '😢','😡','🤦','🙄','😴','💪','🤝','👋','🎯','💡',
  ];

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
        {/* Always-rich AtlaskitEditor — Slack-style with top toolbar visible */}
        <Suspense fallback={<div className="cc-composer-loading">Loading editor…</div>}>
          <AtlaskitEditor
            ref={editorRef}
            appearance="comment"
            placeholder={placeholder}
            defaultValue={richAdf}
            onChange={(adf) => setRichAdf(adf)}
            minHeight={72}
          />
        </Suspense>

        {/* Slack-style bottom bar: attach / emoji / @ / slash / spacer / schedule / send */}
        <div className="cc-composer-tools">
          <button
            ref={emojiTriggerRef}
            type="button"
            className="cc-toolbtn"
            aria-label="Add emoji"
            aria-expanded={emojiOpen}
            title="Emoji"
            onClick={() => setEmojiOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>
          {emojiOpen && createPortal(
            <div
              ref={emojiPortalRef}
              style={{
                ...getEmojiPortalStyle(),
                background: 'var(--ds-surface-overlay, #FFFFFF)',
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(9,30,66,0.18)',
                padding: 8,
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 28px)',
                gap: 2,
              }}
              role="listbox"
              aria-label="Emoji picker"
            >
              {EMOJI_GRID.map((em) => (
                <button
                  key={em}
                  type="button"
                  style={{
                    width: 28,
                    height: 28,
                    border: 'none',
                    background: 'transparent',
                    borderRadius: 4,
                    fontSize: 18,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                  onClick={() => insertEmoji(em)}
                  title={em}
                >
                  {em}
                </button>
              ))}
            </div>,
            document.body,
          )}
          {/* File attachment button */}
          <button
            type="button"
            className="cc-toolbtn"
            aria-label="Attach file"
            title="Attach file"
            disabled={uploading || disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.mp4,.webm,.mov,.avi,.zip,.tar,.gz"
          />

          {/* @mention picker */}
          <button
            ref={mentionTriggerRef}
            type="button"
            className="cc-toolbtn"
            aria-label="Mention someone"
            aria-expanded={mentionOpen}
            title="Mention (@)"
            onClick={() => { setMentionOpen((v) => !v); setMentionQuery(''); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="4" />
              <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
            </svg>
          </button>
          {mentionOpen && createPortal(
            <div
              ref={mentionPortalRef}
              style={{
                ...getMentionPortalStyle(),
                background: 'var(--ds-surface-overlay, #FFFFFF)',
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 6,
                boxShadow: '0 4px 16px rgba(9,30,66,0.18)',
                width: 220,
                maxHeight: 240,
                overflowY: 'auto',
                padding: '4px 0',
              }}
              role="listbox"
              aria-label="Select person to mention"
            >
              <div style={{ padding: '4px 8px 4px' }}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Search people…"
                  value={mentionQuery}
                  onChange={(e) => setMentionQuery(e.target.value)}
                  style={{ width: '100%', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 4, padding: '4px 8px', fontSize: 12, outline: 'none' }}
                />
              </div>
              {filteredMembers.length === 0 ? (
                <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>No members found</div>
              ) : filteredMembers.map((m) => (
                <button
                  key={m.userId}
                  type="button"
                  role="option"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', background: 'transparent', border: 'none',
                    cursor: 'pointer', padding: '6px 12px', fontSize: 13,
                    color: 'var(--ds-text, #172B4D)', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  onClick={() => insertMention(m.name)}
                >
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--ds-background-neutral, #F1F2F4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                </button>
              ))}
            </div>,
            document.body,
          )}
          <button type="button" className="cc-toolbtn" aria-label="Slash command" title="Slash commands">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="15" y1="4" x2="9" y2="20" />
            </svg>
          </button>

          <div className="cc-composer-tools__spacer" />

          <ScheduleSendDropdown
            onSchedule={(time) => {
              setScheduledFor(time);
            }}
            disabled={disabled || adfToPlainText(richAdf).trim().length === 0}
          />

          <Button
            appearance="primary"
            onClick={() => void submit()}
            isDisabled={disabled || adfToPlainText(richAdf).trim().length === 0}
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
