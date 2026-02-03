import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Plus, Check, Calendar } from 'lucide-react';
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
import { getWeekStartDate, formatWeekRange } from '../utils';
import type { T10Item, T10CheckoutDecision } from '../types';
import { useToast } from '@/hooks/use-toast';
import '../styles/task10.css';

// Mock data for when database is empty
const initialMockItems: T10Item[] = [
  { id: '1', week_id: 'w1', rank: 1, title: 'Interview senior engineering candidates for Platform team', taskhub_key: 'TSK-142', assignee_name: 'Ibrahim A.', assignee_initials: 'IA', due_date: '2026-02-03', label: 'HR', status: 'todo', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '2', week_id: 'w1', rank: 2, title: 'Complete vendor contract negotiations with legal review', assignee_name: 'Vikram I.', assignee_initials: 'VI', due_date: '2026-02-07', label: 'OPERATIONS', status: 'todo', carryover_count: 2, created_at: '', updated_at: '' },
  { id: '3', week_id: 'w1', rank: 3, title: 'Review sales pipeline for February targets', taskhub_key: 'PLN-008', assignee_name: 'Ibrahim A.', assignee_initials: 'IA', due_date: '2026-02-01', label: 'FINANCE', status: 'todo', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '4', week_id: 'w1', rank: 4, title: 'Finalize Q1 budget forecast with department heads', taskhub_key: 'PLN-004', assignee_name: 'Vikram I.', assignee_initials: 'VI', due_date: '2026-02-04', label: 'FINANCE', status: 'done', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '5', week_id: 'w1', rank: 5, title: 'Architecture review for Phase 2 data migration', taskhub_key: 'TSK-089', assignee_name: 'Maali A.', assignee_initials: 'MA', due_date: '2026-02-04', label: 'TECH', status: 'todo', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '6', week_id: 'w1', rank: 6, title: 'Submit compliance documentation to regulatory body', assignee_name: 'Vikram I.', assignee_initials: 'VI', due_date: '2026-02-03', label: 'LEGAL', status: 'done', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '7', week_id: 'w1', rank: 7, title: 'Prepare quarterly board presentation slides', assignee_name: 'Ibrahim A.', assignee_initials: 'IA', due_date: '2026-02-06', label: 'FINANCE', status: 'todo', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '8', week_id: 'w1', rank: 8, title: 'Review and approve new vendor contracts', taskhub_key: 'TSK-102', assignee_name: 'Maali A.', assignee_initials: 'MA', due_date: '2026-02-09', label: 'LEGAL', status: 'done', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '11', week_id: 'w1', rank: 11, title: 'Research competitor pricing strategies', assignee_name: 'Maali A.', assignee_initials: 'MA', due_date: '2026-02-12', label: 'FINANCE', status: 'todo', carryover_count: 0, created_at: '', updated_at: '' },
  { id: '12', week_id: 'w1', rank: 12, title: 'Draft security audit response', taskhub_key: 'TSK-156', assignee_name: 'Vikram I.', assignee_initials: 'VI', due_date: '2026-02-14', label: 'TECH', status: 'todo', carryover_count: 0, created_at: '', updated_at: '' },
];

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
  
  // Use mock data if database is empty
  const items = dbItems.length > 0 ? dbItems : (currentWeek ? [] : initialMockItems);
  const useMockMode = !currentWeek && dbWeeks.length === 0;

  // Local state for mock mode
  const [mockItems, setMockItems] = useState(initialMockItems);
  const displayItems = useMockMode ? mockItems : items;
  
  const [bufferExpanded, setBufferExpanded] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [isCreatingWeek, setIsCreatingWeek] = useState(false);
  const completedCount = displayItems.filter(i => i.status === 'done').length;
  const topTenItems = displayItems.filter(i => i.rank <= 10).sort((a, b) => a.rank - b.rank);
  const bufferItems = displayItems.filter(i => i.rank > 10).sort((a, b) => a.rank - b.rank);

  // Handle reorder via drag-and-drop (unified for top10 and buffer)
  const handleReorderAll = useCallback(async (updatedItems: T10Item[], movedItemId: string, oldRank: number, newRank: number) => {
    const updates = updatedItems.map(item => ({
      id: item.id,
      rank: item.rank,
    }));

    if (useMockMode) {
      setMockItems(updatedItems);
    } else {
      try {
        await bulkUpdateItems.mutateAsync({ updates });
      } catch (error) {
        toast({ title: "Error", description: "Failed to save new order.", variant: "destructive" });
      }
    }
  }, [useMockMode, bulkUpdateItems, toast]);


  const handleCardClick = (itemId: string) => {
    setSelectedItemId(itemId);
    setSidePanelOpen(true);
  };

  const handleToggleStatus = async (itemId: string) => {
    const item = displayItems.find(i => i.id === itemId);
    if (!item) return;
    
    const newStatus = item.status === 'done' ? 'todo' : 'done';
    
    if (useMockMode) {
      setMockItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));
    } else {
      try {
        await updateItem.mutateAsync({ itemId, updates: { status: newStatus } });
      } catch (error) {
        toast({ title: "Error", description: "Failed to update item status.", variant: "destructive" });
      }
    }
  };

  const handleUpdateItem = async (updates: Partial<T10Item>) => {
    if (!selectedItemId) return;
    
    if (useMockMode) {
      setMockItems(prev => prev.map(item => 
        item.id === selectedItemId ? { ...item, ...updates } : item
      ));
    } else {
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
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItemId) return;
    
    if (useMockMode) {
      setMockItems(prev => prev.filter(item => item.id !== selectedItemId));
    } else if (currentWeek) {
      try {
        await deleteItem.mutateAsync({ itemId: selectedItemId, weekId: currentWeek.id });
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
      }
    }
    
    setSidePanelOpen(false);
    setSelectedItemId(null);
    toast({ title: "Item deleted", description: "The priority item has been removed." });
  };

  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !quickAddValue.trim()) return;

    const newRank = Math.max(...displayItems.map(i => i.rank), 0) + 1;
    const title = quickAddValue.trim();
    
    // Check if it looks like a TaskHub key
    const keyMatch = title.match(/^([A-Z]+-\d+)/);
    const taskhubKey = keyMatch ? keyMatch[1] : undefined;

    if (useMockMode) {
      const newItem: T10Item = {
        id: `new-${Date.now()}`,
        week_id: 'mock',
        rank: newRank > 10 ? newRank : 10,
        title,
        taskhub_key: taskhubKey,
        status: 'todo',
        carryover_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMockItems(prev => [...prev, newItem]);
    } else if (currentWeek) {
      try {
        await createItem.mutateAsync({
          weekId: currentWeek.id,
          title,
          rank: newRank > 10 ? newRank : 10,
          taskhubKey,
        });
      } catch (error) {
        toast({ title: "Error", description: "Failed to add item.", variant: "destructive" });
      }
    }

    setQuickAddValue('');
    toast({ title: "Item added", description: `"${title}" added to buffer queue.` });
  };

  const handleCheckout = async (decisions: T10CheckoutDecision[]) => {
    const carriedItems = decisions.filter(d => d.decision === 'carry');
    const resolvedItems = decisions.filter(d => d.decision === 'resolved');
    const removedItems = decisions.filter(d => d.decision === 'remove');

    if (useMockMode) {
      // Mock checkout logic
      toast({
        title: "Week checked out successfully",
        description: `${resolvedItems.length} resolved, ${carriedItems.length} carried to next week.`,
      });
      setCheckoutOpen(false);
      return;
    }

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
        const itemsToCarry = displayItems.filter(i => carriedItems.some(c => c.itemId === i.id));
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
        const incompleteItems = displayItems.filter(i => i.status === 'todo');
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
    return 'Feb 2–8, 2026'; // Mock date
  };

  return (
    <div className="t10-module">
      <header className="t10-week-header">
        <div className="t10-week-header-left">
          <button className="t10-back-btn" onClick={() => navigate('/taskhub/task10')}>
            <ArrowLeft size={18} />
            Back
          </button>
          <span className="t10-list-title">{list?.name || 'Weekly Team Priorities'}</span>
        </div>
        
        <T10WeekNavigation
          weeks={dbWeeks}
          currentWeek={currentWeek || null}
          currentWeekIndex={currentWeekIndex}
          onNavigate={setCurrentWeekIndex}
          onCreateWeek={handleCreateWeek}
          isCreating={isCreatingWeek}
        />
        
        <div className="t10-week-header-right">
          <div className="t10-week-progress">
            <strong>{completedCount}</strong>/10 completed
          </div>
          {currentWeek?.status === 'completed' ? (
            <span className="t10-checked-out-badge">
              <Check size={16} /> Week Closed
            </span>
          ) : currentWeek ? (
            <button className="t10-btn t10-btn-primary" onClick={() => setCheckoutOpen(true)}>
              <CheckCircle size={18} />
              Checkout Week
            </button>
          ) : null}
        </div>
      </header>

      {(currentWeek?.status !== 'completed' || useMockMode) && (
        <T10AISuggestionsPanel
          listId={listId}
          weekId={currentWeek?.id}
          participants={[]} // Could be populated from list participants
          participantNames={['Ibrahim A.', 'Vikram I.', 'Maali A.']} // Mock for now
          currentTopTenCount={topTenItems.length}
          disabled={currentWeek?.status === 'completed' && !useMockMode}
        />
      )}

      {(currentWeek?.status !== 'completed' || useMockMode) && (
        <div className="t10-quick-add">
          <div className={`t10-quick-add-icon ${quickAddValue ? 'active' : ''}`}>
            <Plus size={18} />
          </div>
          <input 
            type="text" 
            className="t10-quick-add-input" 
            placeholder="Add a priority or paste TaskHub key..."
            value={quickAddValue}
            onChange={(e) => setQuickAddValue(e.target.value)}
            onKeyDown={handleQuickAdd}
          />
          <span className="t10-quick-add-hint">
            <kbd>Enter</kbd> to add
          </span>
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

      <T10EnterpriseSidePanel 
        item={displayItems.find(i => i.id === selectedItemId) || null} 
        isOpen={sidePanelOpen} 
        onClose={() => { setSidePanelOpen(false); setSelectedItemId(null); }} 
        onUpdate={handleUpdateItem} 
        onDelete={handleDeleteItem} 
      />
      
      <T10CheckoutModal 
        isOpen={checkoutOpen} 
        onClose={() => setCheckoutOpen(false)} 
        weekDate={formatWeekDisplayForModal()}
        items={displayItems.filter(i => i.rank <= 10)} 
        completedCount={completedCount} 
        onCheckout={handleCheckout} 
      />
    </div>
  );
}
