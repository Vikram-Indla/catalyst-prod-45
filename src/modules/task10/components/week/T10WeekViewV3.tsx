// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10WeekViewV3
// Purpose: Main week view detail page matching the provided spec
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, ChevronLeft, ChevronRight, Calendar, 
  Zap, ChevronDown, Plus, Check, Layers, Info,
  AlertCircle, GripVertical, User, X
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useT10ListById,
  useT10Weeks,
  useT10Items,
  useT10BufferItems,
  useT10ToggleItemStatus,
  useT10CreateItem,
  useT10ReorderItems,
  useT10SwapWithTen,
  useT10PromoteToTop10,
  useT10DeleteItem,
} from '../../hooks';
import { useT10AISuggestions, useAddSuggestionToT10 } from '../../hooks/useT10AISuggestions';
import { T10SidePanelNew } from '../panel/T10SidePanelNew';
import { T10CheckoutModalNew } from '../modals/T10CheckoutModalNew';
import { T10LabelDropdown } from './T10LabelDropdown';
import { formatT10WeekRange, formatShortDate, getDueStatus } from '../../utils';
import type { T10ItemFull } from '../../types';
import '../../styles/task10-detail.css';

// ═══════════════════════════════════════════════════════════════════════════════
// SORTABLE PRIORITY ITEM
// ═══════════════════════════════════════════════════════════════════════════════

interface SortablePriorityItemProps {
  item: T10ItemFull;
  onClick: () => void;
  onToggleStatus: () => void;
  onLabelsChange?: () => void;
  onRemove: () => void;
}

