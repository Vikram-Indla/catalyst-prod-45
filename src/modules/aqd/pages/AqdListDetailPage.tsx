/**
 * Task¹⁰ List Detail Page - Weekly Priority View
 * Full MVP: Filters, Side Panel, Drag & Drop, Notes
 */
import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, LogOut } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PlannerSidebar } from '@/modules/planner/components/PlannerSidebar';
import { AqdPriorityCard } from '../components/AqdPriorityCard';
import { AqdFilterBar } from '../components/AqdFilterBar';
import { AqdItemDetailPanel } from '../components/AqdItemDetailPanel';
import { AqdDraggableList } from '../components/AqdDraggableList';
import type { AqdListFull, AqdWeekFull, AqdItemFull, AqdItemStatus } from '../types/aqd.types';
import { formatWeekRange, splitItems, AQD_LIMITS } from '../types/aqd.types';
import { useAqdFilters } from '../hooks/useAqdFilters';
import { useAqdLabels } from '../hooks/useAqdLabels';
import '../styles/aqd.css';
import '../styles/task10-override.css';

export function AqdListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [quickAddValue, setQuickAddValue] = useState('');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [selectedItem, setSelectedItem] = useState<AqdItemFull | null>(null);

  // Fetch list details
  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ['aqd-list', listId],
    queryFn: async (): Promise<AqdListFull | null> => {
      if (!listId) return null;
      const { data, error } = await supabase
        .from('aqd_lists_full')
        .select('*')
        .eq('id', listId)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as AqdListFull;
    },
    enabled: !!listId,
  });

  // Fetch or create current week
  const { data: currentWeek, isLoading: weekLoading } = useQuery({
    queryKey: ['aqd-current-week', listId],
    queryFn: async (): Promise<AqdWeekFull | null> => {
      if (!listId) return null;
      const { data, error } = await supabase.rpc('aqd_get_or_create_current_week', { p_list_id: listId });
      if (error) throw new Error(error.message);
      
      const { data: weekData, error: weekError } = await supabase
        .from('aqd_weeks_full')
        .select('*')
        .eq('id', data)
        .single();
      if (weekError) throw new Error(weekError.message);
      return weekData as unknown as AqdWeekFull;
    },
    enabled: !!listId,
  });

  // Fetch items for current week
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['aqd-items', currentWeek?.id],
    queryFn: async (): Promise<AqdItemFull[]> => {
      if (!currentWeek?.id) return [];
      const { data, error } = await supabase
        .from('aqd_items_full')
        .select('*')
        .eq('week_id', currentWeek.id)
        .order('rank', { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []) as unknown as AqdItemFull[];
    },
    enabled: !!currentWeek?.id,
  });

  // Fetch labels
  const { labels } = useAqdLabels(listId);

  // Filter state and logic
  const {
    searchQuery,
    statusFilter,
    labelFilter,
    assigneeFilter,
    setSearchQuery,
    setStatusFilter,
    setLabelFilter,
    setAssigneeFilter,
    filteredItems,
    uniqueAssignees,
  } = useAqdFilters(items);

  // Split items into top 10 and overflow
  const { top, overflow } = useMemo(() => splitItems(filteredItems), [filteredItems]);

  // Compute progress
  const completedCount = items.filter(i => i.status === 'completed').length;
  const totalCount = items.length;

  // Create item mutation
  const createItem = useMutation({
    mutationFn: async (title: string) => {
      if (!listId || !currentWeek?.id) throw new Error('Missing list or week');
      const { data: userData } = await supabase.auth.getUser();
      const nextRank = items.length > 0 ? Math.max(...items.map(i => i.rank)) + 1 : 1;
      
      const { data, error } = await supabase
        .from('aqd_items')
        .insert({
          list_id: listId,
          week_id: currentWeek.id,
          title,
          rank: nextRank,
          created_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-items', currentWeek?.id] });
      setShowAddModal(false);
      setNewItemTitle('');
      setQuickAddValue('');
      toast.success('Priority item added');
    },
    onError: (e) => toast.error(`Failed to add item: ${e.message}`),
  });

  // Cycle status mutation
  const cycleStatus = useMutation({
    mutationFn: async (itemId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.rpc('aqd_cycle_item_status', {
        p_item_id: itemId,
        p_user_id: userData.user?.id || null,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-items', currentWeek?.id] });
    },
    onError: (e) => toast.error(`Failed to update status: ${e.message}`),
  });

  // Delete item mutation
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('aqd_items').delete().eq('id', itemId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-items', currentWeek?.id] });
      setSelectedItem(null);
      toast.success('Item deleted');
    },
    onError: (e) => toast.error(`Failed to delete item: ${e.message}`),
  });

  // Reorder item mutation - direct update since RPC may not exist
  const reorderItem = useMutation({
    mutationFn: async ({ itemId, newRank }: { itemId: string; newRank: number }) => {
      // Simple rank update - in production you'd want proper reordering logic
      const { error } = await supabase
        .from('aqd_items')
        .update({ rank: newRank })
        .eq('id', itemId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-items', currentWeek?.id] });
    },
    onError: (e) => toast.error(`Failed to reorder: ${e.message}`),
  });

  const handleAddItem = useCallback(() => {
    if (newItemTitle.trim()) {
      createItem.mutate(newItemTitle.trim());
    }
  }, [newItemTitle, createItem]);

  const handleQuickAdd = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickAddValue.trim()) {
      createItem.mutate(quickAddValue.trim());
    }
  }, [quickAddValue, createItem]);

  const handleReorder = useCallback((itemId: string, newRank: number) => {
    reorderItem.mutate({ itemId, newRank });
  }, [reorderItem]);

  const handleEditItem = useCallback((item: AqdItemFull) => {
    setSelectedItem(item);
  }, []);

  const isLoading = listLoading || weekLoading || itemsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full min-h-screen task10-app aqd-root" style={{ background: 'var(--aqd-background, #f8fafc)' }}>
        <PlannerSidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />
        <div className="flex flex-col flex-1 min-w-0 items-center justify-center">
          <div className="aqd-spinner" />
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex h-full min-h-screen task10-app aqd-root" style={{ background: 'var(--aqd-background, #f8fafc)' }}>
        <PlannerSidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />
        <div className="flex flex-col flex-1 min-w-0 items-center justify-center">
          <h3 className="text-lg font-medium mb-4">List not found</h3>
          <Button onClick={() => navigate('/aqd')}>Back to Lists</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen task10-app aqd-root" style={{ background: 'var(--aqd-background, #f8fafc)' }}>
      <PlannerSidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="aqd-header t10-header">
          <div className="aqd-header-left t10-header-left">
            <button className="aqd-back-btn t10-btn-back" onClick={() => navigate('/aqd')}>
              <ArrowLeft size={16} />
            </button>
            <div className="aqd-brand">
              <span className="aqd-brand-task">Task</span>
              <span className="aqd-brand-sup">10</span>
            </div>
            <div className="t10-header-title-group">
              <h1 className="aqd-list-title t10-header-title">{list.name}</h1>
              {currentWeek && (
                <div className="aqd-list-meta t10-header-meta">
                  <span className="t10-week-badge">Week {currentWeek.week_number}</span>
                  <span>{formatWeekRange(currentWeek.start_date, currentWeek.end_date)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="aqd-header-right t10-header-right">
            {/* Week Navigator */}
            <div className="aqd-week-navigator t10-week-nav">
              <button className="aqd-week-nav-btn t10-btn-nav" disabled>
                <ChevronLeft size={16} />
              </button>
              <span className="aqd-week-current">Current</span>
              <button className="aqd-week-nav-btn t10-btn-nav" disabled>
                <ChevronRight size={16} />
              </button>
            </div>
            <button 
              onClick={() => setShowAddModal(true)} 
              className="t10-btn-primary"
              disabled={items.length >= AQD_LIMITS.MAX_TOTAL_ITEMS}
            >
              <Plus size={16} />
              Add Priority
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="aqd-container t10-content">
          <div className="aqd-container-inner">
            {/* Filter Bar */}
            <AqdFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              labelFilter={labelFilter}
              onLabelFilterChange={setLabelFilter}
              labels={labels}
              assigneeFilter={assigneeFilter}
              onAssigneeFilterChange={setAssigneeFilter}
              assignees={uniqueAssignees}
            />

            {/* Quick Add */}
            <div className="aqd-quick-add t10-quick-add">
              <div className="aqd-quick-add-icon t10-quick-add-icon">
                <Plus size={16} />
              </div>
              <input
                type="text"
                className="aqd-quick-add-input t10-quick-add-input"
                placeholder="Quick add priority item..."
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                onKeyDown={handleQuickAdd}
                disabled={items.length >= AQD_LIMITS.MAX_TOTAL_ITEMS}
              />
              <span className="aqd-quick-add-hint t10-quick-add-hint">
                Press <kbd>Enter</kbd> to add
              </span>
            </div>

            {/* Section Header */}
            <div className="aqd-section-header">
              <span className="aqd-section-title">Top Priorities</span>
              <span className="aqd-section-progress">{completedCount} of {Math.min(totalCount, 10)} completed</span>
            </div>

            {/* Top 10 Priority Cards with Drag & Drop */}
            {top.length > 0 ? (
              <AqdDraggableList
                items={top}
                onReorder={handleReorder}
                onStatusChange={(id) => cycleStatus.mutate(id)}
                onEdit={handleEditItem}
                onDelete={(id) => deleteItem.mutate(id)}
                droppableId="top-priorities"
              />
            ) : (
              <div className="aqd-cards-grid t10-priority-grid">
                {Array.from({ length: Math.min(3, AQD_LIMITS.MAX_TOP_ITEMS) }, (_, i) => (
                  <div key={`empty-${i}`} className="aqd-empty-slot t10-empty-slot">
                    <span className="aqd-empty-slot-rank t10-empty-slot-rank">{i + 1}</span>
                    <span className="aqd-empty-slot-text t10-empty-slot-text">Empty slot</span>
                  </div>
                ))}
              </div>
            )}

            {/* Overflow Section */}
            {overflow.length > 0 && (
              <div className="aqd-overflow-section t10-overflow-section">
                <div className="aqd-section-header">
                  <span className="aqd-section-title">Overflow</span>
                  <span className="aqd-section-count">{overflow.length} items</span>
                </div>
                <AqdDraggableList
                  items={overflow}
                  onReorder={handleReorder}
                  onStatusChange={(id) => cycleStatus.mutate(id)}
                  onEdit={handleEditItem}
                  onDelete={(id) => deleteItem.mutate(id)}
                  droppableId="overflow"
                  isOverflow
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {selectedItem && currentWeek && (
        <AqdItemDetailPanel
          item={selectedItem}
          listId={listId!}
          weekId={currentWeek.id}
          labels={labels}
          onClose={() => setSelectedItem(null)}
          onDelete={(id) => deleteItem.mutate(id)}
        />
      )}

      {/* Add Item Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Priority Item</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="What's the priority?"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddItem} 
              disabled={!newItemTitle.trim() || createItem.isPending}
            >
              {createItem.isPending ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AqdListDetailPage;
