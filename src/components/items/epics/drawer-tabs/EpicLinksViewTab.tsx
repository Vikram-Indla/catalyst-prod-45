/**
 * EpicLinksViewTab - Cloned from LinksViewTab
 * 
 * Changes:
 * - REMOVED: "Implementation Links" tile (moved to Features tab)
 * - REMOVED: "Knowledge Hub" tile
 * - Keep: Upload Documents, External Link tiles only
 */

import { UnifiedLinksTab } from '@/components/shared/UnifiedLinksTab';

interface EpicLinksViewTabProps {
  epicId: string;
}

export function EpicLinksViewTab({ epicId }: EpicLinksViewTabProps) {
  // Use the unified links tab component for epic entity
  // Hide Implementation Links (moved to Features tab) and Knowledge Hub
  return (
    <UnifiedLinksTab 
      entityType="epic" 
      entityId={epicId}
      hideTiles={['implementation', 'knowledge-hub']}
    />
  );
}
