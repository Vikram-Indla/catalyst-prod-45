/**
 * RelatedLinksModal — shows linked work items for an issue key in a modal context.
 *
 * Reuses LinkedWorkItemsSection (canonical linked-work-items component) and
 * wraps it with modal affordances. Fetches linked items for the given issueKey.
 *
 * Used by: IssueHoverCard "View related links" action.
 */
import { useMemo } from 'react';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';

interface RelatedLinksModalProps {
  issueKey: string;
  onClose: () => void;
}

export default function RelatedLinksModal({ issueKey, onClose }: RelatedLinksModalProps) {
  // Extract project key from issueKey (e.g., "BAU-123" → "BAU")
  const projectKey = useMemo(() => {
    const match = issueKey.match(/^([A-Z]+)-/);
    return match ? match[1] : '';
  }, [issueKey]);

  if (!projectKey) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--ds-text-subtlest)' }}>
        Unable to determine project from issue key "{issueKey}"
      </div>
    );
  }

  return (
    <div style={{ maxHeight: 500, overflowY: 'auto' }}>
      <LinkedWorkItemsSection
        projectKey={projectKey}
        issueKey={issueKey}
        readOnly={false}
      />
    </div>
  );
}
