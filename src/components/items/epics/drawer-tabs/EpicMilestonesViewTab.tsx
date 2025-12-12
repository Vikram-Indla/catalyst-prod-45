/**
 * EpicMilestonesViewTab - Identical to BusinessRequest MilestonesViewTab
 */

import { MilestonesViewTab } from '@/components/business-requests/drawer-tabs/MilestonesViewTab';

interface EpicMilestonesViewTabProps {
  epicId: string;
}

export function EpicMilestonesViewTab({ epicId }: EpicMilestonesViewTabProps) {
  // Reuse the shared MilestonesViewTab - just different entity binding
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Sort by</span>
        <select className="h-9 px-3 border rounded-md text-sm">
          <option>Name</option>
          <option>Due Date</option>
        </select>
      </div>
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p className="text-sm">No milestones defined yet. Click "Add milestone" to create one.</p>
      </div>
    </div>
  );
}
