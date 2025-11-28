import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EpicMilestonesTabProps {
  epic: any;
}

export function EpicMilestonesTab({ epic }: EpicMilestonesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Track key milestones for this epic
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      </div>

      <div className="border rounded-lg divide-y">
        <div className="p-4 text-center text-sm text-muted-foreground">
          No milestones defined yet
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Milestones help track progress and communicate key delivery dates
      </div>
    </div>
  );
}
