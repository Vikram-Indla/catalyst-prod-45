// Aqd¹⁰ List Detail Page - Enhanced with All 10 Slots
import '@/styles/aqd-priority.css';
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle, GripVertical, User, Calendar, MoreHorizontal } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { AqdQuickAdd } from '../components/AqdQuickAdd';
import { AqdCarryoverBanner } from '../components/AqdCarryoverBanner';
import { AqdCheckoutModal } from '../components/AqdCheckoutModal';
import { AqdItemPanel } from '../components/AqdItemPanel';
import { AqdLayout } from '../components/AqdLayout';
import { AqdProgressBar } from '../components/AqdProgressBar';
import { AqdEmptySlot } from '../components/AqdEmptySlot';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  useAqdListBySlug,
  useAqdCurrentWeek,
  useAqdItems,
  useCreateAqdItem,
  useDeleteAqdItem,
  useReorderAqdItems,
  useCycleAqdItemStatus,
  useUpdateAqdItem,
  useConfirmCarryover,
  useConfirmAllCarryover,
  useDismissCarryover,
} from '@/hooks/useAqd';
import type { AqdItem, AqdItemStatus } from '@/types/aqd';
import { STATUS_CONFIG, AQD_LABEL_COLORS } from '@/types/aqd';

const TOTAL_SLOTS = 10;

// Helper to format week date range with cross-month support
const formatWeekRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
};

// Status mapping
const statusMap: Record<AqdItemStatus, 'todo' | 'progress' | 'done'> = {
  'not_started': 'todo',
  'in_progress': 'progress',
  'completed': 'done',
};

const statusLabels: Record<string, string> = {
  todo: 'To Do',
  progress: 'In Progress',
  done: 'Done',
};

// Enhanced Priority Item using CSS classes
interface PriorityItemProps {
  item: AqdItem;
  rank: number;
  onStatusCycle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTitleUpdate: (newTitle: string) => void;
  onConfirmCarryover?: () => void;
  onDismissCarryover?: () => void;
  isDraggable?: boolean;
}

