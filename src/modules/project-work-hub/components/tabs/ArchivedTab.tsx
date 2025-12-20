import React from 'react';
import { Archive, RotateCcw, Loader2 } from 'lucide-react';
import { useArchivedItems, useRestoreItem } from '../../hooks/useArchivedItems';
import { WorkTypeIcon } from '../WorkTypeIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ArchivedTabProps {
  projectId: string;
}

export const ArchivedTab: React.FC<ArchivedTabProps> = ({ projectId }) => {
  const { data: archivedItems, isLoading } = useArchivedItems(projectId);
  const restoreItem = useRestoreItem();

  const handleRestore = (itemId: string, itemType: 'FEATURE' | 'STORY') => {
    restoreItem.mutate({ itemId, itemType });
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-background min-h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-background min-h-full">
      {/* Header */}
      <div className="text-sm text-muted-foreground mb-2">
        Spaces / Project
      </div>

      <h2 className="text-2xl font-medium text-foreground mb-6">
        Archived work items
      </h2>

      {(!archivedItems || archivedItems.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Archive className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium text-foreground mb-2">
            No archived work items
          </h3>
          <p className="text-sm text-muted-foreground max-w-[400px]">
            When you archive work items, they will appear here. You can restore them at any time.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_100px_120px_150px_100px] bg-muted px-4 py-2 text-[11px] font-semibold uppercase text-muted-foreground border-b border-border">
            <div>Item</div>
            <div>Type</div>
            <div>Status</div>
            <div>Archived</div>
            <div>Actions</div>
          </div>

          {/* Table Rows */}
          {archivedItems.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_100px_120px_150px_100px] px-4 py-3 border-b border-border bg-card items-center hover:bg-muted/50 transition-colors"
            >
              {/* Item */}
              <div className="flex items-center gap-2">
                <WorkTypeIcon type={item.type} size="small" />
                <span className="text-xs text-muted-foreground">{item.key}</span>
                <span className="text-sm text-foreground">{item.summary}</span>
              </div>

              {/* Type */}
              <div>
                <Badge variant="secondary" className="text-xs">
                  {item.type}
                </Badge>
              </div>

              {/* Status */}
              <div className="text-sm text-muted-foreground capitalize">
                {item.status.replace('_', ' ')}
              </div>

              {/* Archived Date */}
              <div className="text-sm text-muted-foreground">
                {item.deletedAt ? format(new Date(item.deletedAt), 'MMM d, yyyy') : '—'}
              </div>

              {/* Actions */}
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRestore(item.id, item.type as 'FEATURE' | 'STORY')}
                  disabled={restoreItem.isPending}
                  className="gap-1"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restore
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
