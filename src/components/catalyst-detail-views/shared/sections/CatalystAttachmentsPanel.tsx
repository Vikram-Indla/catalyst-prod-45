/**
 * CatalystAttachmentsPanel — self-contained attachment section for all
 * CatalystView* components except Story (which has its own inline variant
 * with catalyst_attachments source switching).
 *
 * Mirrors CatalystViewStory's attachment block:
 *   - Reads from `ph_attachments` (Jira-synced rows) keyed by `issueId` (UUID)
 *   - Delegates render + CRUD to the canonical AttachmentsSection from
 *     story-detail-modules (Jira-parity table, drag-drop, preview modal)
 *   - Returns null when issueId or user is not yet resolved (avoids empty
 *     AttachmentsSection with a "0 attachments" header polluting the view)
 *
 * jira-compare 2026-05-08 — added for Defect / Task / Incident / Epic /
 * Feature / Subtask views, which all show an Attachments panel in Jira but
 * were missing it in Catalyst.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AttachmentsSection, type PhAttachment } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/AttachmentsSection';

interface CatalystAttachmentsPanelProps {
  /** ph_issues.id — UUID, NOT issue_key. Null while issue is loading. */
  issueId: string | null | undefined;
  /** For the attachment-download-all edge function URL and storage bucket path. */
  projectKey?: string | null;
  /** Mirror CatalystActivitySection: only fetch while the panel is open. */
  isOpen: boolean;
}

export function CatalystAttachmentsPanel({ issueId, projectKey, isOpen }: CatalystAttachmentsPanelProps) {
  const { user } = useAuth();

  const { data: attachments = [] } = useQuery({
    queryKey: ['ph-attachments', issueId],
    enabled: !!issueId && isOpen,
    staleTime: 30_000,
    queryFn: async (): Promise<PhAttachment[]> => {
      const { data } = await (supabase as any)
        .from('ph_attachments')
        .select('*')
        .eq('work_item_id', issueId!)
        .order('created_at', { ascending: false });
      return (data ?? []) as PhAttachment[];
    },
  });

  if (!issueId || !user?.id) return null;

  return (
    <AttachmentsSection
      attachments={attachments}
      itemId={issueId}
      userId={user.id}
      projectKey={projectKey ?? undefined}
      source="jira"
    />
  );
}
