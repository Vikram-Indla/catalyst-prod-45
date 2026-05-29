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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isAdfEmpty } from '@/components/shared/rich-text/atlaskit/adfHelpers';
import { useAuth } from '@/hooks/useAuth';
import { useCatyImprove } from '@/components/catalyst-detail-views/improve/catyImproveStore';
import { CatyStreamingOverlay } from '@/components/catalyst-detail-views/improve/CatyStreamingOverlay';
import { uploadDescriptionImage } from '@/components/shared/rich-text/atlaskit/supabaseImageUpload';
import type { PhIssue } from './types';

import { DisplayView } from './_components/DisplayView/DisplayView';
import { RichTextEditor } from './RichTextEditor';
import { type AdfDoc } from './utils/adfToTiptap';
import { catyMarkdownToAdf } from './utils/catyMarkdownToAdf';

interface DescriptionProps {
  issue: PhIssue | null;
  label?: string;
}

export function Description({ issue, label = 'Description' }: DescriptionProps) {
  const [editing, setEditing] = useState(false);
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

  const initialAdf: AdfDoc | null = useMemo(() => {
    const raw = (issue?.description_adf ?? null) as unknown;
    return (raw as AdfDoc) ?? null;
  }, [issue?.description_adf]);

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
      if (parts.acceptanceCriteria)
        update.acceptance_criteria = parts.acceptanceCriteria;
      await supabase
        .from('ph_issues')
        .update(update as never)
        .eq('issue_key', issue.issue_key);
      stopCatyImprove();
      setEditing(false);
      queryClient.invalidateQueries({
        queryKey: ['cv-issue-detail', issue.issue_key],
      });
    },
    [issue?.issue_key, queryClient, stopCatyImprove],
  );

  const handleCatyCancel = useCallback(() => {
    stopCatyImprove();
    setEditing(false);
  }, [stopCatyImprove]);

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
            initialAdf={initialAdf}
            onSave={(adfJson) => saveMutation.mutate(adfJson)}
            onCancel={() => setEditing(false)}
            isSaving={saveMutation.isPending}
            onImageUpload={handleImageUpload}
            onImproveClick={handleImproveFromToolbar}
            bodyOverlay={
              catyActiveForThisIssue && catyPayload ? (
                <CatyStreamingOverlay
                  key={catyPayload.issueKey}
                  issueKey={catyPayload.issueKey}
                  issueType={catyPayload.issueType}
                  issueSummary={catyPayload.issueSummary}
                  currentDescription={catyPayload.currentDescription}
                  currentAcceptanceCriteria={
                    catyPayload.currentAcceptanceCriteria
                  }
                  attachmentUrls={catyPayload.attachmentUrls}
                  improveSubType={catyPayload.improveSubType}
                  onApply={handleCatyApply}
                  onCancel={handleCatyCancel}
                />
              ) : undefined
            }
          />
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
