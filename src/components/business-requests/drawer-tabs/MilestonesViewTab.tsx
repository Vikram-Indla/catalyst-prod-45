import { MilestonesTab } from '@/components/milestones/MilestonesTab';

interface MilestonesViewTabProps {
  requestId: string;
}

export function MilestonesViewTab({ requestId }: MilestonesViewTabProps) {
  return (
    <div className="space-y-4">
      <MilestonesTab 
        entityId={requestId} 
        entityType="demand" 
        hideCategory={true} 
      />
    </div>
  );
}
