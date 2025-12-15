/**
 * BulkSelectionBar - Enterprise-grade bulk action toolbar
 * 
 * Design principles:
 * - Uses semantic tokens for light/dark mode compatibility
 * - Brand-gold used ONLY as thin accent border, not background
 * - Anchored to bottom of table container (sticky)
 * - Compact, enterprise density
 */

import { useEffect, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
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

  // Build action list from props
  const allActions: BulkAction[] = [
    ...actions,
    ...(onUpdateStatus ? [{
      id: 'update-status',
      label: 'Update Status',
      onClick: onUpdateStatus,
    }] : []),
    ...(onAssign ? [{
      id: 'assign',
      label: 'Assign',
      onClick: onAssign,
    }] : []),
    ...(onDelete ? [{
      id: 'delete',
      label: 'Delete',
      onClick: onDelete,
      variant: 'destructive' as const,
      icon: <Trash2 className="h-4 w-4" />,
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
        <X className="h-4 w-4" />
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