function PriorityItem({
  item,
  rank,
  onStatusCycle,
  onEdit,
  onDelete,
  onTitleUpdate,
  onConfirmCarryover,
  onDismissCarryover,
  isDraggable = true,
}: PriorityItemProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(item.title);
  const isCarryover = item.is_carryover && !item.carryover_confirmed;
  const statusKey = statusMap[item.status];
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
    disabled: !isDraggable || isCarryover,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // CORRECTION #9: Handle double-click to edit title
  const handleTitleDoubleClick = () => {
    setIsEditingTitle(true);
    setEditedTitle(item.title);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (editedTitle.trim() && editedTitle !== item.title) {
      onTitleUpdate(editedTitle.trim());
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setEditedTitle(item.title);
      setIsEditingTitle(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("aqd-item", isCarryover && "aqd-item--carryover")}>
      {/* Drag Handle */}
      <span className="aqd-drag-handle" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </span>
      
      {/* Rank Badge */}
      <div className={cn('aqd-rank', `aqd-rank--${rank}`)}>
        {rank}
      </div>
      
      {/* Main Content */}
      <div className="aqd-item-main">
        {/* CORRECTION #9: Inline title editing with double-click */}
        {isEditingTitle ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="aqd-item-title-input w-full text-sm font-medium border border-primary rounded px-2 py-1 outline-none"
            autoFocus
          />
        ) : (
          <div 
            className={cn("aqd-item-title cursor-text", item.status === 'completed' && "line-through text-gray-400")}
            onDoubleClick={handleTitleDoubleClick}
            title="Double-click to edit"
          >
            {item.title}
          </div>
        )}
        
        <div className="aqd-item-meta">
          {item.taskhub_key && (
            <span className="aqd-meta-key">{item.taskhub_key}</span>
          )}
          {item.assignee_name && (
            <span className="aqd-meta-item">
              <User size={14} />
              @{item.assignee_name}
            </span>
          )}
          {item.due_date && (
            <span className="aqd-meta-item">
              <Calendar size={14} />
              {format(new Date(item.due_date), 'MMM d')}
            </span>
          )}
          {item.labels.map(label => (
            <span
              key={label.id}
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                color: AQD_LABEL_COLORS[label.color]?.text || '#475569',
                border: `1.5px solid ${AQD_LABEL_COLORS[label.color]?.border || '#cbd5e1'}`,
                background: 'transparent',
              }}
            >
              {label.name}
            </span>
          ))}
          {isCarryover && (
            <span className="aqd-meta-project" style={{ background: '#fef3c7', color: '#d97706' }}>
              From Last Week
            </span>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="aqd-item-actions">
        {isCarryover ? (
          <>
            <button className="aqd-status aqd-status--done" onClick={onConfirmCarryover}>
              Confirm
            </button>
            <button className="aqd-more-btn" onClick={onDismissCarryover}>
              Dismiss
            </button>
          </>
        ) : (
          <>
            <button 
              className={cn('aqd-status', `aqd-status--${statusKey}`)}
              onClick={onStatusCycle}
            >
              <span className="aqd-status-dot" />
              {statusLabels[statusKey]}
            </button>
            <button className="aqd-more-btn" onClick={onEdit}>
              <MoreHorizontal size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

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
  const updateItem = useUpdateAqdItem();
  const confirmCarryover = useConfirmCarryover();
  const confirmAllCarryover = useConfirmAllCarryover();
  const dismissCarryover = useDismissCarryover();

  // Split items into groups and create all 10 slots
  const { slots, overflowItems, carryoverItems, filledCount } = useMemo(() => {
    const confirmed = items.filter(i => !i.is_carryover || i.carryover_confirmed);
    const carryover = items.filter(i => i.is_carryover && !i.carryover_confirmed);
    
    const top10 = confirmed.filter(i => i.rank <= 10);
    const overflow = confirmed.filter(i => i.rank > 10);
    
    // Create array of all 10 slots
    const allSlots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
      const rank = i + 1;
      const priority = top10.find(p => p.rank === rank);
      return { rank, priority };
    });
    
    return { 
      slots: allSlots, 
      overflowItems: overflow, 
      carryoverItems: carryover,
      filledCount: top10.length,
    };
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

    const filledItems = slots.filter(s => s.priority).map(s => s.priority!);
    const oldIndex = filledItems.findIndex(i => i.id === active.id);
    const newIndex = filledItems.findIndex(i => i.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(filledItems, oldIndex, newIndex);
    const updates = reordered.map((item, idx) => ({ id: item.id, rank: idx + 1 }));
    reorderItems.mutate({ items: updates });
  };

  const handleEmptySlotClick = (rank: number) => {
    // Focus the quick add input when clicking an empty slot
    const input = document.querySelector('.aqd-add-field') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  };

  const isLoading = listLoading || weekLoading || itemsLoading;

  if (isLoading) {
    return (
      <AqdLayout>
        <div className="aqd-priority-view">
          <div className="p-6">
            <Skeleton className="h-12 w-64 mb-6" />
            <Skeleton className="h-20 w-full mb-6" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </AqdLayout>
    );
  }

  if (!list) {
    return (
      <AqdLayout>
        <div className="aqd-priority-view">
          <div className="p-6 text-center py-12">
            <div className="text-gray-500">List not found</div>
            <Button variant="link" onClick={() => navigate('/aqd')}>
              Go back to lists
            </Button>
          </div>
        </div>
      </AqdLayout>
    );
  }

  const sortableIds = slots.filter(s => s.priority).map(s => s.priority!.id);

  return (
    <AqdLayout>
      <div className={cn("aqd-priority-view", selectedItemId && "mr-[400px]")}>
        {/* Header */}
        <div className="aqd-header">
          <div className="aqd-brand">
            <div 
              className="aqd-brand-badge cursor-pointer"
              onClick={() => navigate('/aqd')}
              title="Back to All Lists"
            >
              10
            </div>
            <div>
              <h1 className="aqd-brand-title">{list.name}</h1>
              <p className="aqd-brand-subtitle">
                {currentWeek && (
                  <>
                    W{String(currentWeek.week_number).padStart(2, '0')} · {formatWeekRange(currentWeek.start_date, currentWeek.end_date)}
                    {list.created_by_name && ` · 👤 ${list.created_by_name}`}
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="aqd-week-nav">
              <button className="aqd-week-btn"><ChevronLeft size={16} /></button>
              <span className="aqd-week-label">Current</span>
              <button className="aqd-week-btn" disabled><ChevronRight size={16} /></button>
            </div>
            {filledCount > 0 && (
              <button className="aqd-checkout-btn" onClick={() => setIsCheckoutOpen(true)}>
                <CheckCircle size={18} />
                Checkout
              </button>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <AqdProgressBar filled={filledCount} total={TOTAL_SLOTS} />
        
        {/* Body */}
        <div className="aqd-body">
          {/* Carryover Banner */}
          <AqdCarryoverBanner
            carryoverItems={carryoverItems}
            onConfirmAll={() => currentWeek && confirmAllCarryover.mutate(currentWeek.id)}
            onDismissAll={() => {
              carryoverItems.forEach(item => dismissCarryover.mutate(item.id));
            }}
          />
          
          {/* Add Input */}
          <div className="aqd-add-input">
            <div className="aqd-add-icon">+</div>
            <input
              type="text"
              className="aqd-add-field"
              placeholder="Add a priority or enter TaskHub key (e.g., PLN-001)..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = e.target as HTMLInputElement;
                  const value = target.value.trim();
                  if (value) {
                    const isTaskKey = /^[A-Z]{2,4}-\d+$/i.test(value);
                    handleAdd(value, isTaskKey ? value.toUpperCase() : undefined);
                    target.value = '';
                  }
                }
              }}
            />
            <div className="aqd-add-hint">
              <kbd>↵</kbd> to add
            </div>
          </div>
          
          {/* Section Header */}
          <div className="aqd-section-header">
            <span className="aqd-section-title">Top 10 Priorities</span>
            <span className="aqd-section-count">{filledCount} / {TOTAL_SLOTS}</span>
          </div>
          
          {/* Priority List - ALL 10 SLOTS */}
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <div className="aqd-priority-list">
                {/* Carryover items first */}
                {carryoverItems.map(item => (
                  <PriorityItem
                    key={item.id}
                    item={item}
                    rank={item.rank}
                    onStatusCycle={() => {}}
                    onEdit={() => setSelectedItemId(item.id)}
                    onDelete={() => deleteItem.mutate(item.id)}
                    onTitleUpdate={(newTitle) => updateItem.mutate({ id: item.id, title: newTitle })}
                    onConfirmCarryover={() => confirmCarryover.mutate(item.id)}
                    onDismissCarryover={() => dismissCarryover.mutate(item.id)}
                    isDraggable={false}
                  />
                ))}
                
                {/* All 10 slots */}
                {slots.map(({ rank, priority }) => (
                  priority ? (
                    <PriorityItem
                      key={priority.id}
                      item={priority}
                      rank={rank}
                      onStatusCycle={() => cycleStatus.mutate({ id: priority.id, currentStatus: priority.status })}
                      onEdit={() => setSelectedItemId(priority.id)}
                      onDelete={() => deleteItem.mutate(priority.id)}
                      onTitleUpdate={(newTitle) => updateItem.mutate({ id: priority.id, title: newTitle })}
                    />
                  ) : (
                    <AqdEmptySlot 
                      key={`empty-${rank}`} 
                      rank={rank} 
                      onClick={() => handleEmptySlotClick(rank)}
                    />
                  )
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          {/* Overflow Section */}
          {overflowItems.length > 0 && (
            <div className="mt-6">
              <Collapsible open={isOverflowOpen} onOpenChange={setIsOverflowOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between mb-2">
                    <span>Optional Priorities (11–20)</span>
                    <Badge variant="secondary">{overflowItems.length}</Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="aqd-priority-list mt-2">
                    {overflowItems.map(item => (
                      <PriorityItem
                        key={item.id}
                        item={item}
                        rank={item.rank}
                        onStatusCycle={() => cycleStatus.mutate({ id: item.id, currentStatus: item.status })}
                        onEdit={() => setSelectedItemId(item.id)}
                        onDelete={() => deleteItem.mutate(item.id)}
                        onTitleUpdate={(newTitle) => updateItem.mutate({ id: item.id, title: newTitle })}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>

        {/* Checkout Modal */}
        <AqdCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          weekId={currentWeek?.id || ''}
          items={slots.filter(s => s.priority).map(s => s.priority!)}
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
