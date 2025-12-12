/**
 * EpicDiscussionsViewTab - Uses shared CommentsSection
 * Identical pattern to BusinessRequest DiscussionsViewTab
 */

import { CommentsSection } from '@/components/shared/CommentsSection';

interface EpicDiscussionsViewTabProps {
  epicId: string;
}

export function EpicDiscussionsViewTab({ epicId }: EpicDiscussionsViewTabProps) {
  return (
    <div className="p-4 md:p-5 pb-6">
      <CommentsSection entityType="epics" entityId={epicId} />
    </div>
  );
}
