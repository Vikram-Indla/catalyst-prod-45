import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ComposerToolbar, type FormatAction } from './ComposerToolbar';
import { ComposerEditor, type ComposerEditorHandle } from './ComposerEditor';
import { ComposerFooter, type VoiceMode } from './ComposerFooter';
import { NotificationBanner } from '../MessagePanel/NotificationBanner';
import { EmojiPicker } from '../EmojiPicker/EmojiPicker';
import { MentionPicker, type MentionEntry } from '../MentionPicker/MentionPicker';
import { ComposerAttachmentChip, type StagedAttachment } from '../Attachments/ComposerAttachmentChip';
import { htmlToMarkdown } from '../../lib/markdown';
import { replaceEmojiShortcodes } from '../../lib/emojiShortcodes';
import { useMicVoiceRecorder } from '@/components/catalyst-detail-views/shared/sections/Description/hooks/useMicVoiceRecorder';

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
  const hasDoneAttachment = attachments.some(a => a.status === 'done');
  const canSend = !isUploading && (value.trim().length > 0 || hasDoneAttachment);

  // Voice-to-text — reuses the canonical mic recorder hook from the
  // description toolbar. The hook expects a ProseMirror-style view; we
  // expose a thin shim that routes inserts to the contenteditable handle.
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('auto');
  const browserLang: 'en-US' | 'ar-SA' =
    typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ar')
      ? 'ar-SA'
      : 'en-US';
  const effectiveLang: 'en-US' | 'ar-SA' =
    voiceMode === 'en' ? 'en-US' : voiceMode === 'ar' ? 'ar-SA' : browserLang;
  const getEditorView = useCallback(() => {
    const handle = editorRef.current;
    if (!handle) return null;
    return {
      state: {
        doc: { content: { size: 1 } },
        selection: { from: 1, to: 1 },
        tr: {
          insertText(text: string) {
            return { __text: text };
          },
        },
      },
      dispatch(tr: unknown) {
        const text = (tr as { __text?: unknown } | null)?.__text;
        if (typeof text === 'string') handle.insertText(text);
      },
    };
  }, []);
  const mic = useMicVoiceRecorder({
    editorRootRef,
    getEditorView,
    lang: effectiveLang,
  });
  const handleMicToggle = useCallback(() => {
    if (mic.isActive) mic.stop();
    else mic.start();
  }, [mic]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mic.isActive) {
        e.stopPropagation();
        mic.cancel();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [mic]);

  const submit = () => {
    if (!canSend) return;
    const html = editorRef.current?.getHtml() ?? '';
    const md = replaceEmojiShortcodes(htmlToMarkdown(html)).trim();
    if (!md && !hasDoneAttachment) return;
    onSend(md);
    setValue('');
    editorRef.current?.setMarkdown('');
    requestAnimationFrame(() => editorRef.current?.focus());
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
      <div
        ref={editorRootRef}
        onPaste={handlePaste}
        style={{
          border: '1px solid var(--cv2-bg-composer-border)',
          borderRadius: bannerAttached
            ? `0 0 var(--cv2-radius-md) var(--cv2-radius-md)`
            : 'var(--cv2-radius-md)',
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
        />
        {attachments.some(a => a.status === 'error') && (
          <div
            role="alert"
            style={{
              margin: '4px 12px 0',
              padding: '8px 12px',
              background: 'rgba(224, 30, 90, 0.12)', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
              border: '1px solid rgba(224, 30, 90, 0.45)', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
              color: 'var(--cv2-text-strong)',
              fontSize: 'var(--ds-font-size-200)',
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
            micSupported={mic.isSupported}
            micActive={mic.isActive}
            onMicToggle={handleMicToggle}
            voiceMode={voiceMode}
            onVoiceModeChange={setVoiceMode}
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
    </div>
  );
}

