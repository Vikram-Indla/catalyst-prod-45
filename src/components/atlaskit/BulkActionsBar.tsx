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
  onMove?: () => void;
  onLink?: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
  onPriority?: () => void;
}

export function BulkActionsBar({ 
  selectedCount, 
  onClear, 
  onUpdateStatus, 
  onAssign, 
  onDelete,
  onMove,
  onLink,
  onDuplicate,
  onExport,
  onPriority,
}: BulkActionsBarProps) {
  return (
    <BulkSelectionBar
      selectedCount={selectedCount}
      onClear={onClear}
      onUpdateStatus={onUpdateStatus}
      onAssign={onAssign}
      onDelete={onDelete}
      onMove={onMove}
      onLink={onLink}
      onDuplicate={onDuplicate}
      onExport={onExport}
      onPriority={onPriority}
    />
  );
}

export default BulkActionsBar;
