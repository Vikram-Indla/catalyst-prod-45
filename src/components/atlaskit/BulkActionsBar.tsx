/**
 * BulkActionsBar - Atlaskit-style bulk actions bar
 * Uses the shared BulkSelectionBar component for enterprise-grade styling
 */

import { BulkSelectionBar } from '@/components/shared/BulkSelectionBar';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onUpdateStatus?: () => void;
  onAssign?: () => void;
  onDelete?: () => void;
}

export function BulkActionsBar({ 
  selectedCount, 
  onClear, 
  onUpdateStatus, 
  onAssign, 
  onDelete 
}: BulkActionsBarProps) {
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

export default BulkActionsBar;
