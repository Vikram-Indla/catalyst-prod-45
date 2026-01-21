/**
 * Module 3B-2: Main queue manager container
 */

import React, { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ListOrdered } from 'lucide-react';
import { useQueueManagement } from '../../hooks/useQueueManagement';
import { useQueueDragDrop } from '../../hooks/useQueueDragDrop';
import { useQueueSelection } from '../../hooks/useQueueSelection';
import { QueueToolbar } from './QueueToolbar';
import { QueueItem } from './QueueItem';
import { BulkActionsBar } from './BulkActionsBar';
import type { PriorityLevel } from '../../types/queue-management';

interface QueueManagerProps {
  runId: string;
  maxHeight?: string;
  className?: string;
}

export function QueueManager({ runId, maxHeight = '600px', className }: QueueManagerProps) {
  const queue = useQueueManagement(runId);
  const selection = useQueueSelection();

  // Drag-drop handler
  const handleReorder = useCallback((itemId: string, newPosition: number) => {
    queue.reorder({ itemId, newPosition });
  }, [queue]);

  const dragDrop = useQueueDragDrop(handleReorder);

  // Item IDs for selection
  const itemIds = useMemo(() => queue.items.map(item => item.id), [queue.items]);
  const maxPosition = queue.items.length;

  // Bulk action handlers
  const handleBulkMoveToTop = useCallback(() => {
    queue.moveToTop({ runId, itemIds: selection.getSelectedIds() });
    selection.clearSelection();
  }, [queue, runId, selection]);

  const handleBulkMoveToBottom = useCallback(() => {
    queue.moveToBottom({ runId, itemIds: selection.getSelectedIds() });
    selection.clearSelection();
  }, [queue, runId, selection]);

  const handleBulkChangePriority = useCallback((priority: PriorityLevel) => {
    queue.changePriority({ runId, itemIds: selection.getSelectedIds(), newPriority: priority });
    selection.clearSelection();
  }, [queue, runId, selection]);

  const handleBulkRemove = useCallback(() => {
    queue.removeItems({ runId, itemIds: selection.getSelectedIds() });
    selection.clearSelection();
  }, [queue, runId, selection]);

  // Select all handler
  const handleSelectAll = useCallback(() => {
    if (selection.selectedCount === itemIds.length) {
      selection.clearSelection();
    } else {
      selection.selectAll(itemIds);
    }
  }, [selection, itemIds]);

  // Single item handlers
  const createItemHandlers = useCallback((item: typeof queue.items[0]) => ({
    onMoveUp: () => queue.reorder({ itemId: item.id, newPosition: item.position - 1 }),
    onMoveDown: () => queue.reorder({ itemId: item.id, newPosition: item.position + 1 }),
    onMoveToTop: () => queue.moveToTop({ runId, itemIds: [item.id] }),
    onMoveToBottom: () => queue.moveToBottom({ runId, itemIds: [item.id] }),
    onChangePriority: (priority: PriorityLevel) => 
      queue.changePriority({ runId, itemIds: [item.id], newPriority: priority }),
    onRemove: () => queue.removeItems({ runId, itemIds: [item.id] }),
  }), [queue, runId]);

  if (queue.isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListOrdered className="h-4 w-4" />
            Test Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn('', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-muted-foreground" />
            Test Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <QueueToolbar
            filters={queue.filters}
            onFilterChange={queue.updateFilter}
            onClearFilters={queue.clearFilters}
            onSortByPriority={queue.sortByPriority}
            total={queue.total}
          />

          {/* Select All */}
          {queue.items.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-md">
              <Checkbox
                checked={selection.selectedCount === itemIds.length && itemIds.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all ({itemIds.length} items)
              </span>
            </div>
          )}

          {/* Queue Items */}
          <ScrollArea style={{ height: maxHeight }}>
            <div className="space-y-2 pr-4">
              {queue.items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ListOrdered className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No items in queue</p>
                  <p className="text-sm">Add test cases to start execution</p>
                </div>
              ) : (
                queue.items.map((item) => {
                  const handlers = createItemHandlers(item);
                  return (
                    <QueueItem
                      key={item.id}
                      item={item}
                      maxPosition={maxPosition}
                      isSelected={selection.isSelected(item.id)}
                      isDragging={dragDrop.isDraggedItem(item.id)}
                      isDragOver={dragDrop.isDragOverItem(item.id)}
                      onSelect={(e) => selection.handleClick(e, item.id, itemIds)}
                      onToggleSelect={() => selection.toggle(item.id)}
                      onMoveUp={handlers.onMoveUp}
                      onMoveDown={handlers.onMoveDown}
                      onMoveToTop={handlers.onMoveToTop}
                      onMoveToBottom={handlers.onMoveToBottom}
                      onChangePriority={handlers.onChangePriority}
                      onRemove={handlers.onRemove}
                      onDragStart={(e) => dragDrop.handleDragStart(e, item.id)}
                      onDragOver={(e) => dragDrop.handleDragOver(e, item.id)}
                      onDragLeave={dragDrop.handleDragLeave}
                      onDrop={(e) => dragDrop.handleDrop(e, item.id, item.position)}
                      onDragEnd={dragDrop.handleDragEnd}
                    />
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selection.selectedCount}
        onMoveToTop={handleBulkMoveToTop}
        onMoveToBottom={handleBulkMoveToBottom}
        onChangePriority={handleBulkChangePriority}
        onRemove={handleBulkRemove}
        onClearSelection={selection.clearSelection}
      />
    </>
  );
}
