import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useRoadmapStore } from '@/stores/roadmapStore';
import { format } from 'date-fns';

export function SyncModal() {
  const { isSyncModalOpen, closeSyncModal, pendingChanges, applyPendingChanges } = useRoadmapStore();
  const [updateWorkItems, setUpdateWorkItems] = useState(true);

  if (!isSyncModalOpen) return null;

  const handleSync = () => {
    if (updateWorkItems) {
      applyPendingChanges();
    } else {
      closeSyncModal();
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'MM/dd/yy');
  };

  const getChangeTypeLabel = (change: any) => {
    if (change.changeType === 'both') return 'Start & Due date';
    if (change.changeType === 'start_date') return 'Start date';
    return 'Due date';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
      <div className="w-[600px] max-w-[90vw] max-h-[80vh] bg-background rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Sync Changes</h2>
          <button
            onClick={closeSyncModal}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            View the changes you've made to the roadmap and choose how you want to sync back to the underlying work items.
          </p>

          {/* Changes Table */}
          <div className="border border-border rounded-lg overflow-hidden mb-5">
            <table className="w-full">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase px-3 py-3 border-b border-border">
                    ITEM
                  </th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase px-3 py-3 border-b border-border">
                    CHANGE
                  </th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase px-3 py-3 border-b border-border">
                    FROM
                  </th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase px-3 py-3 border-b border-border">
                    TO
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingChanges.map((change, index) => (
                  <tr key={change.id} className={index !== pendingChanges.length - 1 ? 'border-b border-border/50' : ''}>
                    <td className="px-3 py-3 text-sm font-medium text-foreground max-w-[180px] truncate">
                      {change.itemTitle}
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">
                      {getChangeTypeLabel(change)}
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground line-through">
                      {change.changeType === 'start_date' || change.changeType === 'both'
                        ? formatDate(change.originalStart)
                        : formatDate(change.originalEnd)}
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-primary">
                      {change.changeType === 'start_date' || change.changeType === 'both'
                        ? formatDate(change.newStart)
                        : formatDate(change.newEnd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
            <Checkbox
              id="update-work-items"
              checked={updateWorkItems}
              onCheckedChange={(checked) => setUpdateWorkItems(checked as boolean)}
            />
            <label
              htmlFor="update-work-items"
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              Update underlying work items with these changes
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-border">
          <Button variant="outline" onClick={closeSyncModal}>
            Cancel
          </Button>
          <Button onClick={handleSync}>
            Sync {pendingChanges.length} {pendingChanges.length === 1 ? 'change' : 'changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
