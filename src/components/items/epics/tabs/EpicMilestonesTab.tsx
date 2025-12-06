import { MilestonesTab } from '@/components/milestones/MilestonesTab';

interface EpicMilestonesTabProps {
  epic: any;
}

export function EpicMilestonesTab({ epic }: EpicMilestonesTabProps) {
  return (
    <MilestonesTab 
      entityId={epic.id} 
      entityType="epic" 
      hideCategory={false} 
    />
  );
}
