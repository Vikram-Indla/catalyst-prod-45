/**
 * BulkActionsBar - Capacity planning bulk actions
 * Uses the shared BulkSelectionBar component for enterprise-grade styling
 */

import { Download } from 'lucide-react';
import { BulkSelectionBar, BulkAction } from '@/components/shared/BulkSelectionBar';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onExport?: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClear,
  onDelete,
  onExport,
}: BulkActionsBarProps) {
  const actions: BulkAction[] = [];

  if (onExport) {
    actions.push({
      id: 'export',
      label: 'Export',
      onClick: onExport,
      icon: <Download className="h-4 w-4" />,
    });
  }

  return (
    <BulkSelectionBar
      selectedCount={selectedCount}
      onClear={onClear}
      onDelete={onDelete}
      actions={actions}
    />
  );
}
