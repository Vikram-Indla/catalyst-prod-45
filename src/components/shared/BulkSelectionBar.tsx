/**
 * BulkSelectionBar - Enterprise-grade bulk action toolbar
 * 
 * Design principles:
 * - Uses semantic tokens for light/dark mode compatibility
 * - brand-primary used ONLY as thin accent border, not background
 * - Anchored to bottom of table container (sticky)
 * - Compact, enterprise density
 * 
 * Supports bulk actions:
 * - Move, Assign, Status, Priority, Link, Duplicate, Export, Delete
 */

import { useEffect, useCallback } from 'react';
import AkCloseIcon from '@atlaskit/icon/core/close';
import AkTrashIcon from '@atlaskit/icon/glyph/trash';
import AkFolderIcon from '@atlaskit/icon/core/folder-closed';
import AkPersonAddIcon from '@atlaskit/icon/core/person-add';
import AkCheckCircleIcon from '@atlaskit/icon/core/check-circle';
import AkFlagIcon from '@atlaskit/icon/core/flag';
import AkLinkIcon from '@atlaskit/icon/core/link';
import AkCopyIcon from '@atlaskit/icon/core/copy';
import AkDownloadIcon from '@atlaskit/icon/core/download';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface BulkAction {
  id: string;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
}

interface BulkSelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  actions?: BulkAction[];
  /** Primary action shortcuts */
  onDelete?: () => void;
  onUpdateStatus?: () => void;
  onAssign?: () => void;
  onMove?: () => void;
  onLink?: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
  onPriority?: () => void;
  /** Custom class name for positioning */
  className?: string;
  /** Whether to use fixed positioning (default) or sticky */
  positioning?: 'fixed' | 'sticky';
}

export function BulkSelectionBar({
  selectedCount,
  onClear,
  actions = [],
  onDelete,
  onUpdateStatus,
  onAssign,
  onMove,
  onLink,
  onDuplicate,
  onExport,
  onPriority,
  className,
  positioning = 'fixed',
}: BulkSelectionBarProps) {
  // ESC key to clear selection
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectedCount > 0) {
      onClear();
    }
  }, [selectedCount, onClear]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (selectedCount === 0) return null;

  // Build action list from props - order matches spec: Move, Assign, Status, Priority, Link, Duplicate, Export, Delete
  const allActions: BulkAction[] = [
    ...actions,
    ...(onMove ? [{
      id: 'move',
      label: 'Move',
      onClick: onMove,
      icon: <AkFolderIcon label="" size="small" />,
    }] : []),
    ...(onAssign ? [{
      id: 'assign',
      label: 'Assign',
      onClick: onAssign,
      icon: <AkPersonAddIcon label="" size="small" />,
    }] : []),
    ...(onUpdateStatus ? [{
      id: 'update-status',
      label: 'Status',
      onClick: onUpdateStatus,
      icon: <AkCheckCircleIcon label="" size="small" />,
    }] : []),
    ...(onPriority ? [{
      id: 'priority',
      label: 'Priority',
      onClick: onPriority,
      icon: <AkFlagIcon label="" size="small" />,
    }] : []),
    ...(onLink ? [{
      id: 'link',
      label: 'Link',
      onClick: onLink,
      icon: <AkLinkIcon label="" size="small" />,
    }] : []),
    ...(onDuplicate ? [{
      id: 'duplicate',
      label: 'Duplicate',
      onClick: onDuplicate,
      icon: <AkCopyIcon label="" size="small" />,
    }] : []),
    ...(onExport ? [{
      id: 'export',
      label: 'Export',
      onClick: onExport,
      icon: <AkDownloadIcon label="" size="small" />,
    }] : []),
    ...(onDelete ? [{
      id: 'delete',
      label: 'Delete',
      onClick: onDelete,
      variant: 'destructive' as const,
      icon: <AkTrashIcon label="" size="small" />,
    }] : []),
  ];

  const positionClasses = positioning === 'fixed' 
    ? 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50'
    : 'sticky bottom-3 mx-auto z-30';

  return (
    <div
      className={cn(
        positionClasses,
        'flex items-center gap-3 px-4 py-2.5',
        'rounded-lg border-t-2',
        'min-w-[400px] max-w-[600px]',
        className
      )}
      style={{
        backgroundColor: 'var(--selection-bar-bg)',
        border: '1px solid var(--selection-bar-border)',
        borderTopColor: 'var(--selection-bar-accent)',
        borderTopWidth: '2px',
        boxShadow: 'var(--selection-bar-shadow)',
      }}
      role="toolbar"
      aria-label={`${selectedCount} items selected`}
    >
      {/* Selected count badge */}
      <span
        className="inline-flex items-center px-2.5 py-1 text-sm font-medium rounded"
        style={{
          backgroundColor: 'var(--selection-badge-bg)',
          color: 'var(--selection-badge-text)',
        }}
      >
        {selectedCount} selected
      </span>

      {/* Clear selection button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="h-8 px-2 gap-1 text-sm hover:bg-[var(--surface-3)]"
        style={{ color: 'var(--text-2)' }}
      >
        <AkCloseIcon label="" size="small" />
        Clear
      </Button>

      {/* Divider */}
      {allActions.length > 0 && (
        <div 
          className="w-px h-5 mx-1" 
          style={{ backgroundColor: 'var(--border-color)' }}
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {allActions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
            size="sm"
            onClick={action.onClick}
            className={cn(
              'h-8 text-sm gap-1.5',
              action.variant !== 'destructive' && 'hover:bg-[var(--surface-3)]'
            )}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default BulkSelectionBar;
