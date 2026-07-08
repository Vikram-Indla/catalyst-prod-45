/**
 * MessageComposer — uses the canonical Catalyst RichTextEditor (same component
 * as activity-panel comments) so the chat toolbar, Caty icon, @mention, emoji,
 * and slash commands all match the rest of the app.
 *
 * saveLabel="Send" keeps the chat context; onCancel clears the editor.
 */
import React, { useCallback, useEffect, useRef, useState, forwardRef } from 'react';
import type { Editor } from '@tiptap/react';
import Button, { IconButton } from '@atlaskit/button/new';
import AttachmentIcon from '@atlaskit/icon/core/attachment';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Spinner from '@atlaskit/spinner';
import { VoiceMicButton } from '@/features/voice-flow';
import { useTranslateSettings } from '@/features/voice-flow/useVoiceSettings';
import { isTranslatableArabic } from '@/lib/i18n/detectScript';
import { supabase } from '@/integrations/supabase/client';
import { ComposerTranslateBanner } from './ComposerTranslateBanner';
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
    // CatyFlow dictation target — the Tiptap contenteditable root
    // (CAT-VOICE-UX-PREMIUM-20260708-001 S2a). Ref, not state: the mic
    // button resolves it lazily at click time.
    const editorElRef = useRef<HTMLElement | null>(null);
    const handleEditorReady = useCallback((editor: Editor | null) => {
      const el = editor ? (editor.view.dom as HTMLElement) : null;
      editorElRef.current = el;
      // Bidi hygiene (S5): base direction follows the first strong character
      // as the user types — never hardcoded on a mixed AR/EN composer.
      el?.setAttribute('dir', 'auto');
    }, []);

    // ── Write-side AR→EN translate mode (S4b) ──────────────────────────
    const { mode: translateMode, setMode: setTranslateMode } = useTranslateSettings();
    const [hasArabic, setHasArabic] = useState(false);
    const [translateArmed, setTranslateArmed] = useState(false);
    const [preview, setPreview] = useState<{ original: string; adf: unknown } | null>(null);
    const [previewTranslated, setPreviewTranslated] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const refreshArabic = useCallback(() => {
      const next = isTranslatableArabic(editorElRef.current?.textContent ?? '');
      setHasArabic((prev) => (prev === next ? prev : next));
    }, []);

    // Auto-arm in Always mode the moment Arabic appears; disarm when it goes.
    useEffect(() => {
      if (!hasArabic) setTranslateArmed(false);
      else if (translateMode === 'always') setTranslateArmed(true);
    }, [hasArabic, translateMode]);

    // Editor resets to empty after a send — clear the gate with it.
    useEffect(() => {
      setHasArabic(false);
    }, [resetKey]);

    // Translate for the preview when it opens. Failure never blocks the send
    // path — "Send original" is always available.
    useEffect(() => {
      if (!preview) return;
      let stale = false;
      setPreviewTranslated(null);
      setPreviewError(null);
      void supabase.functions
        .invoke('ai-translate-field', { body: { text: preview.original, target: 'en' } })
        .then(({ data, error }) => {
          if (stale) return;
          const translated = (data as { translated?: string } | null)?.translated;
          if (error || !translated) setPreviewError(error?.message ?? 'Translation failed');
          else setPreviewTranslated(translated);
        });
      return () => {
        stale = true;
      };
    }, [preview]);

    const placeholder = conversationTitle
      ? `Message ${conversationTitle}`
      : 'Type /ai to Ask Caty · @ to mention and notify someone';

    const doSend = useCallback(
      async (text: string, adf: unknown | null) => {
        setSending(true);
        setSendError(null);
        try {
          await onSend(text, { adf, scheduled_for: null });
          draft.clear();
          // Increment key to reset editor to empty state
          setResetKey((k) => k + 1);
        } catch (err) {
          setSendError(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
          setSending(false);
        }
      },
      [onSend, draft],
    );

    const handleSave = useCallback(
      async (adfJson: string) => {
        if (disabled || sending) return;
        let isEmpty = true;
        let plainText = '';
        let parsedAdf: unknown | null = null;
        try {
          const parsed = JSON.parse(adfJson);
          parsedAdf = parsed;
          isEmpty = isAdfEmpty(parsed);
          plainText = adfToPlainText(parsed).trim();
        } catch {
          isEmpty = !adfJson || adfJson.trim().length === 0;
          plainText = adfJson.trim();
        }
        if (isEmpty || !plainText) return;
        // Armed AR→EN: preview before anything leaves the composer — the
        // translation is applied only after explicit confirmation.
        if (translateArmed && translateMode !== 'never' && isTranslatableArabic(plainText)) {
          setPreview({ original: plainText, adf: parsedAdf });
          return;
        }
        await doSend(plainText, parsedAdf);
      },
      [disabled, sending, doSend, translateArmed, translateMode],
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
      <div className="cc-composer" data-cc-compact>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.mp4,.webm,.mov,.avi,.zip,.tar,.gz"
        />
        {hasArabic && translateMode !== 'never' && (
          <ComposerTranslateBanner
            mode={translateMode}
            onModeChange={setTranslateMode}
            armed={translateArmed}
            onArmedChange={setTranslateArmed}
          />
        )}
        <RichTextEditor
          key={resetKey}
          initialAdf={null}
          onSave={handleSave}
          onChange={() => {
            onTyping?.();
            refreshArabic();
          }}
          onEditorReady={handleEditorReady}
          placeholder={placeholder}
          saveLabel="Send"
          isSaving={sending || uploading || disabled}
          minHeight={minHeight}
          hideMicButton
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div aria-live="off" className="cc-composer__hint" style={{ flex: 1 }}>
            {sendError ? (
              <span className="cc-composer__hint--error">✕ {sendError}</span>
            ) : (
              sendHint
            )}
          </div>
          {conversationId && (
            <IconButton
              icon={AttachmentIcon}
              label="Attach files"
              appearance="subtle"
              isDisabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
            />
          )}
          <VoiceMicButton getTargetElement={() => editorElRef.current} />
        </div>

        {/* AR→EN preview-before-send — the translation is never applied
            blind; original always remains one click away. */}
        <ModalTransition>
          {preview && (
            <ModalDialog onClose={() => setPreview(null)} width="medium">
              <ModalHeader>
                <ModalTitle>Send as English?</ModalTitle>
              </ModalHeader>
              <ModalBody>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>
                      Original
                    </div>
                    <div
                      dir="auto"
                      style={{
                        font: 'var(--ds-font-body)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        unicodeBidi: 'plaintext',
                        borderInlineStart: '2px solid var(--ds-border)',
                        paddingInlineStart: 8,
                      }}
                    >
                      {preview.original}
                    </div>
                  </div>
                  <div>
                    <div style={{ font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>
                      English
                    </div>
                    {previewError ? (
                      <div style={{ font: 'var(--ds-font-body)', color: 'var(--ds-text-danger)' }}>
                        {previewError} — you can still send the original.
                      </div>
                    ) : previewTranslated ? (
                      <div
                        dir="auto"
                        style={{
                          font: 'var(--ds-font-body)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          borderInlineStart: '2px solid var(--ds-border-accent-magenta)',
                          paddingInlineStart: 8,
                        }}
                      >
                        {previewTranslated}
                      </div>
                    ) : (
                      <Spinner size="small" />
                    )}
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button appearance="subtle" onClick={() => setPreview(null)}>
                  Keep editing
                </Button>
                <Button
                  appearance="subtle"
                  onClick={() => {
                    const p = preview;
                    setPreview(null);
                    void doSend(p.original, p.adf);
                  }}
                >
                  Send original
                </Button>
                <Button
                  appearance="primary"
                  isDisabled={!previewTranslated}
                  onClick={() => {
                    const translated = previewTranslated;
                    setPreview(null);
                    if (translated) void doSend(translated, null);
                  }}
                >
                  Send English
                </Button>
              </ModalFooter>
            </ModalDialog>
          )}
        </ModalTransition>
      </div>
    );
  },
);

export default MessageComposer;
