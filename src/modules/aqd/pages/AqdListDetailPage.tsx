/**
 * Task¹⁰ List Detail Page - Weekly Priority View
 * Features: Priority cards, status toggles, carryover indicators, labels
 */
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PlannerSidebar } from '@/modules/planner/components/PlannerSidebar';
import { AqdPriorityCard } from '../components/AqdPriorityCard';
import type { AqdListFull, AqdWeekFull, AqdItemFull } from '../types/aqd.types';
import { formatWeekRange, splitItems, AQD_LIMITS } from '../types/aqd.types';
import styles from '../styles/aqd.module.css';

export function AqdListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [quickAddValue, setQuickAddValue] = useState('');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

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
      toast.success('Item deleted');
    },
    onError: (e) => toast.error(`Failed to delete item: ${e.message}`),
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

  const { top, overflow } = splitItems(items);
  const isLoading = listLoading || weekLoading || itemsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full min-h-screen" style={{ background: 'var(--aqd-background, #f8fafc)' }}>
        <PlannerSidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />
        <div className="flex flex-col flex-1 min-w-0 items-center justify-center">
          <div className={styles['aqd-spinner']} />
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex h-full min-h-screen" style={{ background: 'var(--aqd-background, #f8fafc)' }}>
        <PlannerSidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />
        <div className="flex flex-col flex-1 min-w-0 items-center justify-center">
          <h3 className="text-lg font-medium mb-4">List not found</h3>
          <Button onClick={() => navigate('/aqd')}>Back to Lists</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen" style={{ background: 'var(--aqd-background, #f8fafc)' }}>
      <PlannerSidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0" style={{ borderColor: 'var(--aqd-border, #e2e8f0)' }}>
          <div className="flex items-center gap-4">
            <button className={styles['aqd-back-btn']} onClick={() => navigate('/aqd')}>
              <ArrowLeft size={16} />
            </button>
            <div className={styles['aqd-brand']}>
              <span className={styles['aqd-brand-task']}>Task</span>
              <span className={styles['aqd-brand-sup']}>10</span>
            </div>
            <div>
              <h1 className={styles['aqd-list-title']}>{list.name}</h1>
              {currentWeek && (
                <div className={styles['aqd-list-meta']}>
                  Week {currentWeek.week_number} · {formatWeekRange(currentWeek.start_date, currentWeek.end_date)}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Week Navigator */}
            <div className={styles['aqd-week-navigator']}>
              <button className={styles['aqd-week-nav-btn']} disabled>
                <ChevronLeft size={16} />
              </button>
              <span className={styles['aqd-week-current']}>Current</span>
              <button className={styles['aqd-week-nav-btn']} disabled>
                <ChevronRight size={16} />
              </button>
            </div>
            <Button 
              onClick={() => setShowAddModal(true)} 
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={items.length >= AQD_LIMITS.MAX_TOTAL_ITEMS}
            >
              <Plus size={16} />
              Add Priority
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className={styles['aqd-container']}>
          <div className={styles['aqd-container-inner']}>
            {/* Quick Add */}
            <div className={styles['aqd-quick-add']}>
              <div className={styles['aqd-quick-add-icon']}>
                <Plus size={16} />
              </div>
              <input
                type="text"
                className={styles['aqd-quick-add-input']}
                placeholder="Quick add priority item..."
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                onKeyDown={handleQuickAdd}
                disabled={items.length >= AQD_LIMITS.MAX_TOTAL_ITEMS}
              />
              <span className={styles['aqd-quick-add-hint']}>
                Press <kbd>Enter</kbd> to add
              </span>
            </div>

            {/* Top 10 Priority Cards */}
            <div className={styles['aqd-cards-grid']}>
              {Array.from({ length: AQD_LIMITS.MAX_TOP_ITEMS }, (_, i) => {
                const item = top.find(it => it.rank === i + 1);
                if (item) {
                  return (
                    <AqdPriorityCard
                      key={item.id}
                      item={item}
                      onStatusChange={(id) => cycleStatus.mutate(id)}
                      onDelete={(id) => deleteItem.mutate(id)}
                    />
                  );
                }
                return (
                  <div key={`empty-${i}`} className={styles['aqd-empty-slot']}>
                    <span className={styles['aqd-empty-slot-rank']}>{i + 1}</span>
                    <span className={styles['aqd-empty-slot-text']}>Empty slot</span>
                  </div>
                );
              })}
            </div>

            {/* Overflow Section */}
            {overflow.length > 0 && (
              <div className={styles['aqd-overflow-section']}>
                <h3 className={styles['aqd-overflow-title']}>Overflow ({overflow.length})</h3>
                <div className={styles['aqd-cards-list']}>
                  {overflow.map(item => (
                    <AqdPriorityCard
                      key={item.id}
                      item={item}
                      onStatusChange={(id) => cycleStatus.mutate(id)}
                      onDelete={(id) => deleteItem.mutate(id)}
                      isOverflow
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
