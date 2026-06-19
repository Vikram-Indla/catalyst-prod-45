/**
 * MessageComposer — uses the canonical Catalyst RichTextEditor (same component
 * as activity-panel comments) so the chat toolbar, Caty icon, @mention, emoji,
 * and slash commands all match the rest of the app.
 *
 * saveLabel="Send" keeps the chat context; onCancel clears the editor.
 */
import React, { useCallback, useRef, useState, forwardRef } from 'react';
import { RichTextEditor } from '@/components/catalyst-detail-views/shared/sections/Description/RichTextEditor';
import { isAdfEmpty, adfToPlainText } from '@/components/shared/rich-text/atlaskit/adfHelpers';
import { useDraft } from '@/hooks/chat/useDraft';
import { validateFile, useUploadAttachment } from '@/hooks/chat/useChatAttachments';

export interface MessageComposerProps {
  conversationTitle?: string;
  conversationId?: string;
  disabled?: boolean;
  onSend: (
    text: string,
    opts?: { adf?: unknown | null; scheduled_for?: string | null },
  ) => void | Promise<void>;
  onAskCaty?: () => void;
  /** Called on every keystroke — use to broadcast typing indicators. */
  onTyping?: () => void;
  /** Last message id created by onSend (passed back so attachments can bind). */
  lastSentMessageId?: string | null;
  /** Min height of the editor shell in px. Defaults to 48 (2 lines). Content auto-grows under the 70vh cap. */
  minHeight?: number;
}

export const MessageComposer = forwardRef<HTMLTextAreaElement, MessageComposerProps>(
  function MessageComposer(
    {
      conversationTitle,
      conversationId,
      disabled,
      onSend,
      onTyping,
      lastSentMessageId,
      minHeight = 48,
    }: MessageComposerProps,
    _ref,
  ) {
    const draft = useDraft(conversationId ?? null);
    const [sending, setSending] = useState(false);
    const [resetKey, setResetKey] = useState(0);
    const uploadAttachment = useUploadAttachment();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    const placeholder = conversationTitle
      ? `Message ${conversationTitle}`
      : 'Type /ai to Ask Caty · @ to mention and notify someone';

    const handleSave = useCallback(
      async (adfJson: string) => {
        if (disabled || sending) return;
        let isEmpty = true;
        let plainText = '';
        try {
          const parsed = JSON.parse(adfJson);
          isEmpty = isAdfEmpty(parsed);
          plainText = adfToPlainText(parsed).trim();
        } catch {
          isEmpty = !adfJson || adfJson.trim().length === 0;
          plainText = adfJson.trim();
        }
        if (isEmpty || !plainText) return;
        setSending(true);
        setSendError(null);
        try {
          await onSend(plainText, { adf: JSON.parse(adfJson), scheduled_for: null });
          draft.clear();
          // Increment key to reset editor to empty state
          setResetKey((k) => k + 1);
        } catch (err) {
          setSendError(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
          setSending(false);
        }
      },
      [disabled, sending, onSend, draft],
    );

    const handleCancel = useCallback(() => {
      draft.clear();
      setResetKey((k) => k + 1);
    }, [draft]);

    const handleFileSelect = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length || !conversationId) return;
        e.target.value = '';
        const valid = files.filter((f) => !validateFile(f));
        if (!valid.length) return;
        setUploading(true);
        try {
          const text = valid.map((f) => f.name).join(', ');
          await onSend(text, { adf: null, scheduled_for: null });
          await new Promise<void>((res) => setTimeout(res, 200));
          if (lastSentMessageId) {
            await Promise.all(
              valid.map((file) =>
                uploadAttachment({
                  conversationId: conversationId!,
                  messageId: lastSentMessageId!,
                  file,
                }),
              ),
            );
          }
        } finally {
          setUploading(false);
        }
      },
      [conversationId, lastSentMessageId, onSend, uploadAttachment],
    );

    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);
    const sendHint = isMac ? '⌘↵ to send · ⇧↵ new line' : 'Ctrl+Enter to send · Shift+Enter new line';

    return (
      <div className="cc-composer" data-cc-compact style={{ position: 'relative' }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.mp4,.webm,.mov,.avi,.zip,.tar,.gz"
        />
        <RichTextEditor
          key={resetKey}
          initialAdf={null}
          onSave={handleSave}
          onCancel={handleCancel}
          onChange={onTyping ? () => onTyping() : undefined}
          placeholder={placeholder}
          saveLabel="Send"
          isSaving={sending || uploading || disabled}
          minHeight={minHeight}
        />
        <div
          aria-live="off"
          style={{
            fontSize: 11,
            color: 'var(--ds-text-subtlest, #6B778C)',
            padding: '2px 4px',
            textAlign: 'right',
            userSelect: 'none',
          }}
        >
          {sendError ? (
            <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>✕ {sendError}</span>
          ) : (
            sendHint
          )}
        </div>
      </div>
    );
  },
);

export default MessageComposer;
