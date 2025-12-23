import { MilestonesTab } from '@/components/milestones/MilestonesTab';

interface MilestonesViewTabProps {
  requestId: string;
}

export function MilestonesViewTab({ requestId }: MilestonesViewTabProps) {
  return (
    <MilestonesTab 
      entityId={requestId} 
      entityType="demand" 
      hideCategory={true} 
    />
  );
}
