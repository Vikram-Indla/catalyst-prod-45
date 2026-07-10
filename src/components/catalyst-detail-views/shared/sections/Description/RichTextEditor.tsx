/**
 * RichTextEditor — the reusable rich-text editing surface used by both
 * the Description section and the comment editor. Owns:
 *   - Tiptap editor instance
 *   - 15-button toolbar (with optional Improve / Caty entry point)
 *   - @-mention, :-emoji, /-slash inline trigger pickers + view-more modal
 *   - Image toolbar + resize handles
 *   - Voice-to-text (Ctrl-hold path + mic-button buffered path) with
 *     Auto / EN / AR language toggle
 *   - Image upload pipeline (delegated upload + in-flight counter that
 *     gates the Save button)
 *   - Save / Cancel chrome
 *
 * What it does NOT own (callbacks instead):
 *   - Where the ADF gets persisted on save (`onSave`)
 *   - What "Improve" should do (`onImproveClick` + `bodyOverlay`)
 *   - Storage backend for image uploads (`onImageUpload`)
 *
 * Why this exists: the surface is shared 1:1 between issue Description
 * and comment editor. Anything callback-driven stays here; anything
 * specific to a PhIssue (DB row, query keys, Caty store) lives in
 * Description.tsx, and anything specific to comments lives in
 * CommentEditor.tsx.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { useVoiceToText } from '@/lib/voiceToText/useVoiceToText';
import { useMicVoiceRecorder } from './hooks/useMicVoiceRecorder';
import { MicRecordingBar } from './_components/MicRecordingBar/MicRecordingBar';
import { useTiptapEditor } from './hooks/useTiptapEditor';
import { useInlineTriggers } from './hooks/useInlineTriggers';
import { EditorView } from './_components/EditorView/EditorView';
import { Toolbar } from './_components/Toolbar/Toolbar';
import { MentionPicker } from './_components/MentionPicker/MentionPicker';
import { TicketPicker } from './_components/TicketPicker/TicketPicker';
import { EmojiPicker } from './_components/EmojiPicker/EmojiPicker';
import { SlashMenu } from './_components/SlashMenu/SlashMenu';
import { ViewMoreModal } from './_components/SlashMenu/ViewMoreModal';
import { ImageToolbar } from './_components/ImageToolbar/ImageToolbar';
import { ImageResizeHandles } from './_components/ImageToolbar/ImageResizeHandles';
import type {
  BorderColor,
  BorderSize,
  ImageAlignment,
} from './extensions/CatalystImage';
import { type AdfDoc, type TiptapDoc } from './utils/adfToTiptap';
import { LinkInputModal } from '@/components/shared/LinkInputModal';
import type { RequestInputFn } from './data/modalElements';
import { tiptapToAdf } from './utils/tiptapToAdf';
import type { SlashCommand } from './data/slashCommands';
import {
  injectMentionStyles,
  markMentionsSelfStatus,
} from '@/components/shared/rich-text/mentions/mentionStyles';
import { useAuth } from '@/hooks/useAuth';

export interface RichTextEditorProps {
  initialAdf: AdfDoc | null;
  /** Called on Save click. Receives the ADF JSON string. */
  onSave: (adfJson: string) => void | Promise<void>;
  /** Called on Cancel click. */
  onCancel: () => void;
  /** Called whenever the editor content changes (live). */
  onChange?: (json: TiptapDoc) => void;

  /** Toolbar "Improve" magic wand handler. Hides the button if omitted. */
  onImproveClick?: () => void;
  /** Stop an in-flight Caty improve session. */
  onStopImprove?: () => void;
  /** Label on the Improve button. Defaults to "Improve description"; the
   *  comment editor passes "Improve writing". */
  improveLabel?: string;
  /** Streaming overlay (e.g. CatyStreamingOverlay). When set, the editor
   *  body is hidden, the overlay takes over the body, and Save/Cancel
   *  controls are hidden (the overlay owns Apply/Cancel). */
  bodyOverlay?: ReactNode;

  /** Image upload — caller does the actual storage call + side effects
   *  (e.g. ph_attachments insert) and returns the public URL. */
  onImageUpload?: (file: File) => Promise<string>;

  /** Placeholder text shown when the editor is empty. */
  placeholder?: string;
  /** Min height of the editor body in px. 220 = description default,
   *  ~80 = comment ("2 rows") default. */
  minHeight?: number;

  /** External save-in-progress flag — disables Save while truthy. */
  isSaving?: boolean;
  /** Save button label. Defaults to "Save". */
  saveLabel?: string;
  /** Hide the built-in Save / Cancel row. Use when the host (e.g. a
   *  Create-issue modal) already provides its own footer actions and
   *  reads the live ADF via `onChange` instead of `onSave`. */
  hideActionButtons?: boolean;

  /** Render extra content directly below the editor body (above the
   *  Save/Cancel row). Receives the live editor so the slot can dispatch
   *  inserts / read selection. Used by the comment editor to render the
   *  mention-suggestion pill. */
  belowEditor?: (editor: Editor) => ReactNode;

  /** Fires when the Tiptap editor instance becomes available (and again
   *  with `null` on unmount). Lets parents drive the editor imperatively
   *  — e.g. Caty Improve pipes streaming text in by calling
   *  `editor.commands.setContent(...)`. */
  onEditorReady?: (editor: Editor | null) => void;

  /** Hide the toolbar voice-to-text mic. Surfaces that mount their own
   *  CatyFlow VoiceMicButton (chat composer) pass this so exactly one mic
   *  is visible per composer (CAT-VOICE-UX-PREMIUM-20260708-001 S2a). */
  hideMicButton?: boolean;

  /** Content rendered INSIDE the editor's scrollable body, directly
   *  after `<EditorContent>`. Used by Caty Improve to position the muted
   *  "before" snapshot inside the editor frame, so as the AI writes new
   *  content above, the snapshot is pushed down within the same scroll
   *  container. */
  bodyAfterEditor?: ReactNode;
  issue?: {
    id?: string;
    issue_key?: string | null;
    issue_type?: string | null;
    summary?: string | null;
    description_text?: string | null;
    description_adf?: unknown | null;
    project_key?: string | null;
    project_id?: string | null;
    source?: 'jira' | 'catalyst' | string | null;
    assignee_account_id?: string | null;
  } | null;
}

