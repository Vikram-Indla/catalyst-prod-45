/**
 * EpicLinksViewTab - Cloned from LinksViewTab
 * 
 * Changes:
 * - REMOVED: "Implementation Links" tile (moved to Features tab)
 * - Keep: Upload Documents, Knowledge Hub, External Link tiles
 */

import { UnifiedLinksTab } from '@/components/shared/UnifiedLinksTab';

interface EpicLinksViewTabProps {
  epicId: string;
}

export function EpicLinksViewTab({ epicId }: EpicLinksViewTabProps) {
  // Use the unified links tab component for epic entity
  return (
    <UnifiedLinksTab 
      entityType="epic" 
      entityId={epicId}
    />
  );
}
