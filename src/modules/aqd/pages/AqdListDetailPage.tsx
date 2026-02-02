/**
 * AQD¹⁰ List Detail Page - Weekly Priority View
 */
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, MoreHorizontal, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { AqdListFull, AqdWeekFull, AqdItemFull, AqdItemStatus } from '../types/aqd.types';
import { formatWeekRange, splitItems, AQD_STATUS_CONFIG, AQD_LIMITS } from '../types/aqd.types';
import styles from '../styles/aqd.module.css';

export function AqdListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');

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
      
      // Fetch full week details
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

  const handleAddItem = useCallback(() => {
    if (newItemTitle.trim()) {
      createItem.mutate(newItemTitle.trim());
    }
  }, [newItemTitle, createItem]);

  const { top, overflow } = splitItems(items);
  const isLoading = listLoading || weekLoading || itemsLoading;

  const getRankBadgeClass = (rank: number): string => {
    if (rank === 1) return `${styles['aqd-rank-badge']} ${styles['aqd-rank-gold']}`;
    if (rank === 2) return `${styles['aqd-rank-badge']} ${styles['aqd-rank-silver']}`;
    if (rank === 3) return `${styles['aqd-rank-badge']} ${styles['aqd-rank-bronze']}`;
    return styles['aqd-rank-badge'];
  };

  const getStatusClass = (status: AqdItemStatus): string => {
    return `${styles['aqd-status-indicator']} ${styles[`aqd-status-${AQD_STATUS_CONFIG[status].cssClass}`]}`;
  };

  if (isLoading) {
    return (
      <div className={styles['aqd-root']}>
        <div className={styles['aqd-loading']}><div className={styles['aqd-spinner']} /></div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className={styles['aqd-root']}>
        <div className={styles['aqd-empty-state']}>
          <h3 className={styles['aqd-empty-state-title']}>List not found</h3>
          <Button onClick={() => navigate('/aqd')}>Back to Lists</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['aqd-root']}>
      <div className={styles['aqd-layout']}>
        <main className={styles['aqd-main']}>
          <div className={styles['aqd-container']}>
            {/* Header */}
            <header className={styles['aqd-header']}>
              <div className={styles['aqd-header-left']}>
                <button className={styles['aqd-back-btn']} onClick={() => navigate('/aqd')}>
                  <ArrowLeft size={16} />
                </button>
                <div className={styles['aqd-brand']}><span className={styles['aqd-brand-text']}>10</span></div>
                <div>
                  <h1 className={styles['aqd-list-title']}>{list.name}</h1>
                  {currentWeek && (
                    <div className={styles['aqd-list-meta']}>
                      Week {currentWeek.week_number} • {formatWeekRange(currentWeek.start_date, currentWeek.end_date)}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles['aqd-header-right']}>
                {/* Week navigator */}
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
                  className="gap-2"
                  disabled={items.length >= AQD_LIMITS.MAX_TOTAL_ITEMS}
                >
                  <Plus size={16} />Add Priority
                </Button>
              </div>
            </header>

            {/* Priority Cards Grid */}
            <div className={styles['aqd-cards-grid']}>
              {/* Top 10 slots */}
              {Array.from({ length: AQD_LIMITS.MAX_TOP_ITEMS }, (_, i) => {
                const item = top.find(it => it.rank === i + 1);
                if (item) {
                  return (
                    <div key={item.id} className={styles['aqd-card']}>
                      <div className={getRankBadgeClass(item.rank)}>{item.rank}</div>
                      <div className={styles['aqd-card-body']}>
                        <div className={styles['aqd-card-row-top']}>
                          <div className={styles['aqd-card-title']}>{item.title}</div>
                        </div>
                        <div className={styles['aqd-card-meta']}>
                          {item.taskhub_key && (
                            <span className={styles['aqd-meta-item']}>{item.taskhub_key}</span>
                          )}
                          {item.assignee_name && (
                            <span className={styles['aqd-meta-item']}>{item.assignee_name}</span>
                          )}
                        </div>
                      </div>
                      <button
                        className={getStatusClass(item.status)}
                        onClick={() => cycleStatus.mutate(item.id)}
                        title={`Click to change status (${AQD_STATUS_CONFIG[item.status].label})`}
                      />
                      <button className={styles['aqd-action-btn']}>
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
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

            {/* Overflow section */}
            {overflow.length > 0 && (
              <div className={styles['aqd-overflow-section']}>
                <h3 className={styles['aqd-overflow-title']}>Overflow ({overflow.length})</h3>
                <div className={styles['aqd-cards-list']}>
                  {overflow.map(item => (
                    <div key={item.id} className={styles['aqd-card']}>
                      <div className={styles['aqd-rank-badge']}>{item.rank}</div>
                      <div className={styles['aqd-card-body']}>
                        <div className={styles['aqd-card-row-top']}>
                          <div className={styles['aqd-card-title']}>{item.title}</div>
                        </div>
                        <div className={styles['aqd-card-meta']}>
                          {item.taskhub_key && (
                            <span className={styles['aqd-meta-item']}>{item.taskhub_key}</span>
                          )}
                        </div>
                      </div>
                      <button
                        className={getStatusClass(item.status)}
                        onClick={() => cycleStatus.mutate(item.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Item Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Priority Item</DialogTitle></DialogHeader>
          <Input
            placeholder="What's the priority?"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={!newItemTitle.trim() || createItem.isPending}>
              {createItem.isPending ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AqdListDetailPage;