type VoiceMode = 'auto' | 'en' | 'ar';

export function RichTextEditor({
  initialAdf,
  onSave,
  onCancel,
  onChange,
  onImproveClick,
  onStopImprove,
  improveLabel,
  bodyOverlay,
  onImageUpload,
  placeholder,
  minHeight,
  isSaving = false,
  saveLabel = 'Save',
  hideActionButtons = false,
  belowEditor,
  onEditorReady,
  hideMicButton = false,
  bodyAfterEditor,
  issue,
}: RichTextEditorProps) {
  const [emojiPanelAnchor, setEmojiPanelAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [slashAnchor, setSlashAnchor] = useState<HTMLElement | null>(null);
  const [viewMoreOpen, setViewMoreOpen] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [inputModal, setInputModal] = useState<{ label: string; defaultValue: string; callback: (v: string | null) => void } | null>(null);

  const requestInput: RequestInputFn = useCallback((opts, callback) => {
    setInputModal({ label: opts.label, defaultValue: opts.defaultValue ?? 'https://', callback });
  }, []);

  const currentDocRef = useRef<TiptapDoc | null>(null);

  /* 2026-06-17: forward the same upload pipeline used by the toolbar to
     useTiptapEditor's paste/drop handlers. Defined as a stable ref-style
     function below; passed here as the `onImageUpload` option so
     Ctrl+V on a screenshot or drag-from-OS lands as an image node. */
  const editor = useTiptapEditor({
    initialAdf,
    editable: true,
    placeholder,
    onUpdate: (json) => {
      currentDocRef.current = json;
      onChange?.(json);
    },
    onImageUpload: onImageUpload
      ? async (file) => {
          setPendingUploads((n) => n + 1);
          try {
            return await onImageUpload(file);
          } finally {
            setPendingUploads((n) => Math.max(0, n - 1));
          }
        }
      : undefined,
  });

  const { trigger, dismiss: dismissTrigger, commit: commitTrigger } =
    useInlineTriggers(editor);

  // Notify the parent whenever the editor instance changes — typically
  // null → ready on mount, then ready → null on unmount.
  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  // Two-tone mention chips: stamp `data-mention-self` on the
  // current user's mentions after every transaction so the global
  // mention CSS paints them in the brand color instead of the
  // default subtle gray.
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  useEffect(() => {
    if (!editor) return;
    injectMentionStyles();
    const root = editor.view.dom as HTMLElement;
    const apply = () => markMentionsSelfStatus(root, currentUserId);
    apply();
    editor.on('update', apply);
    editor.on('transaction', apply);
    return () => {
      editor.off('update', apply);
      editor.off('transaction', apply);
    };
  }, [editor, currentUserId]);

  // ── Voice-to-text language detection ──
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('auto');
  const [autoLang, setAutoLang] = useState<'en-US' | 'ar-SA'>(() => {
    const nav = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    return nav.toLowerCase().startsWith('ar') ? 'ar-SA' : 'en-US';
  });
  useEffect(() => {
    if (!editor) return;
    const recompute = () => {
      const text = editor.getText();
      const arabic =
        (text.match(/[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g) || []).length;
      const latin = (text.match(/[A-Za-z]/g) || []).length;
      const nav =
        typeof navigator !== 'undefined' ? navigator.language : 'en-US';
      const browserDefault: 'en-US' | 'ar-SA' = nav
        .toLowerCase()
        .startsWith('ar')
        ? 'ar-SA'
        : 'en-US';
      let next: 'en-US' | 'ar-SA';
      if (arabic > latin) next = 'ar-SA';
      else if (latin > arabic) next = 'en-US';
      else next = browserDefault;
      setAutoLang((prev) => (prev === next ? prev : next));
    };
    recompute();
    editor.on('update', recompute);
    return () => {
      editor.off('update', recompute);
    };
  }, [editor]);

  const effectiveLang: 'en-US' | 'ar-SA' =
    voiceMode === 'en' ? 'en-US' : voiceMode === 'ar' ? 'ar-SA' : autoLang;

  const overlayActive = bodyOverlay != null;
  const voice = useVoiceToText({
    editorRootRef,
    getEditorView: () => (editor ? editor.view : null),
    enabled: !overlayActive,
    lang: effectiveLang,
  });
  const mic = useMicVoiceRecorder({
    editorRootRef,
    getEditorView: () => (editor ? editor.view : null),
    lang: effectiveLang,
  });
  const handleMicToggle = useCallback(() => {
    if (mic.isActive) mic.stop();
    else mic.start();
  }, [mic]);

  // Escape key exits mic recording (capture phase so it beats any parent modal handler).
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

  // ── Image selection → ImageToolbar ──
  const [imageState, setImageState] = useState<{
    pos: number;
    alignment: ImageAlignment;
    borderColor: BorderColor | null;
    borderSize: BorderSize;
    src: string;
  } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      if (!editor.isFocused) {
        setImageState(null);
        return;
      }
      const { selection } = editor.state;
      if (
        !(selection instanceof NodeSelection) ||
        selection.node.type.name !== 'image'
      ) {
        setImageState(null);
        return;
      }
      const node = selection.node;
      setImageState({
        pos: selection.from,
        alignment: (node.attrs.alignment as ImageAlignment) ?? 'center',
        borderColor: (node.attrs.borderColor as BorderColor | null) ?? null,
        borderSize: (node.attrs.borderSize as BorderSize) ?? 'medium',
        src: (node.attrs.src as string) ?? '',
      });
    };
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    editor.on('focus', update);
    editor.on('blur', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      editor.off('focus', update);
      editor.off('blur', update);
    };
  }, [editor]);

  const handleImageUploadWrapped = useCallback(
    async (file: File): Promise<string> => {
      if (!onImageUpload) {
        throw new Error('Image upload is not configured for this editor');
      }
      setPendingUploads((n) => n + 1);
      try {
        return await onImageUpload(file);
      } finally {
        setPendingUploads((n) => Math.max(0, n - 1));
      }
    },
    [onImageUpload],
  );

  const handleSaveClick = useCallback(() => {
    const json = currentDocRef.current ?? (editor?.getJSON() as TiptapDoc | undefined);
    if (!json) return;
    const adf = tiptapToAdf(json);
    onSave(JSON.stringify(adf));
  }, [editor, onSave]);

  const handleSlashPick = useCallback(
    (c: SlashCommand) => {
      dismissTrigger();
      if (c.externalAction === 'ask-caty') {
        onImproveClick?.();
        return;
      }
      if (c.apply && editor) c.apply(editor, requestInput);
    },
    [editor, dismissTrigger, onImproveClick, requestInput],
  );

  // Cmd+Enter (Mac) / Ctrl+Enter (Win) to save — mirrors Slack/Teams keyboard UX
  useEffect(() => {
    const el = editorRootRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isSaving && pendingUploads === 0) handleSaveClick();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [handleSaveClick, isSaving, pendingUploads]);

  if (!editor) return null;

  const saveDisabled = isSaving || pendingUploads > 0;

  return (
    <div ref={editorRootRef} data-voice-zone="true">
      <EditorView
        editor={editor}
        minHeight={minHeight}
        toolbar={
          <Toolbar
            editor={editor}
            issue={issue}
            onImprove={onImproveClick ?? (() => {})}
            onStop={onStopImprove}
            improveLabel={improveLabel}
            isImproving={overlayActive}
            onImageUpload={
              onImageUpload ? handleImageUploadWrapped : undefined
            }
            onOpenEmojiPanel={(anchor) => setEmojiPanelAnchor(anchor)}
            onOpenSlashMenu={(anchor) => setSlashAnchor(anchor)}
            historyAvailable={false}
            onMicToggle={handleMicToggle}
            micActive={mic.isActive}
            micSupported={!hideMicButton && mic.isSupported}
            voiceMode={voiceMode}
            onVoiceModeChange={setVoiceMode}
          />
        }
        bodyOverlay={bodyOverlay}
        footer={belowEditor ? belowEditor(editor) : undefined}
        bodyAfterEditor={bodyAfterEditor}
      />

      {/* Mic session pill — centered above save row, outside flex container
          so it's always visible regardless of editor body height. */}
      {!overlayActive && mic.isActive && (
        <MicRecordingBar
          isRecording={!mic.isPaused}
          isPaused={mic.isPaused}
          phase={mic.phase}
          recordedText={mic.recordedText}
          interimText={mic.interimText}
          onPauseResume={() => mic.isPaused ? mic.resume() : mic.pause()}
          onStop={mic.stop}
          onCancel={mic.cancel}
        />
      )}

      {/* Ctrl-hold voice pill — same centered pill style */}
      {!overlayActive && voice.isRecording && !mic.isActive && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, marginBottom: 4 }}>
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 14px',
              borderRadius: 999,
              background: 'var(--ds-surface-overlay)',
              border: '1px solid var(--ds-border)',
              boxShadow: '0 2px 8px var(--ds-background-neutral-subtle-pressed)',
              animation: 'caty-pill-enter 220ms ease forwards',
              maxWidth: 420,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: 'var(--ds-background-brand-bold)',
                animation: 'catalyst-voice-pulse 1s ease-in-out infinite',
              }}
            />
            <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-information)', whiteSpace: 'nowrap' }}>
              Caty is listening
              <span aria-hidden style={{ display: 'inline-flex', gap: 0, marginLeft: 4, verticalAlign: 'middle' }}>
                {[0,1,2].map((i) => (
                  <span key={i} style={{ display: 'inline-block', width: 3, height: 3, borderRadius: '50%', background: 'currentColor', animation: `caty-mic-dot 1.2s ease-in-out ${i*0.2}s infinite` }} />
                ))}
              </span>
            </span>
            {voice.interimText && (
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }} title={voice.interimText}>
                {voice.interimText}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Save / Cancel row */}
      {!overlayActive && !hideActionButtons && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 8,
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saveDisabled}
            title={
              pendingUploads > 0
                ? `Waiting for ${pendingUploads} image upload${pendingUploads === 1 ? '' : 's'} to finish…`
                : undefined
            }
            style={{
              padding: '4px 12px',
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 500,
              border: 'none',
              borderRadius: 3,
              background: 'var(--ds-background-brand-bold)',
              color: 'var(--ds-text-inverse)',
              cursor: saveDisabled ? 'not-allowed' : 'pointer',
              opacity: saveDisabled ? 0.5 : 1,
            }}
          >
            {pendingUploads > 0 ? `Uploading… (${pendingUploads})` : saveLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '4px 12px',
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 500,
              border: 'none',
              borderRadius: 3,
              background: 'transparent',
              color: 'var(--ds-text)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {trigger?.type === 'mention' && (
        <MentionPicker
          query={trigger.query}
          coords={trigger.coords}
          onSelect={(u) =>
            commitTrigger({
              type: 'mention',
              attrs: { id: u.id, label: u.full_name },
            })
          }
          onDismiss={dismissTrigger}
        />
      )}
      {trigger?.type === 'emoji' && (
        <EmojiPicker
          mode="inline"
          inlineQuery={trigger.query}
          coords={trigger.coords}
          onSelect={(e) => commitTrigger(e.char)}
          onDismiss={dismissTrigger}
        />
      )}
      {trigger?.type === 'slash' && (
        <SlashMenu
          mode="inline"
          query={trigger.query}
          coords={trigger.coords}
          onPick={handleSlashPick}
          onViewMore={() => {
            dismissTrigger();
            setViewMoreOpen(true);
          }}
          onDismiss={dismissTrigger}
        />
      )}
      {trigger?.type === 'ticket' && (
        <TicketPicker
          query={trigger.query}
          coords={trigger.coords}
          onSelect={(issue) =>
            commitTrigger(issue.issue_key + ' ')
          }
          onDismiss={dismissTrigger}
        />
      )}

      {emojiPanelAnchor && (
        <EmojiPicker
          mode="panel"
          coords={{ anchor: emojiPanelAnchor }}
          onSelect={(e) => {
            editor.chain().focus().insertContent(e.char).run();
            setEmojiPanelAnchor(null);
          }}
          onDismiss={() => setEmojiPanelAnchor(null)}
        />
      )}

      {slashAnchor && (
        <SlashMenu
          mode="panel"
          query=""
          coords={{ anchor: slashAnchor }}
          onPick={(c) => {
            handleSlashPick(c);
            setSlashAnchor(null);
          }}
          onViewMore={() => {
            setSlashAnchor(null);
            setViewMoreOpen(true);
          }}
          onDismiss={() => setSlashAnchor(null)}
        />
      )}

      <ViewMoreModal
        isOpen={viewMoreOpen}
        onClose={() => setViewMoreOpen(false)}
        editor={editor}
        onExternalAction={(action) => {
          if (action === 'ask-caty') onImproveClick?.();
        }}
      />

      {inputModal && (
        <LinkInputModal
          isOpen
          title={inputModal.label}
          onClose={() => setInputModal(null)}
          onConfirm={(url) => { inputModal.callback(url || null); setInputModal(null); }}
        />
      )}

      {imageState && (
        <>
          <ImageToolbar
            editor={editor}
            imagePos={imageState.pos}
            alignment={imageState.alignment}
            borderColor={imageState.borderColor}
            borderSize={imageState.borderSize}
            src={imageState.src}
          />
          <ImageResizeHandles editor={editor} imagePos={imageState.pos} />
        </>
      )}
    </div>
  );
}
