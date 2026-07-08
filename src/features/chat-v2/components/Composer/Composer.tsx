import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ComposerToolbar, type FormatAction } from './ComposerToolbar';
import { ComposerEditor, type ComposerEditorHandle } from './ComposerEditor';
import { ComposerFooter } from './ComposerFooter';
import { NotificationBanner } from '../MessagePanel/NotificationBanner';
import { EmojiPicker } from '../EmojiPicker/EmojiPicker';
import { MentionPicker, type MentionEntry } from '../MentionPicker/MentionPicker';
import { SlashCommandPicker } from '../SlashCommandPicker/SlashCommandPicker';
import type { SlashCommand } from '../SlashCommandPicker/commands';
import { ComposerAttachmentChip, type StagedAttachment } from '../Attachments/ComposerAttachmentChip';
import { htmlToMarkdown } from '../../lib/markdown';
import { replaceEmojiShortcodes } from '../../lib/emojiShortcodes';
import { VoiceMicButton, useVoiceFlow } from '@/features/voice-flow';
import { useTranslateSettings } from '@/features/voice-flow/useVoiceSettings';
import { isTranslatableArabic } from '@/lib/i18n/detectScript';
import { ComposerTranslateBanner } from '@/components/chat/main/ComposerTranslateBanner';
import { TranslatePreviewDialog } from '@/components/chat/main/TranslatePreviewDialog';

interface ComposerProps {
  placeholder: string;
  onSend: (markdown: string) => void;
  /** Optional schedule send wiring; falls back to onSend if absent. */
  onScheduleSend?: (markdown: string, whenIso: string) => void;
  notificationBanner?: React.ReactNode;
  /** When true, hides the format toolbar by default until Aa is toggled. */
  startWithToolbarHidden?: boolean;
  /** Conversation id for mention member lookup. */
  conversationId?: string | null;
  /** Staged attachment list rendered above the editor. */
  attachments?: StagedAttachment[];
  /** Called when user picks/drops files via composer surfaces. */
  onAttachFiles?: (files: File[]) => void;
  /** Called when user clicks the X on a chip. */
  onRemoveAttachment?: (id: string) => void;
  /** True when any chip is still uploading — blocks send. */
  isUploading?: boolean;
  /** Initial draft body (markdown) to seed the editor on mount. */
  initialDraft?: string;
  /** Fires on every keystroke after the user has edited — consumer
   *  is expected to debounce-persist this. */
  onDraftChange?: (markdown: string) => void;
  /** When true, removes the bottom padding/border-radius between the
   *  notification banner and the editor so they read as one stacked
   *  surface. Use when a banner (e.g. scheduled-edit) is visually
   *  attached to the composer. */
  bannerAttached?: boolean;
  /** Host-injected slash-command actions (real wired handlers only, e.g.
   *  /huddle → start huddle). Built-in text commands are always available. */
  slashActions?: SlashCommand[];
}

