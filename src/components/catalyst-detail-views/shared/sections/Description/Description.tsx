/**
 * Description — Tiptap-based replacement for CatalystDescriptionSection.
 *
 * v1 scope: mounted on Story tickets only. Reuses the existing Caty
 * AI improve store + streaming overlay + ph_issues.description_adf storage
 * + inline-image upload pipeline. New parts: Tiptap editor, custom 15-button
 * static toolbar, @/:// inline trigger pickers, View More modal.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NodeSelection } from '@tiptap/pm/state';
import { supabase } from '@/integrations/supabase/client';
import { isAdfEmpty } from '@/components/shared/rich-text/atlaskit/adfHelpers';
import { useAuth } from '@/hooks/useAuth';
import { useCatyImprove } from '@/components/catalyst-detail-views/improve/catyImproveStore';
import { CatyStreamingOverlay } from '@/components/catalyst-detail-views/improve/CatyStreamingOverlay';
import { uploadDescriptionImage } from '@/components/shared/rich-text/atlaskit/supabaseImageUpload';
import { useVoiceToText } from '@/lib/voiceToText/useVoiceToText';
import { useMicVoiceRecorder } from './hooks/useMicVoiceRecorder';
import { MicRecordingBar } from './_components/MicRecordingBar/MicRecordingBar';
import type { PhIssue } from './types';

import { useTiptapEditor } from './hooks/useTiptapEditor';
import { useInlineTriggers } from './hooks/useInlineTriggers';
import { EditorView } from './_components/EditorView/EditorView';
import { DisplayView } from './_components/DisplayView/DisplayView';
import { Toolbar } from './_components/Toolbar/Toolbar';
import { MentionPicker } from './_components/MentionPicker/MentionPicker';
import { EmojiPicker } from './_components/EmojiPicker/EmojiPicker';
import { SlashMenu } from './_components/SlashMenu/SlashMenu';
import { ViewMoreModal } from './_components/SlashMenu/ViewMoreModal';
import { ImageToolbar } from './_components/ImageToolbar/ImageToolbar';
import { ImageResizeHandles } from './_components/ImageToolbar/ImageResizeHandles';
import type { BorderColor, BorderSize, ImageAlignment } from './extensions/CatalystImage';
import { type AdfDoc, type TiptapDoc } from './utils/adfToTiptap';
import { tiptapToAdf } from './utils/tiptapToAdf';
import { catyMarkdownToAdf } from './utils/catyMarkdownToAdf';
import type { SlashCommand } from './data/slashCommands';

interface DescriptionProps {
  issue: PhIssue | null;
  label?: string;
}

export function Description({ issue, label = 'Description' }: DescriptionProps) {
  const [editing, setEditing] = useState(false);
  const [emojiPanelAnchor, setEmojiPanelAnchor] = useState<HTMLElement | null>(null);
  const [slashAnchor, setSlashAnchor] = useState<HTMLElement | null>(null);
  const [viewMoreOpen, setViewMoreOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Caty integration — when payload matches this issue, force edit mode
  // and overlay the streaming view on top of the editor body.
  const catyPayload = useCatyImprove((s) => s.payload);
  const stopCatyImprove = useCatyImprove((s) => s.stop);
  const startCatyImprove = useCatyImprove((s) => s.start);
  const catyActiveForThisIssue =
    catyPayload != null &&
    issue?.issue_key != null &&
    catyPayload.issueKey === issue.issue_key;

  useEffect(() => {
    if (catyActiveForThisIssue) setEditing(true);
  }, [catyActiveForThisIssue]);

  // Read ADF from the issue. We accept the existing column shape unchanged.
  const initialAdf: AdfDoc | null = useMemo(() => {
    const raw = (issue?.description_adf ?? null) as unknown;
    return (raw as AdfDoc) ?? null;
  }, [issue?.description_adf]);

  const isEmpty = isAdfEmpty(initialAdf as unknown);
  const currentDocRef = useRef<TiptapDoc | null>(null);

  const editor = useTiptapEditor({
    initialAdf,
    editable: true,
    onUpdate: (json) => {
      currentDocRef.current = json;
    },
  });

  // Reset edit mode when switching to a different issue.
  const issueKey = issue?.issue_key ?? null;
  const prevIssueKey = useRef(issueKey);
  useEffect(() => {
    if (prevIssueKey.current !== issueKey) {
      prevIssueKey.current = issueKey;
      setEditing(false);
      setEmojiPanelAnchor(null);
      setSlashAnchor(null);
      setViewMoreOpen(false);
    }
  }, [issueKey]);

  const { trigger, dismiss: dismissTrigger, commit: commitTrigger } = useInlineTriggers(editor);

  // ── Voice-to-text (hold Ctrl) ──
  // Reuses the canonical Catalyst hook. While the description is in
  // edit mode, holding Ctrl ≥250ms starts the SpeechRecognition stream;
  // releasing Ctrl (or pressing any other key while held → treated as
  // a keyboard shortcut, not a hold) stops it and flushes the transcript.
  // Insert position: at the cursor if the editor is focused, otherwise
  // appended to the end of the doc.
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  // Voice-to-text language. Three modes:
  //   - 'auto' : derive from doc content (Arabic chars vs Latin); good
  //              for mixed Arabic prose with English loanwords like
  //              "Production", "Beta", "Staging" — chooses Arabic if
  //              Arabic chars dominate.
  //   - 'en'   : force English (en-US).
  //   - 'ar'   : force Arabic (ar-SA).
  type VoiceMode = 'auto' | 'en' | 'ar';
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('auto');

  // Tracks the auto-detected language so the engine knows what to use
  // when in 'auto' mode. Recomputed live as the user types.
  const [autoLang, setAutoLang] = useState<'en-US' | 'ar-SA'>(() => {
    const nav = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    return nav.toLowerCase().startsWith('ar') ? 'ar-SA' : 'en-US';
  });
  useEffect(() => {
    if (!editor) return;
    const recompute = () => {
      const text = editor.getText();
      const arabic = (text.match(/[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g) || []).length;
      const latin = (text.match(/[A-Za-z]/g) || []).length;
      const nav = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
      const browserDefault: 'en-US' | 'ar-SA' = nav.toLowerCase().startsWith('ar')
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

  const voice = useVoiceToText({
    editorRootRef,
    getEditorView: () => (editor ? editor.view : null),
    // Disable the Ctrl-hold path while the mic-button session is active —
    // they can't safely share the mic.
    enabled: editing && !catyActiveForThisIssue,
    lang: effectiveLang,
  });

  // Mic-button driven recording (buffered, finalised on Stop).
  const mic = useMicVoiceRecorder({
    editorRootRef,
    getEditorView: () => (editor ? editor.view : null),
    lang: effectiveLang,
  });

  const handleMicToggle = useCallback(() => {
    if (mic.isActive) {
      // Toolbar click while active → treat as "Stop and insert".
      mic.stop();
    } else {
      mic.start();
    }
  }, [mic]);

  // ── Image selection → ImageToolbar ──
  // Tracks the doc position of the selected image. The ImageToolbar itself
  // re-measures the image's DOM rect on scroll/resize, so we only need to
  // hand it the position + current attrs here.
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
      // Only show the toolbar/handles when the editor is actually focused —
      // otherwise an image at the start of the doc gets auto-selected on
      // mount (Tiptap places the initial selection on the first atom),
      // and the toolbar pops up before the user has even clicked anything.
      if (!editor.isFocused) {
        setImageState(null);
        return;
      }
      const { selection } = editor.state;
      if (!(selection instanceof NodeSelection) || selection.node.type.name !== 'image') {
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

  // Counts uploads currently in flight. Save button is disabled while > 0.
  // We rely on this counter alone — no blob-URL inspection of doc content,
  // which would block saves on tickets that have legacy blob URLs from
  // older corrupted saves.
  const [pendingUploads, setPendingUploads] = useState(0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!issue?.issue_key) return;
      const json = currentDocRef.current ?? (editor?.getJSON() as TiptapDoc | undefined);
      if (!json) return;
      const adf = tiptapToAdf(json);
      await supabase
        .from('ph_issues')
        .update({ description_adf: adf as unknown as never })
        .eq('issue_key', issue.issue_key);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', issue?.issue_key] });
      setEditing(false);
    },
    onError: (err) => {
      // Log only — no inline alert. Errors propagate to the surrounding
      // ErrorBoundary which renders the recoverable error UI.
      console.error('[Description] save failed', err);
    },
  });

  // Image upload pipeline — delegates to the canonical Catalyst helper
  // (bucket "attachments", path "description-images/{workItemId}/...")
  // so the new editor stores images in the SAME bucket as the legacy
  // CatalystDescriptionSection. The previous custom code targeted the
  // wrong bucket name and its public URLs never resolved.
  const handleImageUpload = useCallback(
    async (file: File): Promise<string> => {
      if (!issue?.id || !user?.id) throw new Error('Missing issue or user context');
      setPendingUploads((n) => n + 1);
      try {
        const uploaded = await uploadDescriptionImage(file, { workItemId: issue.id });
        if (!uploaded) throw new Error('Upload returned no result');

        // Mirror the legacy section: register the upload in ph_attachments
        // so the attachments rail can find it.
        const { error: insertErr } = await supabase.from('ph_attachments').insert({
          work_item_id: issue.id,
          file_name: uploaded.filename,
          file_size: file.size,
          mime_type: file.type,
          storage_path: uploaded.storagePath,
          uploaded_by: user.id,
        });
        if (insertErr) {
          console.error('[Description] ph_attachments insert failed', insertErr);
        } else {
          queryClient.invalidateQueries({ queryKey: ['ph-attachments', issue.id] });
        }
        return uploaded.url;
      } finally {
        setPendingUploads((n) => Math.max(0, n - 1));
      }
    },
    [issue?.id, user?.id, queryClient],
  );

  // Improve from the toolbar magic wand — dispatches identical payload to
  // the right-rail Improve dropdown so both entry points behave the same.
  const handleImproveFromToolbar = useCallback(async () => {
    if (!issue?.issue_key) return;
    let attachmentUrls: string[] = [];
    if (issue.id) {
      try {
        const { data } = await supabase
          .from('ph_attachments')
          .select('storage_path, mime_type')
          .eq('work_item_id', issue.id);
        const rows: Array<{ storage_path: string; mime_type: string | null }> = Array.isArray(data)
          ? data
          : [];
        attachmentUrls = rows
          .filter((r) => typeof r.mime_type === 'string' && r.mime_type.startsWith('image/'))
          .map((r) => {
            const { data: pub } = supabase.storage
              .from('description-images')
              .getPublicUrl(r.storage_path);
            return pub?.publicUrl ?? '';
          })
          .filter((u) => u.length > 0);
      } catch {
        attachmentUrls = [];
      }
    }
    startCatyImprove({
      issueKey: issue.issue_key,
      issueType: issue.issue_type ?? null,
      issueSummary: issue.summary ?? null,
      currentDescription: issue.description_text ?? null,
      currentAcceptanceCriteria: issue.acceptance_criteria ?? null,
      attachmentUrls,
      improveSubType: 'improve_clarify',
    });
  }, [issue, startCatyImprove]);

  const handleCatyApply = useCallback(
    async (
      _fullMarkdown: string,
      parts: { description: string; acceptanceCriteria: string },
    ) => {
      if (!issue?.issue_key) return;
      const adfDoc = catyMarkdownToAdf(parts.description);
      const update: Record<string, unknown> = { description_adf: adfDoc };
      if (parts.acceptanceCriteria) update.acceptance_criteria = parts.acceptanceCriteria;
      await supabase
        .from('ph_issues')
        .update(update as never)
        .eq('issue_key', issue.issue_key);
      stopCatyImprove();
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', issue.issue_key] });
    },
    [issue?.issue_key, queryClient, stopCatyImprove],
  );

  const handleCatyCancel = useCallback(() => {
    stopCatyImprove();
    setEditing(false);
  }, [stopCatyImprove]);

  const handleSlashPick = useCallback(
    (c: SlashCommand) => {
      dismissTrigger();
      if (c.externalAction === 'ask-caty') {
        handleImproveFromToolbar();
        return;
      }
      if (c.apply && editor) c.apply(editor);
    },
    [editor, dismissTrigger, handleImproveFromToolbar],
  );

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        className="catalyst-description-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 8,
          userSelect: 'none',
        }}
      >
        <h2
          data-testid="catalyst-description.label"
          style={{
            margin: 0,
            padding: '0 16px',
            flex: 1,
            fontSize: 14,
            fontWeight: 500,
            lineHeight: '20px',
            color: 'var(--ds-text-subtle, #505258)',
            fontFamily:
              '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
          }}
        >
          {label}
        </h2>
      </div>

      {(editing || catyActiveForThisIssue) && issue ? (
        <div ref={editorRootRef} style={{ padding: '0 16px' }}>
          <EditorView
            editor={editor}
            toolbar={
              <Toolbar
                editor={editor}
                onImprove={handleImproveFromToolbar}
                onImageUpload={handleImageUpload}
                onOpenEmojiPanel={(anchor) => setEmojiPanelAnchor(anchor)}
                onOpenSlashMenu={(anchor) => setSlashAnchor(anchor)}
                historyAvailable={false}
                onMicToggle={handleMicToggle}
                micActive={mic.isActive}
                micSupported={mic.isSupported}
              />
            }
            bodyOverlay={
              catyActiveForThisIssue && catyPayload ? (
                <CatyStreamingOverlay
                  key={catyPayload.issueKey}
                  issueKey={catyPayload.issueKey}
                  issueType={catyPayload.issueType}
                  issueSummary={catyPayload.issueSummary}
                  currentDescription={catyPayload.currentDescription}
                  currentAcceptanceCriteria={catyPayload.currentAcceptanceCriteria}
                  attachmentUrls={catyPayload.attachmentUrls}
                  improveSubType={catyPayload.improveSubType}
                  onApply={handleCatyApply}
                  onCancel={handleCatyCancel}
                />
              ) : undefined
            }
          />

          {/* Save / Cancel + voice indicator — OUTSIDE the editor shell.
              Save+Cancel on the left, voice tip / live transcript on the
              right. Hidden while Caty is streaming (overlay owns apply/cancel). */}
          {!catyActiveForThisIssue && (
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
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || pendingUploads > 0}
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
                  cursor:
                    saveMutation.isPending || pendingUploads > 0
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    saveMutation.isPending || pendingUploads > 0 ? 0.5 : 1,
                }}
              >
                {pendingUploads > 0
                  ? `Uploading… (${pendingUploads})`
                  : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
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

              {/* If the mic-button session is active, render the dedicated
                  recording bar. Otherwise show the Ctrl-hold tip / status. */}
              {mic.isActive ? (
                <MicRecordingBar
                  isRecording={!mic.isPaused}
                  isPaused={mic.isPaused}
                  recordedText={mic.recordedText}
                  interimText={mic.interimText}
                  onPauseResume={() => (mic.isPaused ? mic.resume() : mic.pause())}
                  onStop={mic.stop}
                  onCancel={mic.cancel}
                />
              ) : voice.isSupported && (
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
                          background: 'var(--ds-background-brand-bold, #0C66E4)',
                          animation: 'catalyst-voice-pulse 1s ease-in-out infinite',
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
                      {/* Segmented language toggle — Auto / EN / AR.
                          Auto uses text content to pick the language;
                          EN / AR force it explicitly. */}
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
              )}
            </div>
          )}

          {trigger?.type === 'mention' && (
            <MentionPicker
              query={trigger.query}
              coords={trigger.coords}
              onSelect={(u) =>
                commitTrigger({ type: 'mention', attrs: { id: u.id, label: u.full_name } })
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
                editor?.chain().focus().insertContent(e.char).run();
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
              if (action === 'ask-caty') handleImproveFromToolbar();
              // help / attachments / confluence / create-page are no-ops in v1.
            }}
          />

          {/* Image toolbar — opens whenever an image is selected. Tracks
              the image's position automatically; portal-rendered so it
              floats above any content. Layout matches Jira's editor
              exactly: border + chevron | align/wrap | ellipsis menu. */}
          {imageState && editor && (
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
      ) : isEmpty ? (
        /* Read-mode empty state — subtle CTA only. The full
           "Type /ai to Ask Caty or @ to mention…" placeholder is the
           Tiptap Placeholder extension's domain and only renders inside
           the editor on click-to-edit. */
        <div
          onClick={() => {
            if (issue) setEditing(true);
          }}
          style={{
            fontSize: 14,
            color: 'var(--ds-text-subtlest, #97A0AF)',
            minHeight: 40,
            cursor: issue ? 'pointer' : 'default',
            borderRadius: 4,
            padding: '8px 16px',
          }}
        >
          Add a description...
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (issue) setEditing(true);
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && issue) {
              e.preventDefault();
              setEditing(true);
            }
          }}
          style={{
            minHeight: 40,
            cursor: 'text',
            borderRadius: 4,
            padding: '0 16px',
          }}
          title="Click to edit"
        >
          <DisplayView adf={initialAdf} issueKey={issue?.issue_key} />
        </div>
      )}
    </div>
  );
}