function SortablePriorityItem({ item, onClick, onToggleStatus, onLabelsChange, onRemove }: SortablePriorityItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  const isCompleted = item.status === 'done';
  const dueStatus = item.due_date ? getDueStatus(item.due_date) : 'normal';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`t10-detail-priority-item ${isCompleted ? 't10-detail-priority-item-completed' : ''} ${isDragging ? 't10-detail-priority-item-dragging' : ''}`}
      onClick={onClick}
    >
      {/* Drag Handle - 6-dot pattern via inline styles for CSS isolation */}
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 14,
          height: 24,
          cursor: 'grab',
          flexShrink: 0,
          background: `
            radial-gradient(circle at 2px 2px, #94a3b8 2px, transparent 2px),
            radial-gradient(circle at 10px 2px, #94a3b8 2px, transparent 2px),
            radial-gradient(circle at 2px 10px, #94a3b8 2px, transparent 2px),
            radial-gradient(circle at 10px 10px, #94a3b8 2px, transparent 2px),
            radial-gradient(circle at 2px 18px, #94a3b8 2px, transparent 2px),
            radial-gradient(circle at 10px 18px, #94a3b8 2px, transparent 2px)
          `,
          backgroundSize: '14px 24px',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Rank Badge - solid blue for all 1-10 */}
      <div
        style={{
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 17,
          fontWeight: 700,
          color: '#ffffff',
          background: '#2563eb',
          borderRadius: 12,
          flexShrink: 0,
        }}
      >
        {item.rank}
      </div>

      {/* Content */}
      <div className="t10-detail-priority-content">
        <span className="t10-detail-priority-text">{item.title}</span>
        <div className="t10-detail-priority-meta">
          {/* Labels Dropdown */}
          <div onClick={(e) => e.stopPropagation()}>
            <T10LabelDropdown
              itemId={item.id}
              currentLabels={item.labels || []}
              onLabelsChange={onLabelsChange}
            />
          </div>
          
          {item.assignee_name && (
            <span className="t10-detail-priority-assignee">
              <User size={14} className="t10-detail-priority-assignee-avatar" />
              {item.assignee_name}
            </span>
          )}
          {item.due_date && (
            <span className={`t10-detail-priority-due ${dueStatus === 'overdue' ? 't10-detail-priority-due-overdue' : ''} ${dueStatus === 'today' ? 't10-detail-priority-due-today' : ''}`}>
              <Calendar size={12} />
              {formatShortDate(item.due_date)}
            </span>
          )}
        </div>
      </div>

      {/* Remove Button */}
      <button
        className="t10-detail-remove-btn"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Remove item"
      >
        <X size={16} strokeWidth={2} />
      </button>

      {/* Checkbox */}
      <div
        className="t10-detail-checkbox"
        onClick={(e) => {
          e.stopPropagation();
          onToggleStatus();
        }}
      >
        <input
          type="checkbox"
          className="t10-detail-checkbox-input"
          checked={isCompleted}
          onChange={() => {}}
        />
        <div className="t10-detail-checkbox-visual">
          <Check size={14} strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function T10WeekViewV3() {
  const { listId, weekId } = useParams<{ listId: string; weekId: string }>();
  const navigate = useNavigate();

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // UI State
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Fetch data
  const { data: list, isLoading: listLoading, error: listError } = useT10ListById(listId || null);
  const { data: weeks, isLoading: weeksLoading, refetch: refetchWeeks } = useT10Weeks(listId || null);
  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useT10Items(weekId || null);
  const { data: bufferItems, refetch: refetchBuffer } = useT10BufferItems(weekId || null);
  
  // AI Suggestions
  const { data: aiData, isLoading: aiLoading } = useT10AISuggestions(listId, weekId);
  const addSuggestion = useAddSuggestionToT10();
  
  // Mutations
  const toggleStatus = useT10ToggleItemStatus();
  const createItem = useT10CreateItem();
  const reorderItems = useT10ReorderItems();
  const swapWithTen = useT10SwapWithTen();
  const promoteToTop10 = useT10PromoteToTop10();
  const deleteItem = useT10DeleteItem();

  // Find current week and calculate index
  const currentWeek = weeks?.find(w => w.id === weekId);
  const currentWeekIndex = weeks?.findIndex(w => w.id === weekId) ?? -1;
  const hasPrevWeek = currentWeekIndex > 0;
  const hasNextWeek = currentWeekIndex < (weeks?.length ?? 0) - 1;

  const allItems = useMemo(() => {
    return ([...(items || []), ...(bufferItems || [])] as T10ItemFull[]).sort((a, b) => a.rank - b.rank);
  }, [items, bufferItems]);

  // Calculate stats and limits
  const completedCount = items?.filter(item => item.status === 'done').length || 0;
  const totalCount = items?.length || 0;
  const bufferCount = bufferItems?.length || 0;
  const slotsAvailable = 10 - totalCount;
  
  // Limit: 10 in main list + 5 in buffer = 15 total
  const MAX_MAIN_ITEMS = 10;
  const MAX_BUFFER_ITEMS = 5;
  const isMainListFull = totalCount >= MAX_MAIN_ITEMS;
  const isBufferFull = bufferCount >= MAX_BUFFER_ITEMS;
  const isAddDisabled = isMainListFull && isBufferFull;

  const completedItems = useMemo(() => allItems.filter(i => i.status === 'done'), [allItems]);
  const incompleteItems = useMemo(() => allItems.filter(i => i.status !== 'done'), [allItems]);

  // Loading state
  const isLoading = listLoading || weeksLoading || itemsLoading;

  // Handle week navigation
  const handlePrevWeek = () => {
    if (hasPrevWeek && weeks) {
      const prevWeek = weeks[currentWeekIndex - 1];
      navigate(`/taskhub/task10/list/${listId}/week/${prevWeek.id}`);
    }
  };

  const handleNextWeek = () => {
    if (hasNextWeek && weeks) {
      const nextWeek = weeks[currentWeekIndex + 1];
      navigate(`/taskhub/task10/list/${listId}/week/${nextWeek.id}`);
    }
  };

  // Handle add new item
  const handleAddItem = async () => {
    if (!newItemText.trim() || !weekId) return;
    
    try {
      const maxRank = Math.max(0, ...allItems.map(i => i.rank || 0));
      const nextRank = totalCount < 10 ? totalCount + 1 : maxRank + 1;
      await createItem.mutateAsync({
        week_id: weekId,
        title: newItemText.trim(),
        rank: nextRank,
      });
      setNewItemText('');
    } catch (error) {
      console.error('[T10] Error adding item:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }
  };

  // Handle toggle status
  const handleToggleStatus = (item: T10ItemFull) => {
    if (!weekId) return;
    toggleStatus.mutate(item);
  };

  // Handle item click
  const handleItemClick = (item: T10ItemFull) => {
    setSelectedItemId(item.id);
    setIsPanelOpen(true);
  };

  // Handle panel close
  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedItemId(null), 200);
  };

  // Handle remove item
  const handleRemoveItem = async (item: T10ItemFull) => {
    try {
      await deleteItem.mutateAsync(item);
      console.log('[T10] Item removed:', item.title);
    } catch (error) {
      console.error('[T10] Error removing item:', error);
    }
  };

  // Handle buffer swap with #10
  const handleBufferSwap = async (bufferItem: T10ItemFull) => {
    if (!weekId) return;
    
    try {
      await swapWithTen.mutateAsync({
        week_id: weekId,
        buffer_item_id: bufferItem.id,
      });
      console.log('[T10] Swapped buffer item with #10:', bufferItem.title);
    } catch (error) {
      console.error('[T10] Error swapping:', error);
    }
  };

  // Handle promote buffer item to Top 10 (when slots available)
  const handlePromoteToTop10 = async (bufferItem: T10ItemFull) => {
    if (!weekId) return;
    
    try {
      await promoteToTop10.mutateAsync({
        week_id: weekId,
        buffer_item_id: bufferItem.id,
      });
      console.log('[T10] Promoted buffer item to Top 10:', bufferItem.title);
    } catch (error) {
      console.error('[T10] Error promoting:', error);
    }
  };

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !items || !weekId) return;
    
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    // The new rank is the target position (1-indexed)
    const newRank = newIndex + 1;

    reorderItems.mutate({
      week_id: weekId,
      item_id: active.id as string,
      new_rank: newRank,
    });
  };

  // Handle AI suggestion add
  const handleAddSuggestion = async (suggestion: any) => {
    if (!weekId || slotsAvailable <= 0) return;
    
    try {
      await addSuggestion.mutateAsync({
        weekId,
        suggestion,
        rank: totalCount + 1,
      });
    } catch (error) {
      console.error('[T10] Error adding suggestion:', error);
    }
  };

  // Handle checkout
  const handleCheckout = () => {
    setShowCheckoutModal(true);
  };

  // Get participants for AI suggestions (safe even while loading)
  const participantNames = allItems?.map(i => i.assignee_name).filter(Boolean) || [];
  const uniqueParticipants = [...new Set(participantNames)].slice(0, 3);

  // Mock AI suggestions (UI-only) so you can see card behavior when the backend returns none
  const mockSuggestions = useMemo(() => {
    const today = new Date();
    const plusDays = (d: number) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + d);
      return dt.toISOString().slice(0, 10);
    };

    return [
      {
        id: 'mock-1',
        title: 'Review security audit findings and remediation plan',
        key: 'TH-1042',
        due_date: plusDays(2),
        assignee_name: uniqueParticipants[0] || 'Unassigned',
        priority: 'high',
      },
      {
        id: 'mock-2',
        title: 'Finalize week scope and confirm owners for top priorities',
        key: 'TH-1088',
        due_date: plusDays(5),
        assignee_name: uniqueParticipants[1] || uniqueParticipants[0] || 'Unassigned',
        priority: 'critical',
      },
    ];
  }, [uniqueParticipants]);

  const suggestionsToRender =
    !aiLoading && (!aiData?.suggestions || aiData.suggestions.length === 0)
      ? mockSuggestions
      : (aiData?.suggestions || []).slice(0, 3);

  // Error state
  if (listError || (!isLoading && !list)) {
    return (
      <div className="t10-detail-page">
        <div className="t10-detail-main">
          <div className="t10-detail-error">
            <AlertCircle size={48} className="t10-detail-error-icon" />
            <h2 className="t10-detail-error-title">List not found</h2>
            <p className="t10-detail-error-text">
              The list you're looking for doesn't exist or has been deleted.
            </p>
            <button
              type="button"
              className="t10-detail-btn-back"
              onClick={() => navigate('/taskhub/task10')}
            >
              Back to Lists
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || !list || !currentWeek) {
    return (
      <div className="t10-detail-page">
        <div className="t10-detail-main">
          <div className="t10-detail-loading">
            <div className="t10-detail-loading-spinner" />
            <p className="t10-detail-loading-text">Loading week...</p>
          </div>
        </div>
      </div>
    );
  }

  const weekLabel = formatT10WeekRange(currentWeek.week_start, currentWeek.week_end);
  const isCurrentWeek = !!currentWeek.is_current && currentWeek.status === 'active';

  return (
    <div className="t10-detail-page">
      {/* HEADER - Single horizontal bar */}
      <header className="t10-detail-header">
        {/* Logo */}
        <Link to="/taskhub/task10" className="t10-detail-logo-link">
          <div className="t10-detail-logo-badge">10</div>
          <div className="t10-detail-logo-text">
            <span className="t10-detail-logo-title">Task<sup>10</sup></span>
            <span className="t10-detail-logo-subtitle">Priority Management</span>
          </div>
        </Link>

        {/* Divider */}
        <div className="t10-detail-header-divider" />

        {/* List Key + Name */}
        <div className="t10-detail-list-info">
          <span className="t10-detail-list-key">{list.key}</span>
          <span className="t10-detail-list-name">{list.name}</span>
        </div>

        {/* Divider */}
        <div className="t10-detail-header-divider" />

        {/* Week Navigation */}
        <div className="t10-detail-week-nav">
          <button 
            className="t10-detail-week-btn"
            onClick={handlePrevWeek}
            disabled={!hasPrevWeek}
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <div className="t10-detail-week-display">
            <Calendar size={16} strokeWidth={2} className="t10-detail-week-icon" />
            <span className="t10-detail-week-text">{weekLabel}</span>
            <span className={`t10-detail-week-badge ${!isCurrentWeek ? 't10-detail-week-badge-past' : ''}`}>
              {isCurrentWeek ? 'CURRENT' : 'PAST'}
            </span>
          </div>
          <button 
            className="t10-detail-week-btn"
            onClick={handleNextWeek}
            disabled={!hasNextWeek}
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Spacer */}
        <div className="t10-detail-header-spacer" />

        {/* Progress */}
        <div className="t10-detail-progress">
          <Check size={16} className="t10-detail-progress-check" />
          <span className="t10-detail-progress-text">
            {completedCount} of 10 completed
          </span>
        </div>

        {/* Checkout Button */}
        <button 
          className="t10-detail-btn-checkout"
          onClick={handleCheckout}
          disabled={!isCurrentWeek || allItems.length === 0}
        >
          <Check size={16} strokeWidth={2.5} />
          Checkout Week
        </button>
      </header>

      {/* MAIN */}
      <main className="t10-detail-main">
        {/* AI SUGGESTIONS */}
        <div className="t10-detail-ai-section">
          <div className="t10-detail-ai-card">
            <div className="t10-detail-ai-left">
              <div className="t10-detail-ai-icon">
                <Zap size={18} strokeWidth={2} />
              </div>
              <div className="t10-detail-ai-content">
                <span className="t10-detail-ai-title">AI Suggestions</span>
                <span className="t10-detail-ai-subtitle">
                  {uniqueParticipants.length > 0 
                    ? `Based on TaskHub items for ${uniqueParticipants.join(', ')}`
                    : 'Based on TaskHub backlog items'
                  }
                </span>
              </div>
            </div>
            <button 
              className={`t10-detail-ai-toggle ${aiPanelOpen ? 'expanded' : ''}`}
              onClick={() => setAiPanelOpen(!aiPanelOpen)}
            >
              <ChevronDown size={14} strokeWidth={2} />
              {aiPanelOpen ? 'Hide' : 'Show'}
            </button>
          </div>

          {aiPanelOpen && (
            <div className="t10-detail-ai-panel">
              <div className="t10-detail-ai-panel-header">
                <Info size={14} strokeWidth={2} />
                Showing HIGH and CRITICAL priority tasks assigned to participants
              </div>
              
              {aiLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  Loading suggestions...
                </div>
              ) : suggestionsToRender.length > 0 ? (
                suggestionsToRender.map((suggestion, i) => (
                  <div key={suggestion.id} className="t10-detail-ai-suggestion-item">
                    <div className="t10-detail-ai-suggestion-left">
                      <span className={`t10-detail-ai-priority t10-detail-ai-priority-p${i + 1}`}>
                        P{i + 1}
                      </span>
                      <div>
                        <span className="t10-detail-ai-suggestion-text">{suggestion.title}</span>
                        <div className="t10-detail-ai-suggestion-meta">
                          {suggestion.due_date && `Due ${formatShortDate(suggestion.due_date)}`}
                          {suggestion.assignee_name && ` · ${suggestion.assignee_name}`}
                        </div>
                      </div>
                    </div>
                    <span className="t10-detail-ai-suggestion-key">{suggestion.key}</span>
                    <button 
                      className="t10-detail-ai-add-btn"
                      onClick={() => handleAddSuggestion(suggestion)}
                      disabled={slotsAvailable <= 0}
                    >
                      + Add
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No suggestions available
                </div>
              )}
            </div>
          )}
        </div>

        {/* ADD INPUT - single dashed container, no nested border */}
        <div className={`t10-detail-add-container ${isAddDisabled ? 't10-detail-add-disabled' : ''}`}>
          <div className="t10-detail-add-wrapper">
            <Plus size={20} strokeWidth={2.5} className="t10-detail-add-icon" />
            <input 
              type="text"
              className="t10-detail-add-input"
              placeholder={isAddDisabled ? "Maximum 15 items reached (10 priorities + 5 buffer)" : "Add list item or paste TaskHub key..."}
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAddDisabled}
            />
            {!isAddDisabled && (
              <div className="t10-detail-add-hint">
                <kbd>Enter</kbd>
                <span>to add</span>
              </div>
            )}
          </div>
        </div>

        {/* PRIORITY LIST */}
        <div className="t10-detail-priority-section">
          <div className="t10-detail-priority-header">
            <span className="t10-detail-priority-title">Top 10 Priorities</span>
            <span className="t10-detail-priority-count">
              {totalCount}/10 slots
            </span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items?.map(i => i.id) || []}
              strategy={verticalListSortingStrategy}
            >
              <div className="t10-detail-priority-list">
                {items && items.length > 0 ? (
                  items.map(item => (
                    <SortablePriorityItem
                      key={item.id}
                      item={item}
                      onClick={() => handleItemClick(item)}
                      onToggleStatus={() => handleToggleStatus(item)}
                      onLabelsChange={() => {
                        // Query cache is invalidated by the mutation automatically
                      }}
                      onRemove={() => handleRemoveItem(item)}
                    />
                  ))
                ) : (
                  <div style={{ 
                    padding: '40px', 
                    textAlign: 'center', 
                    color: '#94a3b8',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px dashed #e2e8f0'
                  }}>
                    No items yet. Add your first priority above.
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* BUFFER ZONE */}
        <div className="t10-detail-buffer-section">
          <div className="t10-detail-buffer-header">
            <Layers size={16} strokeWidth={2} className="t10-detail-buffer-icon" />
            <span className="t10-detail-buffer-title">Buffer Zone</span>
            <span className="t10-detail-buffer-count">{bufferItems?.length || 0}</span>
          </div>
          {bufferItems && bufferItems.length > 0 ? (
            bufferItems.map(item => {
              // Determine which button to show based on available slots
              const hasEmptySlots = slotsAvailable > 0;
              
              return (
                <div key={item.id} className="t10-detail-buffer-item" onClick={() => handleItemClick(item)}>
                  <div className="t10-detail-buffer-rank">{item.rank}</div>
                  <div className="t10-detail-buffer-content">
                    <span className="t10-detail-buffer-text">{item.title}</span>
                  </div>
                  {/* Remove Button */}
                  <button 
                    className="t10-detail-buffer-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveItem(item);
                    }}
                    title="Remove item"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                  {hasEmptySlots ? (
                    <button 
                      className="t10-detail-buffer-promote"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePromoteToTop10(item);
                      }}
                      disabled={promoteToTop10.isPending}
                    >
                      {promoteToTop10.isPending ? 'Adding...' : `Add to Top 10`}
                    </button>
                  ) : (
                    <button 
                      className="t10-detail-buffer-swap"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBufferSwap(item);
                      }}
                      disabled={swapWithTen.isPending}
                    >
                      {swapWithTen.isPending ? 'Swapping...' : 'Swap with #10'}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="t10-detail-buffer-item" style={{ justifyContent: 'center', color: '#94a3b8' }}>
              No items in buffer yet
            </div>
          )}
        </div>
      </main>

      {/* Side Panel */}
      {isPanelOpen && selectedItemId && (
        <T10SidePanelNew
          itemId={selectedItemId}
          onClose={handlePanelClose}
          onUpdated={() => {
            refetchItems();
            refetchBuffer();
            refetchWeeks();
          }}
          onDeleted={() => {
            refetchItems();
            refetchBuffer();
            refetchWeeks();
          }}
        />
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <T10CheckoutModalNew
          weekId={weekId || ''}
          listId={listId || ''}
          completedItems={completedItems}
          incompleteCount={incompleteItems.length}
          onClose={() => setShowCheckoutModal(false)}
          onCheckoutComplete={() => {
            setShowCheckoutModal(false);
            refetchItems();
            refetchBuffer();
            refetchWeeks();
          }}
        />
      )}
    </div>
  );
}

export default T10WeekViewV3;
