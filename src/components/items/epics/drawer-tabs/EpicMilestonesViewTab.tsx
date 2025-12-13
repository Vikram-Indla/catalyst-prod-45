/**
 * EpicMilestonesViewTab - Uses shared MilestonesTab component
 * Same implementation pattern as BusinessRequest MilestonesViewTab
 */

import { MilestonesTab } from '@/components/milestones/MilestonesTab';

interface EpicMilestonesViewTabProps {
  epicId: string;
}

export function EpicMilestonesViewTab({ epicId }: EpicMilestonesViewTabProps) {
  return (
    <MilestonesTab 
      entityId={epicId} 
      entityType="epic" 
      hideCategory={false} 
    />
  );
}
