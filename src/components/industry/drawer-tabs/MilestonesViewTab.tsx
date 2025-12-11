import { Milestone } from 'lucide-react';
import { BusinessRequest } from '@/types/business-request';

interface MilestonesViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function MilestonesViewTab({ data }: MilestonesViewTabProps) {
  return (
    <div className="p-6">
      <div className="text-center py-12 text-muted-foreground">
        <Milestone className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">Milestones Coming Soon</h3>
        <p className="text-sm max-w-md mx-auto">
          Track key milestones and deliverables for this demand request. 
          This feature is under development.
        </p>
      </div>
    </div>
  );
}
