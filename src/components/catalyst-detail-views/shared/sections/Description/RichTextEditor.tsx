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
            voiceMode={voiceMode}
            onVoiceModeChange={setVoiceMode}
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

          {mic.isActive && (
            <MicRecordingBar
              isRecording={!mic.isPaused}
              isPaused={mic.isPaused}
              phase={mic.phase}
              recordedText={mic.recordedText}
              interimText={mic.interimText}
              onPauseResume={() =>
                mic.isPaused ? mic.resume() : mic.pause()
              }
              onStop={mic.stop}
              onCancel={mic.cancel}
            />
          )}
          {!mic.isActive && voice.isSupported && voice.isRecording && (
            <CtrlVoicePill interimText={voice.interimText} />
          )}
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

/** Pill shown while Ctrl-hold voice dictation is active — same visual as MicRecordingBar. */
function CtrlVoicePill({ interimText }: { interimText: string }) {
  const catyLogo = '/caty.svg';
  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: 8, pointerEvents: 'none' }}>
      <div
        className="caty-pill-enter"
        style={{
          pointerEvents: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderRadius: 999,
          background: 'var(--ds-surface-overlay, #FFFFFF)',
          boxShadow: '0 4px 16px rgba(9,30,66,0.22), 0 0 0 1px rgba(9,30,66,0.08)',
          maxWidth: '80%',
          minWidth: 0,
        }}
      >
        <img
          src={catyLogo}
          alt=""
          width={18}
          height={18}
          style={{ flexShrink: 0, animation: 'caty-pulse 1s ease-in-out infinite' }}
        />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #292A2E)', flexShrink: 0 }}>
          Caty is listening
        </span>
        <span aria-hidden style={{ display: 'inline-flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 4, height: 4, borderRadius: '50%',
                background: 'var(--ds-background-brand-bold, #0C66E4)',
                animation: `caty-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </span>
        {interimText && (
          <span
            style={{
              fontSize: 12, color: 'var(--ds-text-subtle, #44546F)',
              fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', minWidth: 0, maxWidth: 200,
            }}
            title={interimText}
          >
            {interimText}
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #8590A2)', flexShrink: 0 }}>
          Release Ctrl to insert
        </span>
      </div>
      <style>{`
        @keyframes caty-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
