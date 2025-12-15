/**
 * DemandBulkActionsBar - Bulk actions for demand/business request lists
 * Uses the shared BulkSelectionBar component for enterprise-grade styling
 */

import { BulkSelectionBar } from '@/components/shared/BulkSelectionBar';

interface DemandBulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onUpdateStatus?: () => void;
  onAssign?: () => void;
  onDelete?: () => void;
}

export function DemandBulkActionsBar({ 
  selectedCount, 
  onClear, 
  onUpdateStatus, 
  onAssign, 
  onDelete 
}: DemandBulkActionsBarProps) {
  return (
    <BulkSelectionBar
      selectedCount={selectedCount}
      onClear={onClear}
      onUpdateStatus={onUpdateStatus}
      onAssign={onAssign}
      onDelete={onDelete}
    />
  );
}

export default DemandBulkActionsBar;
