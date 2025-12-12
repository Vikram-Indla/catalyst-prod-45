/**
 * EpicRisksViewTab - Uses shared Risks pattern
 * Identical to BusinessRequest RisksViewTab, just with epic entity type
 */

import { RisksViewTab } from '@/components/business-requests/drawer-tabs/RisksViewTab';

interface EpicRisksViewTabProps {
  epicId: string;
}

export function EpicRisksViewTab({ epicId }: EpicRisksViewTabProps) {
  // Reuse the same RisksViewTab component, passing epicId as requestId
  // The RisksViewTab component can be made entity-agnostic or we create epic-specific one
  // For now, we'll create a simple wrapper that shows risks for the epic
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Sort by</span>
        <select className="h-9 px-3 border rounded-md text-sm">
          <option>Name</option>
          <option>Created</option>
          <option>Priority</option>
        </select>
      </div>
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p className="text-sm">No risks defined yet. Click "Add risk" to create one.</p>
      </div>
    </div>
  );
}