export function Composer({
  placeholder,
  onSend,
  onScheduleSend,
  notificationBanner,
  startWithToolbarHidden = false,
  conversationId = null,
  attachments = [],
  onAttachFiles,
  onRemoveAttachment,
  isUploading = false,
  initialDraft,
  onDraftChange,
  bannerAttached = false,
  slashActions,
}: ComposerProps) {
  const editorRef = useRef<ComposerEditorHandle>(null);
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialDraft ?? '');
  // Seed the contenteditable with the persisted draft. The draft may
  // arrive asynchronously (the parent reads it from a network query),
  // so we re-seed when initialDraft changes — UNLESS the user has
  // already typed (a network round-trip should never overwrite local
  // edits). Composer is keyed by conversation id at the consumer site,
  // so a conversation switch unmounts the editor and resets these refs.
  const userTouchedRef = useRef(false);
  useEffect(() => {
    if (userTouchedRef.current) return;
    if (initialDraft && initialDraft.length > 0) {
      editorRef.current?.setMarkdown(initialDraft);
      setValue(initialDraft);
    }
  }, [initialDraft]);
  const [showToolbar, setShowToolbar] = useState(!startWithToolbarHidden);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiBtnRef = useRef<HTMLDivElement>(null);
  const [mentionState, setMentionState] = useState<{ query: string; anchorRect: DOMRect } | null>(null);
  const [slashState, setSlashState] = useState<{ query: string; anchorRect: DOMRect } | null>(null);
  const hasDoneAttachment = attachments.some(a => a.status === 'done');
  const canSend = !isUploading && (value.trim().length > 0 || hasDoneAttachment);

  // Voice — CatyFlow (CAT-VOICE-UX-PREMIUM-20260708-001): the anchored mic
  // replaces the legacy native-SR recorder here. Same engine as the hotkeys:
  // AR/UR/HI speech lands as English with live inline captions.
  const getVoiceTarget = useCallback(
    () => editorRootRef.current?.querySelector<HTMLElement>('[contenteditable="true"]') ?? null,
    [],
  );
  const { status: voiceStatus, activeElement: voiceElement } = useVoiceFlow();
  const dictatingHere =
    (voiceStatus === 'listening' || voiceStatus === 'paused') &&
    !!voiceElement &&
    !!editorRootRef.current &&
    editorRootRef.current.contains(voiceElement);

  // Write-side AR→EN mode (S4b) — value is the live markdown.
  const { mode: translateMode, setMode: setTranslateMode } = useTranslateSettings();
  const hasArabic = isTranslatableArabic(value);
  const [translateArmed, setTranslateArmed] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!hasArabic) setTranslateArmed(false);
    else if (translateMode === 'always') setTranslateArmed(true);
  }, [hasArabic, translateMode]);

  const finishSend = (md: string) => {
    onSend(md);
    setValue('');
    editorRef.current?.setMarkdown('');
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  const submit = () => {
    if (!canSend) return;
    const html = editorRef.current?.getHtml() ?? '';
    const md = replaceEmojiShortcodes(htmlToMarkdown(html)).trim();
    if (!md && !hasDoneAttachment) return;
    // Armed AR→EN: preview before anything leaves the composer.
    if (md && translateArmed && translateMode !== 'never' && isTranslatableArabic(md)) {
      setPreview(md);
      return;
    }
    finishSend(md);
  };

  const schedule = (iso: string) => {
    if (!canSend) return;
    const html = editorRef.current?.getHtml() ?? '';
    const md = replaceEmojiShortcodes(htmlToMarkdown(html)).trim();
    if (!md && !hasDoneAttachment) return;
    if (onScheduleSend) onScheduleSend(md, iso);
    else onSend(md);
    setValue('');
    editorRef.current?.setMarkdown('');
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  const handleAttachClick = () => {
    if (onAttachFiles) fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (list && list.length > 0 && onAttachFiles) {
      onAttachFiles(Array.from(list));
    }
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!onAttachFiles) return;
    const files: File[] = [];
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      onAttachFiles(files);
    }
  };

  const handleFormat = (action: FormatAction) => {
    editorRef.current?.toggleFormat(action);
  };

  const handlePickMention = (entry: MentionEntry) => {
    editorRef.current?.replaceMentionToken(`@${entry.token} `);
    setMentionState(null);
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  const handlePickSlash = (command: SlashCommand) => {
    setSlashState(null);
    if (command.kind === 'insert') {
      // Swap the "/cmd" the user typed for the glyph, ready to send.
      editorRef.current?.replaceAll(command.text);
      requestAnimationFrame(() => editorRef.current?.focus());
    } else {
      // Action command: clear the "/cmd" and fire the real handler.
      editorRef.current?.clear();
      command.run();
    }
  };

  return (
    <div
      style={{
        flex: '0 0 auto',
        padding: '0 16px 12px',
        background: 'var(--cv2-bg-panel)',
        position: 'relative',
      }}
    >
      {notificationBanner && (
        <div style={{ marginBottom: bannerAttached ? 0 : 8 }}>
          {typeof notificationBanner === 'string' ? (
            <NotificationBanner message={notificationBanner} />
          ) : (
            notificationBanner
          )}
        </div>
      )}
      {hasArabic && translateMode !== 'never' && (
        <div style={{ marginBottom: 4 }}>
          <ComposerTranslateBanner
            mode={translateMode}
            onModeChange={setTranslateMode}
            armed={translateArmed}
            onArmedChange={setTranslateArmed}
          />
        </div>
      )}
      <div
        ref={editorRootRef}
        onPaste={handlePaste}
        className="cv2-composer-shell"
        style={{
          border: dictatingHere
            ? '1px solid var(--ds-border-accent-magenta)'
            : '1px solid var(--cv2-border-strong)',
          borderRadius: bannerAttached
            ? `0 0 var(--cv2-radius-lg) var(--cv2-radius-lg)`
            : 'var(--cv2-radius-lg)',
          borderTopWidth: bannerAttached ? 0 : 1,
          background: 'var(--cv2-bg-composer)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'border-color var(--cv2-transition-fast)',
        }}
      >
        {showToolbar && <ComposerToolbar onFormat={handleFormat} />}
        <ComposerEditor
          ref={editorRef}
          value={value}
          onChange={md => {
            userTouchedRef.current = true;
            setValue(md);
            onDraftChange?.(md);
          }}
          onSubmit={submit}
          placeholder={placeholder}
          onMentionTrigger={setMentionState}
          onSlashTrigger={setSlashState}
        />
        {attachments.some(a => a.status === 'error') && (
          <div
            role="alert"
            style={{
              margin: '4px 12px 0',
              padding: '8px 12px',
              background: 'var(--ds-background-danger)',
              border: '1px solid var(--ds-border-danger)',
              color: 'var(--cv2-text-strong)',
              font: 'var(--ds-font-body-small)',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            {attachments
              .filter(a => a.status === 'error')
              .map(a => (
                <div key={a.id}>
                  <strong>{a.file.name}</strong> — {a.errorMessage || 'upload failed'}
                </div>
              ))}
          </div>
        )}
        {attachments.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              padding: '4px 12px 10px',
            }}
          >
            {attachments.map(a => (
              <ComposerAttachmentChip
                key={a.id}
                attachment={a}
                onRemove={() => onRemoveAttachment?.(a.id)}
              />
            ))}
          </div>
        )}
        <div ref={emojiBtnRef}>
          <ComposerFooter
            canSend={canSend}
            showFormatToolbar={showToolbar}
            onToggleFormatToolbar={() => setShowToolbar(v => !v)}
            onAttach={handleAttachClick}
            onPickEmoji={() => setEmojiOpen(true)}
            onMention={() => editorRef.current?.insertText('@')}
            onSend={submit}
            onSchedule={schedule}
            voiceSlot={<VoiceMicButton getTargetElement={getVoiceTarget} />}
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
      {emojiOpen && (
        <EmojiPicker
          anchor="composer"
          anchorRect={emojiBtnRef.current?.getBoundingClientRect() ?? null}
          onPick={emoji => {
            editorRef.current?.insertEmoji(emoji);
            setEmojiOpen(false);
          }}
          onClose={() => setEmojiOpen(false)}
        />
      )}
      {mentionState && (
        <MentionPicker
          conversationId={conversationId}
          query={mentionState.query}
          anchorRect={mentionState.anchorRect}
          onPick={handlePickMention}
          onClose={() => setMentionState(null)}
        />
      )}
      {slashState && (
        <SlashCommandPicker
          query={slashState.query}
          anchorRect={slashState.anchorRect}
          actions={slashActions}
          onPick={handlePickSlash}
          onClose={() => setSlashState(null)}
        />
      )}
      <TranslatePreviewDialog
        original={preview}
        onClose={() => setPreview(null)}
        onSendOriginal={() => {
          const md = preview;
          setPreview(null);
          if (md) finishSend(md);
        }}
        onSendTranslated={(translated) => {
          setPreview(null);
          finishSend(translated);
        }}
      />
    </div>
  );
}

