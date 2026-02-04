// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10WeekViewV3
// Purpose: Main week view detail page matching the provided spec
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, ChevronLeft, ChevronRight, Calendar, 
  Zap, ChevronDown, Plus, Check, Layers, Info,
  AlertCircle, GripVertical, User, X, StickyNote
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

  const isCompleted = item.status === 'done';
  const dueStatus = item.due_date ? getDueStatus(item.due_date) : 'normal';
  const hasNotes = Boolean(item.description && item.description.trim());
  const [isHovered, setIsHovered] = React.useState(false);

  // Card styling
  const cardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    background: isCompleted ? '#fafafa' : '#ffffff',
    border: isDragging ? '1px solid #2563eb' : '1px solid #e2e8f0',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
    boxShadow: isDragging 
      ? '0 8px 24px rgba(0,0,0,0.12)' 
      : isHovered 
        ? '0 4px 12px rgba(0,0,0,0.06)' 
        : undefined,
  };

  // Drag handle - 6 dots (2x3 grid)
  const dragHandleStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: 4,
    cursor: 'grab',
    color: '#94a3b8',
  };

  const dotStyle: React.CSSProperties = {
    width: 4,
    height: 4,
    backgroundColor: 'currentColor',
    borderRadius: '50%',
  };

  // Rank badge - ALWAYS BLUE #2563eb
  const rankStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    flexShrink: 0,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 500,
    color: isCompleted ? '#94a3b8' : '#0f172a',
    textDecoration: isCompleted ? 'line-through' : 'none',
    marginBottom: 6,
  };

  const metaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  };

  const metaItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: '#64748b',
  };

  const dueStyle: React.CSSProperties = {
    ...metaItemStyle,
    color: dueStatus === 'overdue' ? '#ef4444' : dueStatus === 'today' ? '#f59e0b' : '#64748b',
  };

  // Remove button - visible on hover, hidden when completed
  const removeStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    display: isCompleted ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: isHovered ? '#ef4444' : '#94a3b8',
    background: isHovered ? '#fef2f2' : 'transparent',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    flexShrink: 0,
    opacity: isHovered ? 1 : 0,
    transition: 'all 0.15s',
    marginRight: 4,
  };

  // Checkbox - BLUE when checked
  const checkboxStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    border: isCompleted ? 'none' : '2px solid #d1d5db',
    backgroundColor: isCompleted ? '#2563eb' : '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flexShrink: 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* DRAG HANDLE - 6 dots (2x3 grid) - ALWAYS VISIBLE */}
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        style={dragHandleStyle}
      >
        <div style={{ display: 'flex', gap: 2 }}>
          <span style={dotStyle} />
          <span style={dotStyle} />
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <span style={dotStyle} />
          <span style={dotStyle} />
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <span style={dotStyle} />
          <span style={dotStyle} />
        </div>
      </div>

      {/* RANK BADGE - ALWAYS #2563eb BLUE */}
      <div style={rankStyle}>
        {item.rank}
      </div>

      {/* CONTENT */}
      <div style={contentStyle}>
        <div style={titleStyle}>{item.title}</div>
        <div style={metaStyle}>
          {/* Labels Dropdown */}
          <div onClick={(e) => e.stopPropagation()}>
            <T10LabelDropdown
              itemId={item.id}
              currentLabels={item.labels || []}
              onLabelsChange={onLabelsChange}
            />
          </div>
          
          {/* Notes indicator */}
          {hasNotes && (
            <span style={metaItemStyle} title="Has notes">
              <StickyNote size={12} />
            </span>
          )}
          
          {item.assignee_name && (
            <span style={metaItemStyle}>
              <User size={12} />
              {item.assignee_name}
            </span>
          )}
          {item.due_date && (
            <span style={dueStyle}>
              <Calendar size={12} />
              {formatShortDate(item.due_date)}
            </span>
          )}
        </div>
      </div>

      {/* REMOVE BUTTON - visible on hover, hidden when completed */}
      <button
        style={removeStyle}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Remove item"
      >
        <X size={16} strokeWidth={2} />
      </button>

      {/* CHECKBOX - BLUE when checked, NOT green */}
      <div
        style={checkboxStyle}
        onClick={(e) => {
          e.stopPropagation();
          onToggleStatus();
        }}
      >
        {isCompleted && <Check size={16} color="#ffffff" strokeWidth={3} />}
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
      // Calculate next available rank - ensure it's unique
      const existingRanks = allItems.map(i => i.rank || 0);
      const maxRank = Math.max(0, ...existingRanks);
      // For new items: if under 10 items, use totalCount+1; else place after max rank
      const nextRank = totalCount < 10 ? totalCount + 1 : maxRank + 1;
      
      // Double-check rank isn't already taken
      const finalRank = existingRanks.includes(nextRank) ? maxRank + 1 : nextRank;
      
      await createItem.mutateAsync({
        week_id: weekId,
        title: newItemText.trim(),
        rank: finalRank,
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

  // Use real AI suggestions only (no mock fallback)
  const suggestionsToRender = (aiData?.suggestions || []).slice(0, 3);

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

  // ═══════════════════════════════════════════════════════════════════════════════
  // INLINE STYLES (CSS cascade-proof)
  // ═══════════════════════════════════════════════════════════════════════════════
  const pageStyle: React.CSSProperties = {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    background: '#f8fafc',
    minHeight: '100vh',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: 64,
    padding: '0 24px',
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    gap: 16,
  };

  const logoBadgeStyle: React.CSSProperties = {
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#2563eb',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 800,
  };

  const logoTextStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  };

  const logoTitleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.2,
  };

  const logoSubtitleStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#64748b',
  };

  const listKeyStyle: React.CSSProperties = {
    padding: '5px 10px',
    fontSize: 12,
    fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
    fontWeight: 600,
    borderRadius: 6,
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
  };

  const listNameStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    color: '#0f172a',
  };

  const weekBtnStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
    color: '#475569',
  };

  const weekDisplayStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 16px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
  };

  const weekBadgeStyle: React.CSSProperties = {
    padding: '3px 8px',
    fontSize: 10,
    fontWeight: 700,
    background: isCurrentWeek ? '#2563eb' : '#64748b',
    color: '#ffffff',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  };

  const checkoutBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 600,
    color: '#ffffff',
    background: '#2563eb',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(37, 99, 235, 0.4)',
  };

  const mainStyle: React.CSSProperties = {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px 48px',
  };

  const aiSectionStyle: React.CSSProperties = {
    marginBottom: 20,
    background: '#ffffff',
    border: '1px dashed #cbd5e1',
    borderRadius: 16,
    overflow: 'hidden',
  };

  const aiCardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
  };

  const aiIconStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '2px solid #8b5cf6',
    borderRadius: 12,
    color: '#8b5cf6',
  };

  const aiToggleBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: '#475569',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
  };

  const addWrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 20px',
    marginBottom: 24,
    background: '#ffffff',
    border: '1px dashed #cbd5e1',
    borderRadius: 16,
    opacity: isAddDisabled ? 0.6 : 1,
  };

  const addInputStyle: React.CSSProperties = {
    flex: 1,
    padding: 0,
    fontSize: 15,
    fontWeight: 400,
    color: '#0f172a',
    background: 'transparent',
    border: 'none',
    outline: 'none',
  };

  const kbdStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 500,
    color: '#475569',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
  };

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  };

  const sectionCountStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#94a3b8',
  };

  const priorityListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  };

  const bufferSectionStyle: React.CSSProperties = {
    marginTop: 24,
  };

  const bufferHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  };

  const bufferItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    marginBottom: 6,
    cursor: 'pointer',
  };

  const bufferRankStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    background: 'transparent',
    border: '2px dashed #d1d5db',
    borderRadius: 8,
    flexShrink: 0,
  };

  const bufferSwapBtnStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    color: '#2563eb',
    background: '#dbeafe',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    flexShrink: 0,
  };

  const bufferPromoteBtnStyle: React.CSSProperties = {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#ffffff',
    background: '#3b82f6',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    flexShrink: 0,
  };

  return (
    <div style={pageStyle}>
      {/* HEADER */}
      <header style={headerStyle}>
        {/* Logo */}
        <Link to="/taskhub/task10" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <div style={logoBadgeStyle}>10</div>
          <div style={logoTextStyle}>
            <span style={logoTitleStyle}>Task<sup style={{ fontSize: 10, color: '#2563eb', position: 'relative', top: -3 }}>10</sup></span>
            <span style={logoSubtitleStyle}>Priority Management</span>
          </div>
        </Link>

        {/* List Key + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={listKeyStyle}>{list.key}</span>
          <span style={listNameStyle}>{list.name}</span>
        </div>

        {/* Week Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button 
            style={{ ...weekBtnStyle, opacity: hasPrevWeek ? 1 : 0.4, cursor: hasPrevWeek ? 'pointer' : 'not-allowed' }}
            onClick={handlePrevWeek}
            disabled={!hasPrevWeek}
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <button 
            style={{ ...weekBtnStyle, opacity: hasNextWeek ? 1 : 0.4, cursor: hasNextWeek ? 'pointer' : 'not-allowed' }}
            onClick={handleNextWeek}
            disabled={!hasNextWeek}
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Week Display */}
        <div style={weekDisplayStyle}>
          <Calendar size={16} strokeWidth={2} style={{ color: '#475569' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', whiteSpace: 'nowrap' }}>{weekLabel}</span>
          <span style={weekBadgeStyle}>
            {isCurrentWeek ? 'CURRENT' : 'PAST'}
          </span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={16} style={{ color: '#475569' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>
            {completedCount} of 10 completed
          </span>
        </div>

        {/* Checkout Button */}
        <button 
          style={{ ...checkoutBtnStyle, opacity: (!isCurrentWeek || allItems.length === 0) ? 0.5 : 1, cursor: (!isCurrentWeek || allItems.length === 0) ? 'not-allowed' : 'pointer' }}
          onClick={handleCheckout}
          disabled={!isCurrentWeek || allItems.length === 0}
        >
          <Check size={16} strokeWidth={2.5} />
          Checkout Week
        </button>
      </header>

      {/* MAIN */}
      <main style={mainStyle}>
        {/* AI SUGGESTIONS */}
        <div style={aiSectionStyle}>
          <div style={aiCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={aiIconStyle}>
                <Zap size={18} strokeWidth={2} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>AI Suggestions</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {uniqueParticipants.length > 0 
                    ? `Based on TaskHub items for ${uniqueParticipants.join(', ')}`
                    : 'Based on TaskHub backlog items'
                  }
                </span>
              </div>
            </div>
            <button 
              style={aiToggleBtnStyle}
              onClick={() => setAiPanelOpen(!aiPanelOpen)}
            >
              <ChevronDown size={14} strokeWidth={2} style={{ transform: aiPanelOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
              {aiPanelOpen ? 'Hide' : 'Show'}
            </button>
          </div>

          {aiPanelOpen && (
            <div style={{ padding: '0 20px 20px' }}>
              {aiLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  Loading suggestions...
                </div>
              ) : suggestionsToRender.length > 0 ? (
                suggestionsToRender.map((suggestion, i) => (
                  <div 
                    key={suggestion.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px 20px',
                      background: '#f8fafc',
                      borderRadius: 12,
                      marginBottom: i < suggestionsToRender.length - 1 ? 8 : 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                      <span style={{
                        width: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                        borderRadius: 10,
                        background: i === 0 ? '#2563eb' : i === 1 ? '#3b82f6' : '#60a5fa',
                        color: '#ffffff',
                        flexShrink: 0,
                      }}>
                        P{i + 1}
                      </span>
                      <div>
                        <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{suggestion.title}</span>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                          {suggestion.due_date && `Due ${formatShortDate(suggestion.due_date)}`}
                          {suggestion.assignee_name && ` · ${suggestion.assignee_name}`}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace", fontWeight: 600, color: '#2563eb', flexShrink: 0 }}>{suggestion.key}</span>
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

        {/* ADD INPUT - Nuclear box-inside-box fix applied */}
        <div style={addWrapperStyle}>
          <Plus size={20} strokeWidth={2.5} style={{ color: isAddDisabled ? '#94a3b8' : '#2563eb', flexShrink: 0 }} />
          <input 
            type="text"
            className="flex-1 min-w-0 text-[15px] font-normal text-slate-900 placeholder:text-slate-400 !bg-transparent !border-0 !p-0 !outline-none !shadow-none !ring-0 focus:!outline-none focus:!shadow-none focus:!ring-0"
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              backgroundColor: 'transparent',
              WebkitBoxShadow: '0 0 0 1000px transparent inset',
            }}
            placeholder={isAddDisabled ? "Maximum 15 items reached (10 priorities + 5 buffer)" : "Add list item or paste TaskHub key..."}
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAddDisabled}
          />
          {!isAddDisabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', flexShrink: 0 }}>
              <kbd style={kbdStyle}>Enter</kbd>
              <span>to add</span>
            </div>
          )}
        </div>

        {/* PRIORITY LIST */}
        <div style={{ marginBottom: 24 }}>
          <div style={sectionHeaderStyle}>
            <span style={sectionTitleStyle}>Top 10 Priorities</span>
            <span style={sectionCountStyle}>
              <strong style={{ color: '#2563eb' }}>{totalCount}</strong>/10 slots
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
              <div style={priorityListStyle}>
                {items && items.length > 0 ? (
                  items.map(item => (
                    <SortablePriorityItem
                      key={item.id}
                      item={item}
                      onClick={() => handleItemClick(item)}
                      onToggleStatus={() => handleToggleStatus(item)}
                      onLabelsChange={() => {}}
                      onRemove={() => handleRemoveItem(item)}
                    />
                  ))
                ) : (
                  <div style={{ 
                    padding: '40px', 
                    textAlign: 'center', 
                    color: '#94a3b8',
                    background: '#f8fafc',
                    borderRadius: 12,
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
        <div style={bufferSectionStyle}>
          <div style={bufferHeaderStyle}>
            <Layers size={16} strokeWidth={2} style={{ color: '#64748b' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Buffer Zone</span>
            <span style={{ padding: '2px 10px', fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f1f5f9', borderRadius: 6 }}>{bufferItems?.length || 0}</span>
          </div>
          {bufferItems && bufferItems.length > 0 ? (
            bufferItems.map((item, i) => {
              const hasEmptySlots = slotsAvailable > 0;
              
              return (
                <div 
                  key={item.id} 
                  style={{ ...bufferItemStyle, marginBottom: i < bufferItems.length - 1 ? 6 : 0 }} 
                  onClick={() => handleItemClick(item)}
                >
                  <div style={bufferRankStyle}>{item.rank}</div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{item.title}</span>
                    {item.description && item.description.trim() && (
                      <StickyNote size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    )}
                  </div>
                  {hasEmptySlots ? (
                    <button 
                      style={{ ...bufferPromoteBtnStyle, opacity: promoteToTop10.isPending ? 0.6 : 1 }}
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
                      style={{ ...bufferSwapBtnStyle, opacity: swapWithTen.isPending ? 0.6 : 1 }}
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
            <div style={{ ...bufferItemStyle, justifyContent: 'center', color: '#94a3b8' }}>
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
