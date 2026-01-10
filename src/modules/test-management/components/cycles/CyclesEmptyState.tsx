/**
 * CyclesEmptyState - Empty state for test cycles
 * Based on Catalyst V5 Phase 5 spec
 */

import React from 'react';
import { RefreshCw, Plus, Search, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CyclesEmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'search' | 'folder';
}

export function CyclesEmptyState({
  title = 'No test cycles found',
  description = 'Create your first test cycle to start organizing test execution',
  actionLabel = 'Create Cycle',
  onAction,
  variant = 'default',
}: CyclesEmptyStateProps) {
  const icons = {
    default: RefreshCw,
    search: Search,
    folder: FolderOpen,
  };

  const Icon = icons[variant];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-xl border border-border">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {onAction && (
        <Button onClick={onAction} className="gap-2">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default CyclesEmptyState;
