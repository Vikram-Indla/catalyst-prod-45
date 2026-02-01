// Aqd¹⁰ List Detail Page
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle, User, ArrowLeft } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AqdQuickAdd } from '../components/AqdQuickAdd';
import { AqdPriorityCard } from '../components/AqdPriorityCard';
import { AqdCarryoverBanner } from '../components/AqdCarryoverBanner';
import { AqdCheckoutModal } from '../components/AqdCheckoutModal';
import { AqdItemPanel } from '../components/AqdItemPanel';
import { AqdLayout } from '../components/AqdLayout';
import {
  useAqdListBySlug,
  useAqdCurrentWeek,
  useAqdItems,
  useCreateAqdItem,
  useDeleteAqdItem,
  useReorderAqdItems,
  useCycleAqdItemStatus,
  useConfirmCarryover,
  useConfirmAllCarryover,
  useDismissCarryover,
} from '@/hooks/useAqd';
import type { AqdItem } from '@/types/aqd';

export function AqdListDetailPage() {
  const { listSlug } = useParams<{ listSlug: string }>();
  const navigate = useNavigate();
  
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  const { data: list, isLoading: listLoading } = useAqdListBySlug(listSlug);
  const listId = list?.id;
  const { data: currentWeek, isLoading: weekLoading } = useAqdCurrentWeek(listId);
  const { data: items = [], isLoading: itemsLoading } = useAqdItems(currentWeek?.id);
  
  const createItem = useCreateAqdItem();
  const deleteItem = useDeleteAqdItem();
  const reorderItems = useReorderAqdItems();
  const cycleStatus = useCycleAqdItemStatus();
  const confirmCarryover = useConfirmCarryover();
  const confirmAllCarryover = useConfirmAllCarryover();
  const dismissCarryover = useDismissCarryover();

  // Split items into groups
  const { top10Items, overflowItems, carryoverItems } = useMemo(() => {
    const confirmed = items.filter(i => !i.is_carryover || i.carryover_confirmed);
    const carryover = items.filter(i => i.is_carryover && !i.carryover_confirmed);
    
    const top10 = confirmed.filter(i => i.rank <= 10);
    const overflow = confirmed.filter(i => i.rank > 10);
    
    return { top10Items: top10, overflowItems: overflow, carryoverItems: carryover };
  }, [items]);

  const handleAdd = (title: string, taskhubKey?: string) => {
    if (!listId || !currentWeek?.id) return;
    createItem.mutate({
      list_id: listId,
      week_id: currentWeek.id,
      title,
      taskhub_key: taskhubKey,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = top10Items.findIndex(i => i.id === active.id);
    const newIndex = top10Items.findIndex(i => i.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(top10Items, oldIndex, newIndex);
    const updates = reordered.map((item, idx) => ({ id: item.id, rank: idx + 1 }));
    reorderItems.mutate({ items: updates });
  };

  const isLoading = listLoading || weekLoading || itemsLoading;

  if (isLoading) {
    return (
      <AqdLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Skeleton className="h-12 w-64 mb-6" />
          <Skeleton className="h-20 w-full mb-6" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </AqdLayout>
    );
  }

  if (!list) {
    return (
      <AqdLayout>
        <div className="p-6 max-w-4xl mx-auto text-center py-12">
          <div className="text-muted-foreground">List not found</div>
          <Button variant="link" onClick={() => navigate('/aqd')}>
            Go back to lists
          </Button>
        </div>
      </AqdLayout>
    );
  }

  return (
    <AqdLayout>
      <div className={`p-6 max-w-4xl mx-auto transition-all ${selectedItemId ? 'mr-[400px]' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/aqd')}
              className="w-[42px] h-[42px] bg-foreground rounded-lg flex items-center justify-center text-background font-extrabold text-sm cursor-pointer hover:opacity-90 transition-opacity"
              title="Back to All Lists"
            >
              10
            </button>
            <div>
              <h1 className="font-semibold text-base">{list.name}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {currentWeek && (
                  <span>W{String(currentWeek.week_number).padStart(2, '0')} · {format(new Date(currentWeek.start_date), 'MMM d')} – {format(new Date(currentWeek.end_date), 'd')}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Week Navigator */}
            <div className="flex items-center bg-muted rounded-full px-1 py-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm font-medium">Current</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Checkout Button */}
            {top10Items.length > 0 && (
              <Button
                variant="outline"
                className="gap-2 border-orange-400 text-orange-600 hover:bg-orange-50"
                onClick={() => setIsCheckoutOpen(true)}
              >
                <CheckCircle className="h-4 w-4" />
                Checkout
              </Button>
            )}
          </div>
        </div>

        {/* Carryover Banner */}
        <AqdCarryoverBanner
          carryoverItems={carryoverItems}
          onConfirmAll={() => currentWeek && confirmAllCarryover.mutate(currentWeek.id)}
          onDismissAll={() => {
            carryoverItems.forEach(item => dismissCarryover.mutate(item.id));
          }}
        />

        {/* Quick Add */}
        <div className="mb-6">
          <AqdQuickAdd onAdd={handleAdd} disabled={!currentWeek} />
        </div>

        {/* Top 10 Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-semibold text-sm">Top 10 Priorities</h2>
            <Badge variant="secondary" className="text-xs">
              {top10Items.length} / 10
            </Badge>
          </div>

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={top10Items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {/* Carryover items first */}
                {carryoverItems.map(item => (
                  <AqdPriorityCard
                    key={item.id}
                    item={item}
                    onStatusCycle={() => {}}
                    onEdit={() => setSelectedItemId(item.id)}
                    onDelete={() => deleteItem.mutate(item.id)}
                    onConfirmCarryover={() => confirmCarryover.mutate(item.id)}
                    onDismissCarryover={() => dismissCarryover.mutate(item.id)}
                    isDraggable={false}
                  />
                ))}
                
                {/* Regular top 10 items */}
                {top10Items.map(item => (
                  <AqdPriorityCard
                    key={item.id}
                    item={item}
                    onStatusCycle={() => cycleStatus.mutate({ id: item.id, currentStatus: item.status })}
                    onEdit={() => setSelectedItemId(item.id)}
                    onDelete={() => deleteItem.mutate(item.id)}
                  />
                ))}
                
                {top10Items.length === 0 && carryoverItems.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground border border-dashed rounded-xl">
                    <div className="text-2xl mb-2">⭐</div>
                    <div className="text-sm">No priorities yet. Add your top 10 for this week.</div>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Overflow Section */}
        {overflowItems.length > 0 && (
          <Collapsible open={isOverflowOpen} onOpenChange={setIsOverflowOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between mb-2">
                <span>Optional Priorities (11–20)</span>
                <Badge variant="secondary">{overflowItems.length}</Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 mt-2">
                {overflowItems.map(item => (
                  <AqdPriorityCard
                    key={item.id}
                    item={item}
                    onStatusCycle={() => cycleStatus.mutate({ id: item.id, currentStatus: item.status })}
                    onEdit={() => setSelectedItemId(item.id)}
                    onDelete={() => deleteItem.mutate(item.id)}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Checkout Modal */}
        <AqdCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          weekId={currentWeek?.id || ''}
          items={top10Items}
        />

        {/* Item Panel */}
        <AqdItemPanel
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />
      </div>
    </AqdLayout>
  );
}
