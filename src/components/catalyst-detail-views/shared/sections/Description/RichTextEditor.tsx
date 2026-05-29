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
import { tiptapToAdf } from './utils/tiptapToAdf';
import type { SlashCommand } from './data/slashCommands';

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

  /** Render extra content directly below the editor body (above the
   *  Save/Cancel row). Receives the live editor so the slot can dispatch
   *  inserts / read selection. Used by the comment editor to render the
   *  mention-suggestion pill. */
  belowEditor?: (editor: Editor) => ReactNode;
}

type VoiceMode = 'auto' | 'en' | 'ar';

export function RichTextEditor({
  initialAdf,
  onSave,
  onCancel,
  onChange,
  onImproveClick,
  improveLabel,
  bodyOverlay,
  onImageUpload,
  placeholder,
  minHeight,
  isSaving = false,
  saveLabel = 'Save',
  belowEditor,
}: RichTextEditorProps) {
  const [emojiPanelAnchor, setEmojiPanelAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [slashAnchor, setSlashAnchor] = useState<HTMLElement | null>(null);
  const [viewMoreOpen, setViewMoreOpen] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);

  const currentDocRef = useRef<TiptapDoc | null>(null);

  const editor = useTiptapEditor({
    initialAdf,
    editable: true,
    placeholder,
    onUpdate: (json) => {
      currentDocRef.current = json;
      onChange?.(json);
    },
  });

  const { trigger, dismiss: dismissTrigger, commit: commitTrigger } =
    useInlineTriggers(editor);

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
      if (c.apply && editor) c.apply(editor);
    },
    [editor, dismissTrigger, onImproveClick],
  );

  if (!editor) return null;

  const saveDisabled = isSaving || pendingUploads > 0;

  return (
    <div ref={editorRootRef}>
      <EditorView
        editor={editor}
        minHeight={minHeight}
        toolbar={
          <Toolbar
            editor={editor}
            onImprove={onImproveClick ?? (() => {})}
            improveLabel={improveLabel}
            onImageUpload={
              onImageUpload ? handleImageUploadWrapped : undefined
            }
            onOpenEmojiPanel={(anchor) => setEmojiPanelAnchor(anchor)}
            onOpenSlashMenu={(anchor) => setSlashAnchor(anchor)}
            historyAvailable={false}
            onMicToggle={handleMicToggle}
            micActive={mic.isActive}
            micSupported={mic.isSupported}
          />
        }
        bodyOverlay={bodyOverlay}
        footer={belowEditor ? belowEditor(editor) : undefined}
      />

      {/* Save / Cancel + voice — hidden while a streaming overlay owns
          the body (e.g. Caty), since the overlay provides its own apply/
          cancel controls. */}
      {!overlayActive && (
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
              padding: '6px 12px',
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              borderRadius: 3,
              background: 'var(--ds-background-brand-bold, #0C66E4)',
              color: 'var(--ds-text-inverse, #FFFFFF)',
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
              padding: '6px 12px',
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              borderRadius: 3,
              background: 'transparent',
              color: 'var(--ds-text, #292A2E)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          {mic.isActive ? (
            <MicRecordingBar
              isRecording={!mic.isPaused}
              isPaused={mic.isPaused}
              recordedText={mic.recordedText}
              interimText={mic.interimText}
              onPauseResume={() =>
                mic.isPaused ? mic.resume() : mic.pause()
              }
              onStop={mic.stop}
              onCancel={mic.cancel}
            />
          ) : voice.isSupported ? (
            <div
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: voice.isRecording
                  ? 'var(--ds-text-information, #0C66E4)'
                  : 'var(--ds-text-subtlest, #6B778C)',
                fontWeight: voice.isRecording ? 600 : 400,
                maxWidth: '50%',
                minWidth: 0,
              }}
            >
              {voice.isRecording ? (
                <>
                  <span
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background:
                        'var(--ds-background-brand-bold, #0C66E4)',
                      animation:
                        'catalyst-voice-pulse 1s ease-in-out infinite',
                    }}
                  />
                  <span style={{ flexShrink: 0 }}>Catalyst is listening</span>
                  {voice.interimText && (
                    <span
                      style={{
                        color: 'var(--ds-text-subtle, #44546F)',
                        fontStyle: 'italic',
                        fontWeight: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                      title={voice.interimText}
                    >
                      "{voice.interimText}"
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span>💡 Hold Ctrl or click the mic to dictate</span>
                  <span
                    role="group"
                    aria-label="Voice language mode"
                    style={{
                      display: 'inline-flex',
                      marginLeft: 8,
                      padding: 2,
                      background: 'var(--ds-background-neutral, #F1F2F4)',
                      borderRadius: 999,
                      gap: 0,
                    }}
                  >
                    {(
                      [
                        { id: 'auto', label: 'Auto' },
                        { id: 'en', label: 'EN' },
                        { id: 'ar', label: 'AR' },
                      ] as Array<{ id: VoiceMode; label: string }>
                    ).map(({ id, label }) => {
                      const active = voiceMode === id;
                      const titleSuffix =
                        id === 'auto'
                          ? ` — currently using ${effectiveLang === 'ar-SA' ? 'Arabic' : 'English'}`
                          : '';
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setVoiceMode(id)}
                          aria-pressed={active}
                          title={`${
                            id === 'auto'
                              ? 'Auto-detect from text'
                              : id === 'en'
                                ? 'English (US)'
                                : 'Arabic'
                          }${titleSuffix}`}
                          style={{
                            padding: '2px 10px',
                            border: 'none',
                            borderRadius: 999,
                            fontSize: 11,
                            lineHeight: '16px',
                            fontWeight: active ? 600 : 500,
                            background: active
                              ? 'var(--ds-background-selected, #E9F2FE)'
                              : 'transparent',
                            color: active
                              ? 'var(--ds-text-selected, #0C66E4)'
                              : 'var(--ds-text-subtle, #6B778C)',
                            cursor: 'pointer',
                            transition:
                              'background 120ms ease, color 120ms ease',
                          }}
                          onMouseEnter={(e) => {
                            if (active) return;
                            e.currentTarget.style.color =
                              'var(--ds-text, #292A2E)';
                          }}
                          onMouseLeave={(e) => {
                            if (active) return;
                            e.currentTarget.style.color =
                              'var(--ds-text-subtle, #6B778C)';
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </span>
                </>
              )}
            </div>
          ) : null}
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
