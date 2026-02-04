import React, { useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Plus, Check, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { T10UnifiedSortableList } from '../components/week/T10UnifiedSortableList';
import { T10WeekNavigation } from '../components/week/T10WeekNavigation';
import { T10EnterpriseSidePanel } from '../components/panel/T10EnterpriseSidePanel';
import { T10CheckoutModal } from '../components/modals/T10CheckoutModal';
import { T10AISuggestionsPanel } from '../components/week/T10AISuggestionsPanel';
import {
  useT10ListById, 
  useT10Weeks, 
  useT10Items, 
  useCreateT10Week,
  useCreateT10Item,
  useUpdateT10Item,
  useDeleteT10Item,
  useCheckoutT10Week,
  useCarryoverT10Items,
  useBulkUpdateT10Items,
} from '../hooks';
import { getWeekStartDate, formatWeekRange, formatT10WeekRange } from '../utils';
import type { T10Item, T10CheckoutDecision } from '../types';
import { useToast } from '@/hooks/use-toast';
import '../styles/task10.css';
import '../styles/task10-detail.css';

export function T10WeekPage() {
  const navigate = useNavigate();
  const { listId } = useParams();
  const { toast } = useToast();
  
  // Database hooks
  const { data: list } = useT10ListById(listId);
  const { data: dbWeeks = [] } = useT10Weeks(listId);
  const createWeek = useCreateT10Week();
  const checkoutWeek = useCheckoutT10Week();
  const carryoverItems = useCarryoverT10Items();
  const bulkUpdateItems = useBulkUpdateT10Items();
  
  // Current week navigation
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const currentWeek = dbWeeks[currentWeekIndex];
  
  // Items for current week
  const { data: dbItems = [] } = useT10Items(currentWeek?.id);
  const createItem = useCreateT10Item();
  const updateItem = useUpdateT10Item();
  const deleteItem = useDeleteT10Item();
  
  const [bufferExpanded, setBufferExpanded] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [isCreatingWeek, setIsCreatingWeek] = useState(false);
  
  const completedCount = dbItems.filter(i => i.status === 'done').length;
  const topTenItems = dbItems.filter(i => i.rank <= 10).sort((a, b) => a.rank - b.rank);
  const bufferItems = dbItems.filter(i => i.rank > 10).sort((a, b) => a.rank - b.rank);

  // Handle reorder via drag-and-drop (unified for top10 and buffer)
  const handleReorderAll = useCallback(async (updatedItems: T10Item[]) => {
    const updates = updatedItems.map(item => ({
      id: item.id,
      rank: item.rank,
    }));

    try {
      await bulkUpdateItems.mutateAsync({ updates });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save new order.", variant: "destructive" });
    }
  }, [bulkUpdateItems, toast]);

  const handleCardClick = (itemId: string) => {
    setSelectedItemId(itemId);
    setSidePanelOpen(true);
  };

  const handleToggleStatus = async (itemId: string) => {
    const item = dbItems.find(i => i.id === itemId);
    if (!item) return;
    
    const newStatus = item.status === 'done' ? 'todo' : 'done';
    
    try {
      await updateItem.mutateAsync({ itemId, updates: { status: newStatus } });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update item status.", variant: "destructive" });
    }
  };

  const handleUpdateItem = async (updates: Partial<T10Item>) => {
    if (!selectedItemId) return;
    
    try {
      await updateItem.mutateAsync({ 
        itemId: selectedItemId, 
        updates: {
          title: updates.title,
          rank: updates.rank,
          taskhubKey: updates.taskhub_key,
          assigneeId: updates.assignee_id,
          dueDate: updates.due_date,
          label: updates.label,
          description: updates.description,
          status: updates.status,
        }
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update item.", variant: "destructive" });
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItemId || !currentWeek) return;
    
    try {
      await deleteItem.mutateAsync({ itemId: selectedItemId, weekId: currentWeek.id });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    }
    
    setSidePanelOpen(false);
    setSelectedItemId(null);
    toast({ title: "Item deleted", description: "The priority item has been removed." });
  };

  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !quickAddValue.trim() || !currentWeek) return;

    const newRank = Math.max(...dbItems.map(i => i.rank), 0) + 1;
    const title = quickAddValue.trim();
    
    // Check if it looks like a TaskHub key
    const keyMatch = title.match(/^([A-Z]+-\d+)/);
    const taskhubKey = keyMatch ? keyMatch[1] : undefined;

    try {
      await createItem.mutateAsync({
        weekId: currentWeek.id,
        title,
        rank: newRank > 10 ? newRank : 10,
        taskhubKey,
      });
      setQuickAddValue('');
      toast({ title: "Item added", description: `"${title}" added to buffer queue.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add item.", variant: "destructive" });
    }
  };

  const handleCheckout = async (decisions: T10CheckoutDecision[]) => {
    const carriedItems = decisions.filter(d => d.decision === 'carry');
    const resolvedItems = decisions.filter(d => d.decision === 'resolved');
    const removedItems = decisions.filter(d => d.decision === 'remove');

    if (!currentWeek || !listId) return;

    try {
      // Mark current week as checked out
      await checkoutWeek.mutateAsync({
        weekId: currentWeek.id,
        closedCount: resolvedItems.length,
        carriedCount: carriedItems.length,
        removedCount: removedItems.length,
      });

      // Create next week
      const nextWeekStart = new Date(currentWeek.week_start);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
      
      const newWeek = await createWeek.mutateAsync({
        list_id: listId,
        week_start: nextWeekStart.toISOString().split('T')[0],
        week_end: nextWeekEnd.toISOString().split('T')[0],
      });

      // Carry over items
      if (carriedItems.length > 0) {
        const itemsToCarry = dbItems.filter(i => carriedItems.some(c => c.itemId === i.id));
        await carryoverItems.mutateAsync({
          sourceItems: itemsToCarry,
          targetWeekId: newWeek.id,
        });
      }

      setCheckoutOpen(false);
      toast({
        title: "Week checked out successfully",
        description: `${resolvedItems.length} resolved, ${carriedItems.length} carried to next week.`,
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to checkout week.", variant: "destructive" });
    }
  };

  // Create new week handler with auto-carryover from previous week
  const handleCreateWeek = async () => {
    if (!listId) return;
    
    setIsCreatingWeek(true);
    try {
      const weekStartStr = getWeekStartDate(new Date());
      const weekStartDate = new Date(weekStartStr);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      
      // Create the new week
      const newWeek = await createWeek.mutateAsync({
        list_id: listId,
        week_start: weekStartDate.toISOString().split('T')[0],
        week_end: weekEndDate.toISOString().split('T')[0],
      });

      // Check if there's a previous week with incomplete items to carry over
      const previousWeek = dbWeeks[1]; // Previous week (index 0 is newly created)
      if (previousWeek && previousWeek.status !== 'completed') {
        // Get incomplete items from previous week
        const incompleteItems = dbItems.filter(i => i.status === 'todo');
        if (incompleteItems.length > 0) {
          await carryoverItems.mutateAsync({
            sourceItems: incompleteItems,
            targetWeekId: newWeek.id,
          });
          toast({ 
            title: "Week started", 
            description: `${incompleteItems.length} item${incompleteItems.length > 1 ? 's' : ''} carried over from previous week.` 
          });
        } else {
          toast({ title: "Week started", description: "Your new week has been created." });
        }
      } else {
        toast({ title: "Week started", description: "Your new week has been created." });
      }

      // Navigate to the new week (index 0 since sorted desc)
      setCurrentWeekIndex(0);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create week.", variant: "destructive" });
    } finally {
      setIsCreatingWeek(false);
    }
  };

  // Format current week date for checkout modal
  const formatWeekDisplayForModal = () => {
    if (currentWeek) {
      const start = new Date(currentWeek.week_start);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return formatWeekRange(start, end);
    }
    return '';
  };

  // Get participant names for AI suggestions
  const participantNames = [...new Set(dbItems.map(i => i.assignee_name).filter(Boolean))];

  // Week navigation handlers
  const hasPrevWeek = currentWeekIndex < dbWeeks.length - 1;
  const hasNextWeek = currentWeekIndex > 0;
  
  const handlePrevWeek = () => {
    if (hasPrevWeek) {
      setCurrentWeekIndex(currentWeekIndex + 1);
    }
  };

  const handleNextWeek = () => {
    if (hasNextWeek) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    }
  };

  const weekLabel = currentWeek ? formatT10WeekRange(currentWeek.week_start, currentWeek.week_end) : '';
  const isCurrentWeek = currentWeek?.is_current && currentWeek?.status === 'active';

  return (
    <div className="t10-detail-page">
      {/* HEADER - Matches reference design */}
      <header className="t10-detail-header">
        {/* Logo - links back to lists */}
        <Link to="/taskhub/task10" className="t10-detail-logo-link">
          <div className="t10-detail-logo-badge">10</div>
          <div className="t10-detail-logo-text">
            <span className="t10-detail-logo-title">Task<sup>10</sup></span>
            <span className="t10-detail-logo-subtitle">Priority Management</span>
          </div>
        </Link>

        {/* List Key + Name */}
        <div className="t10-detail-list-info">
          <span className="t10-detail-list-key">{list?.key || 'T10-XXX'}</span>
          <span className="t10-detail-list-name">{list?.name || 'Loading...'}</span>
        </div>

        {/* Week Navigation Arrows */}
        <div className="t10-detail-week-nav">
          <button 
            className="t10-detail-week-btn"
            onClick={handlePrevWeek}
            disabled={!hasPrevWeek}
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <button 
            className="t10-detail-week-btn"
            onClick={handleNextWeek}
            disabled={!hasNextWeek}
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Week Display with Calendar */}
        <div className="t10-detail-week-display">
          <Calendar size={16} strokeWidth={2} className="t10-detail-week-icon" />
          <span className="t10-detail-week-text">{weekLabel || 'No week'}</span>
          {currentWeek && (
            <span className={`t10-detail-week-badge ${currentWeek.status === 'completed' ? 't10-detail-week-badge-past' : ''}`}>
              {currentWeek.status === 'completed' ? 'CLOSED' : isCurrentWeek ? 'CURRENT' : 'ACTIVE'}
            </span>
          )}
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
        {currentWeek?.status === 'completed' ? (
          <span className="t10-checked-out-badge" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 6, 
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 600,
            color: '#64748b',
            background: '#f1f5f9',
            borderRadius: 8
          }}>
            <Check size={16} /> Week Closed
          </span>
        ) : currentWeek ? (
          <button 
            className="t10-detail-btn-checkout"
            onClick={() => setCheckoutOpen(true)}
          >
            <Check size={16} strokeWidth={2.5} />
            Checkout Week
          </button>
        ) : (
          <button 
            className="t10-detail-btn-checkout"
            onClick={handleCreateWeek}
            disabled={isCreatingWeek}
          >
            <Plus size={16} strokeWidth={2.5} />
            Start Week
          </button>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="t10-detail-main">
        {currentWeek?.status !== 'completed' && currentWeek && (
          <T10AISuggestionsPanel
            listId={listId}
            weekId={currentWeek?.id}
            participants={[]}
            participantNames={participantNames}
            currentTopTenCount={topTenItems.length}
            disabled={false}
          />
        )}

        {currentWeek?.status !== 'completed' && currentWeek && (
          <div className="t10-detail-add-container">
            <div className="t10-detail-add-wrapper">
              <Plus size={20} className="t10-detail-add-icon" />
              <input 
                type="text" 
                className="t10-detail-add-input" 
                placeholder="Add a priority or paste TaskHub key..."
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                onKeyDown={handleQuickAdd}
              />
              <span className="t10-detail-add-hint">
                <kbd>Enter</kbd> to add
              </span>
            </div>
          </div>
        )}

        <T10UnifiedSortableList
          topTenItems={topTenItems}
          bufferItems={bufferItems}
          onReorderAll={handleReorderAll}
          onCardClick={handleCardClick}
          onToggleStatus={handleToggleStatus}
          disabled={currentWeek?.status === 'completed'}
          bufferExpanded={bufferExpanded}
          onToggleBuffer={() => setBufferExpanded(!bufferExpanded)}
        />
      </main>

      <T10EnterpriseSidePanel 
        item={dbItems.find(i => i.id === selectedItemId) || null} 
        isOpen={sidePanelOpen} 
        onClose={() => { setSidePanelOpen(false); setSelectedItemId(null); }} 
        onUpdate={handleUpdateItem} 
        onDelete={handleDeleteItem} 
      />
      
      <T10CheckoutModal 
        isOpen={checkoutOpen} 
        onClose={() => setCheckoutOpen(false)} 
        weekDate={formatWeekDisplayForModal()}
        items={dbItems.filter(i => i.rank <= 10)} 
        completedCount={completedCount} 
        onCheckout={handleCheckout} 
      />
    </div>
  );
}
