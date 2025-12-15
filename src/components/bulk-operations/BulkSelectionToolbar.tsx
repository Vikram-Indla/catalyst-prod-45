/**
 * BulkSelectionToolbar - Enterprise-grade bulk selection toolbar
 * 
 * Uses semantic theme tokens for light/dark mode compatibility.
 * Brand-gold used ONLY as thin accent, not as large background.
 */

import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, ArrowRightLeft, Trash2, ChevronDown, X } from 'lucide-react';
import { BulkOperationType, BulkOperationConfig } from './types';

interface BulkSelectionToolbarProps {
  selectedCount: number;
  config: BulkOperationConfig;
  onAction: (action: BulkOperationType) => void;
  onClearSelection: () => void;
}

export function BulkSelectionToolbar({
  selectedCount,
  config,
  onAction,
  onClearSelection,
}: BulkSelectionToolbarProps) {
  // ESC key to clear selection
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectedCount > 0) {
      onClearSelection();
    }
  }, [selectedCount, onClearSelection]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (selectedCount === 0) return null;

  const { allowedOperations, entityLabelPlural } = config;

  return (
    <div 
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg border-t-2"
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
      
      {/* Clear button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="h-8 px-2 gap-1 text-sm hover:bg-[var(--surface-3)]"
        style={{ color: 'var(--text-2)' }}
      >
        <X className="h-4 w-4" />
        Clear
      </Button>

      {/* Divider */}
      <div 
        className="w-px h-5 mx-1" 
        style={{ backgroundColor: 'var(--border-color)' }}
      />

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 h-8"
            style={{
              borderColor: 'var(--accent-color)',
              color: 'var(--accent-color)',
            }}
          >
            Bulk Actions
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-56"
          style={{
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-color)',
          }}
        >
          {allowedOperations.includes('edit') && (
            <DropdownMenuItem onClick={() => onAction('edit')} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Fields
              <span className="ml-auto text-xs" style={{ color: 'var(--text-3)' }}>
                Update {selectedCount} {selectedCount === 1 ? config.entityLabel : entityLabelPlural}
              </span>
            </DropdownMenuItem>
          )}
          
          {allowedOperations.includes('transition') && (
            <DropdownMenuItem onClick={() => onAction('transition')} className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Change Status
              <span className="ml-auto text-xs" style={{ color: 'var(--text-3)' }}>
                Transition workflow
              </span>
            </DropdownMenuItem>
          )}
          
          {(allowedOperations.includes('edit') || allowedOperations.includes('transition')) && 
            allowedOperations.includes('delete') && <DropdownMenuSeparator />}
          
          {allowedOperations.includes('delete') && (
            <DropdownMenuItem 
              onClick={() => onAction('delete')} 
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
              <span className="ml-auto text-xs">
                {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
