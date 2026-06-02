/**
 * Description — Tiptap-based replacement for CatalystDescriptionSection.
 *
 * Now a thin wrapper around `RichTextEditor` (which owns the editor
 * surface and is shared with the comment editor). Description retains
 * the issue-specific glue: reading description_adf from the PhIssue,
 * the Caty integration keyed by issue.issue_key, the save mutation to
 * ph_issues, the ph_attachments-aware image upload pipeline, and the
 * read-mode display + click-to-edit affordance.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isAdfEmpty } from '@/components/shared/rich-text/atlaskit/adfHelpers';
import { useAuth } from '@/hooks/useAuth';
import { useCatyImprove } from '@/components/catalyst-detail-views/improve/catyImproveStore';
import { useCatyImproveStream } from '@/components/catalyst-detail-views/improve/useCatyImproveStream';
import { CatyImproveStrap } from '@/components/catalyst-detail-views/improve/CatyImproveStrap';
import { uploadDescriptionImage } from '@/components/shared/rich-text/atlaskit/supabaseImageUpload';
import type { PhIssue } from './types';

import { DisplayView } from './_components/DisplayView/DisplayView';
import { RichTextEditor } from './RichTextEditor';
import { adfToTiptap, type AdfDoc, type TiptapDoc } from './utils/adfToTiptap';
import { tiptapToAdf } from './utils/tiptapToAdf';
import { adfToMarkdown } from './utils/adfToMarkdown';
import { catyMarkdownToAdf } from './utils/catyMarkdownToAdf';

interface DescriptionProps {
  issue: PhIssue | null;
  label?: string;
}

export function Description({ issue, label = 'Description' }: DescriptionProps) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Caty integration — when the store payload matches this issue, force
  // edit mode and pipe the AI's streamed Markdown directly into the
  // Tiptap editor. The muted snapshot of the ORIGINAL description sits
  // above the editor for reference while the stream is in flight.
  const catyPayload = useCatyImprove((s) => s.payload);
  const stopCatyImprove = useCatyImprove((s) => s.stop);
  const startCatyImprove = useCatyImprove((s) => s.start);
  const catyActiveForThisIssue =
    catyPayload != null &&
    issue?.issue_key != null &&
    catyPayload.issueKey === issue.issue_key;

  // Drive the network stream only when this issue's payload is active.
  const streamPayload = catyActiveForThisIssue ? catyPayload : null;
  const {
    phase: catyPhase,
    text: catyText,
    errorMessage: catyError,
    stop: stopCatyStream,
  } = useCatyImproveStream(streamPayload);

  // Editor instance is owned by RichTextEditor; we receive it via
  // `onEditorReady` so we can drive content + editable state.
  const [editor, setEditor] = useState<Editor | null>(null);

  // Snapshot of the editor content at the moment Improve was clicked.
  // This is the muted "before" view shown below the live editor while
  // Caty is generating. For the FIRST improve it equals the DB content;
  // for SUBSEQUENT improves (user re-runs Improve on the AI's previous
  // output without saving) it equals the editor's current content.
  // null = not in an improve session.
  const [snapshotAdf, setSnapshotAdf] = useState<AdfDoc | null>(null);

  // While Caty is producing output, the editor is read-only. Esc / Stop
  // ends the stream and unlocks it.
  const streamLocked = catyPhase === 'analyzing' || catyPhase === 'streaming';

  // Hoisted ABOVE the snapshot effect because that effect's dep array
  // references it — useState/useMemo declarations are subject to the
  // temporal dead zone, and the effect runs during the same render in
  // which it's declared.
  const initialAdf: AdfDoc | null = useMemo(() => {
    const raw = (issue?.description_adf ?? null) as unknown;
    return (raw as AdfDoc) ?? null;
  }, [issue?.description_adf]);

  useEffect(() => {
    if (catyActiveForThisIssue) {
      setEditing(true);
      // Fallback for right-rail-initiated improves: the toolbar handler
      // captures the editor content directly, but the right-rail
      // dropdown can't see the editor — so when a session starts and
      // we don't yet have a snapshot, fall back to the DB ADF.
      setSnapshotAdf((prev) => prev ?? initialAdf);
    } else {
      // Session ended (Save / Cancel) — clear the snapshot so the next
      // improve starts fresh.
      setSnapshotAdf(null);
    }
  }, [catyActiveForThisIssue, initialAdf]);

  // Clear the snapshot the moment Caty finishes (or is stopped / errors
  // out). The JSX render guard `streamLocked && snapshotAdf` already
  // hides it on terminal phases, but nulling the state here makes the
  // intent explicit and guarantees no stale snapshot lingers behind the
  // editor for any reason.
  useEffect(() => {
    if (
      catyPhase === 'done' ||
      catyPhase === 'stopped' ||
      catyPhase === 'errored'
    ) {
      setSnapshotAdf(null);
    }
  }, [catyPhase]);

  // Sync editor.editable with stream state. setEditable doesn't trigger
  // a re-render of editor instance, so it's cheap.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!streamLocked);
  }, [editor, streamLocked]);

  // Stream-into-editor: every flush tick from the hook, parse the
  // accumulated Markdown into Tiptap doc shape and replace the editor
  // content. setContent on a non-editable editor is fine — only user
  // input is gated by `editable`. Cursor jumps don't matter because the
  // user can't type during the stream anyway. Once the stream reaches a
  // terminal phase (`done` / `stopped`), the final text has already
  // been flushed by the hook, so the final setContent here is also the
  // final state the user can edit / save.
  //
  // Signature note: uses the positional `(content, emitUpdate)` API to
  // match the codebase's existing pattern (JiraDescriptionEditor.tsx).
  // `emitUpdate=false` skips firing onUpdate on every stream tick —
  // we don't need to thrash currentDocRef during streaming, and the
  // final terminal-phase flush below emits with true.
  useEffect(() => {
    if (!editor || !catyActiveForThisIssue) return;
    if (catyPhase === 'idle' || catyPhase === 'errored') return;
    if (!catyText || !catyText.trim()) return;
    const adf = catyMarkdownToAdf(catyText);
    const tiptapDoc = adfToTiptap(adf);
    const emitFinal = catyPhase === 'done' || catyPhase === 'stopped';
    editor.commands.setContent(tiptapDoc, emitFinal);
    // Auto-scroll the editor body to the end so the user sees the
    // newest tokens as they land. Without this, when AI output grows
    // taller than the viewport, all new content disappears below the
    // fold and the editor looks static.
    if (catyPhase === 'streaming') {
      const body = editor.view.dom.closest<HTMLElement>(
        '.catalyst-description-editor-body',
      );
      if (body) body.scrollTop = body.scrollHeight;
    }
  }, [editor, catyActiveForThisIssue, catyPhase, catyText]);

  // Resolve Jira-synced media URLs for edit mode. Jira-uploaded
  // images store only `media.attrs.id` (no url) — read mode resolves
  // this via MediaProvidersShell in EpicDescriptionRenderer, but our
  // Tiptap `adfToTiptap` reads `media.attrs.url` directly so without
  // pre-resolution every image shows up broken in edit mode. We mirror
  // the lookup the read renderer uses (atlaskitMediaOverrides.tsx
  // line 384–422) so the two paths return identical URLs.
  const { data: attachments } = useQuery({
    queryKey: ['ph-issue-attachments-edit', issue?.issue_key],
    enabled: !!issue?.issue_key,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issue_attachments')
        .select(
          'jira_attachment_id, filename, mime_type, content_url, thumbnail_url, local_public_url',
        )
        .eq('issue_key', issue!.issue_key!);
      return data ?? [];
    },
  });

  const mediaUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    const supabaseUrl =
      (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env
        ?.VITE_SUPABASE_URL || '';
    for (const att of attachments ?? []) {
      if (!att.mime_type?.startsWith('image/')) continue;
      let url = '';
      if (att.local_public_url) {
        url = att.local_public_url;
      } else if (att.jira_attachment_id && supabaseUrl) {
        url = `${supabaseUrl}/functions/v1/jira-attachment-proxy?id=${att.jira_attachment_id}`;
      } else {
        url = att.content_url || att.thumbnail_url || '';
      }
      if (url) {
        if (att.jira_attachment_id) map.set(att.jira_attachment_id, url);
        if (att.filename) map.set(att.filename, url);
      }
    }
    return map;
  }, [attachments]);

  const enrichedAdf: AdfDoc | null = useMemo(() => {
    if (!initialAdf) return initialAdf;
    if (mediaUrlMap.size === 0) return initialAdf;
    return injectMediaUrls(initialAdf, mediaUrlMap);
  }, [initialAdf, mediaUrlMap]);

  const isEmpty = isAdfEmpty(initialAdf as unknown);

  // Reset edit mode when switching to a different issue.
  const issueKey = issue?.issue_key ?? null;
  const prevIssueKey = useRef(issueKey);
  useEffect(() => {
    if (prevIssueKey.current !== issueKey) {
      prevIssueKey.current = issueKey;
      setEditing(false);
    }
  }, [issueKey]);

  const saveMutation = useMutation({
    mutationFn: async (adfJson: string) => {
      if (!issue?.issue_key) return;
      const adf = JSON.parse(adfJson);
      await supabase
        .from('ph_issues')
        .update({ description_adf: adf as unknown as never })
        .eq('issue_key', issue.issue_key);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['cv-issue-detail', issue?.issue_key],
      });
      // Clearing the store payload on save ensures the next "Improve
      // description" click on this same ticket starts a fresh session
      // rather than re-running the previous prompt.
      stopCatyImprove();
      setEditing(false);
    },
    onError: (err) => {
      console.error('[Description] save failed', err);
    },
  });

  // Image upload pipeline — uploads to the attachments bucket, then
  // registers the file in ph_attachments so the attachments rail
  // discovers it. Returns the public URL the editor inserts into the
  // doc.
  const handleImageUpload = useCallback(
    async (file: File): Promise<string> => {
      if (!issue?.id || !user?.id)
        throw new Error('Missing issue or user context');
      const uploaded = await uploadDescriptionImage(file, {
        workItemId: issue.id,
      });
      if (!uploaded) throw new Error('Upload returned no result');

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
        queryClient.invalidateQueries({
          queryKey: ['ph-attachments', issue.id],
        });
      }
      return uploaded.url;
    },
    [issue?.id, user?.id, queryClient],
  );

  // Improve from the toolbar magic wand — dispatches the same payload
  // the right-rail Improve dropdown uses so both entry points behave
  // identically.
  const handleImproveFromToolbar = useCallback(async () => {
    if (!issue?.issue_key) return;
    let attachmentUrls: string[] = [];
    if (issue.id) {
      try {
        const { data } = await supabase
          .from('ph_attachments')
          .select('storage_path, mime_type')
          .eq('work_item_id', issue.id);
        const rows: Array<{
          storage_path: string;
          mime_type: string | null;
        }> = Array.isArray(data) ? data : [];
        attachmentUrls = rows
          .filter(
            (r) =>
              typeof r.mime_type === 'string' &&
              r.mime_type.startsWith('image/'),
          )
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
    // Capture the editor's CURRENT content (Tiptap → ADF) as both the
    // snapshot to display below and the input to send to the AI. This
    // is what makes re-running Improve work correctly: the second pass
    // operates on the AI's first output, not on the unchanged DB row.
    // First-improve fallback (editor not mounted yet, e.g. from the
    // right-rail dropdown): use the DB ADF.
    const currentAdf: AdfDoc | null = editor
      ? (tiptapToAdf(editor.getJSON() as TiptapDoc) as AdfDoc)
      : initialAdf;
    setSnapshotAdf(currentAdf);
    const currentDescription = currentAdf
      ? adfToMarkdown(currentAdf)
      : (issue.description_text ?? null);
    startCatyImprove({
      issueKey: issue.issue_key,
      issueType: issue.issue_type ?? null,
      issueSummary: issue.summary ?? null,
      currentDescription,
      currentAcceptanceCriteria: issue.acceptance_criteria ?? null,
      attachmentUrls,
      improveSubType: 'improve_clarify',
    });
  }, [issue, initialAdf, editor, startCatyImprove]);

  // Cancel handler — also halts an in-flight Caty stream and clears the
  // store payload so the next Improve session is fresh.
  const handleCancel = useCallback(() => {
    if (catyActiveForThisIssue) {
      stopCatyStream();
      stopCatyImprove();
    }
    setEditing(false);
  }, [catyActiveForThisIssue, stopCatyStream, stopCatyImprove]);

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
        <div style={{ padding: '0 16px' }}>
          <RichTextEditor
            initialAdf={enrichedAdf}
            onSave={(adfJson) => saveMutation.mutate(adfJson)}
            onCancel={handleCancel}
            isSaving={saveMutation.isPending}
            onImageUpload={handleImageUpload}
            onImproveClick={handleImproveFromToolbar}
            onEditorReady={setEditor}
            /* Snapshot of the content at the moment Improve was clicked
               + the bottom "Caty is editing" strap — both rendered
               INSIDE the editor's scrollable body so they share the
               same container as the AI's live output. As the AI writes
               more lines above, the snapshot is pushed down within
               the same scroll container, and the strap (position:
               sticky, bottom) floats at the bottom of the body. */
            bodyAfterEditor={
              <>
                {streamLocked && snapshotAdf && (
                  <div
                    data-testid="caty-improve-snapshot"
                    style={{
                      opacity: 0.5,
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: '1px dashed var(--ds-border, #DFE1E6)',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    <DisplayView adf={snapshotAdf} issueKey={issue.issue_key} />
                  </div>
                )}
                <CatyImproveStrap
                  phase={catyPhase}
                  onStop={stopCatyStream}
                />
              </>
            }
          />

          {/* Inline error row — only on `errored` phase. */}
          {catyPhase === 'errored' && catyError && (
            <div
              role="alert"
              style={{
                marginTop: 8,
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--ds-text-danger, #AE2A19)',
                background: 'var(--ds-background-danger, #FFECEB)',
                borderRadius: 4,
              }}
            >
              {catyError}
            </div>
          )}
        </div>
      ) : isEmpty ? (
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

/**
 * Walk an ADF doc and inject `url` into every `media` node that has an
 * `id` (Jira-synced upload) but no `url` (so adfToTiptap doesn't render
 * a broken image in the editor). The map keys are `jira_attachment_id`
 * AND `filename` — Jira's media node carries either one and we match
 * by whichever is present, same priority as the read renderer.
 *
 * Returns a NEW doc tree (no in-place mutation) so React's useMemo
 * dependency tracking still works. If no media nodes need injecting
 * we return the input unchanged to keep referential equality and skip
 * the editor remount cost.
 */
function injectMediaUrls(adf: AdfDoc, urlMap: Map<string, string>): AdfDoc {
  let mutated = false;

  const walk = (node: unknown): unknown => {
    if (!node || typeof node !== 'object') return node;
    const n = node as {
      type?: string;
      attrs?: Record<string, unknown>;
      content?: unknown[];
    };

    if (n.type === 'media') {
      const attrs = (n.attrs ?? {}) as {
        id?: string;
        url?: string;
        alt?: string;
      };
      const hasUrl = typeof attrs.url === 'string' && attrs.url.length > 0;
      if (!hasUrl) {
        const resolved =
          (attrs.id && urlMap.get(attrs.id)) ||
          (attrs.alt && urlMap.get(attrs.alt));
        if (resolved) {
          mutated = true;
          return { ...n, attrs: { ...attrs, url: resolved } };
        }
      }
      return n;
    }

    if (Array.isArray(n.content)) {
      const nextContent = n.content.map(walk);
      const childChanged = nextContent.some((c, i) => c !== n.content![i]);
      if (childChanged) {
        return { ...n, content: nextContent };
      }
    }
    return n;
  };

  const out = walk(adf) as AdfDoc;
  return mutated ? out : adf;
}
