/**
 * Task¹⁰ Lists Page - Priority Management Dashboard
 * Enterprise Clean header matching /taskhub/timeline
 */
import { useState } from 'react';
import { Plus, Target, MoreHorizontal, Pin, Trash2, Archive } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlannerSidebar } from '@/modules/planner/components/PlannerSidebar';
import type { AqdListFull } from '../types/aqd.types';
import styles from '../styles/aqd.module.css';

export function AqdListsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const queryClient = useQueryClient();

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['aqd-lists'],
    queryFn: async (): Promise<AqdListFull[]> => {
      const { data, error } = await supabase
        .from('aqd_lists_full')
        .select('*')
        .eq('is_archived', false)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AqdListFull[];
    },
  });

  const createList = useMutation({
    mutationFn: async (name: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('aqd_lists').insert({ name, created_by: userData.user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-lists'] });
      setShowCreateModal(false);
      setNewListName('');
      toast.success('List created successfully');
    },
    onError: (e) => toast.error(`Failed to create list: ${e.message}`),
  });

  const handleCreate = () => {
    if (newListName.trim()) createList.mutate(newListName.trim());
  };

  return (
    <div className="flex h-full min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <PlannerSidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Enterprise Clean Header - matching /taskhub/timeline */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0">
          {/* Left: Brand + Title */}
          <div className="flex items-center gap-4">
            {/* Task¹⁰ Brand Badge */}
            <div className={styles['aqd-brand']}>
              <span className={styles['aqd-brand-task']}>Task</span>
              <span className={styles['aqd-brand-sup']}>10</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0f172a] dark:text-slate-100">
                Priority Lists
              </h1>
              <p className="text-sm text-[#64748b] dark:text-slate-400">
                Focus on your top 10 weekly priorities
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowCreateModal(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              New List
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className={styles['aqd-loading']}><div className={styles['aqd-spinner']} /></div>
          ) : lists.length === 0 ? (
            <div className={styles['aqd-empty-state']}>
              <div className={styles['aqd-empty-state-icon']}><Target size={32} /></div>
              <h3 className={styles['aqd-empty-state-title']}>No priority lists yet</h3>
              <p className={styles['aqd-empty-state-description']}>Create your first priority list to start tracking your top 10 weekly priorities.</p>
              <button className={`${styles['aqd-btn']} ${styles['aqd-btn-primary']}`} onClick={() => setShowCreateModal(true)}><Plus size={16} />Create First List</button>
            </div>
          ) : (
            <div className={styles['aqd-cards-list']}>
              {lists.map((list) => (
                <div key={list.id} className={styles['aqd-card']} onClick={() => window.location.href = `/aqd/${list.id}`} style={{ cursor: 'pointer' }}>
                  <div className={styles['aqd-rank-badge']}>{list.is_pinned ? <Pin size={14} /> : list.active_item_count}</div>
                  <div className={styles['aqd-card-body']}>
                    <div className={styles['aqd-card-row-top']}>
                      <div className={styles['aqd-card-title']}>{list.name}</div>
                    </div>
                    <div className={styles['aqd-card-meta']}>
                      <span className={styles['aqd-meta-item']}>{list.active_item_count} items</span>
                      <span className={styles['aqd-meta-item']}>{list.completed_item_count} completed</span>
                      {list.owner_name && <span className={styles['aqd-meta-item']}>by {list.owner_name}</span>}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className={styles['aqd-action-btn']}><MoreHorizontal size={14} /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Pin size={14} className="mr-2" />Pin</DropdownMenuItem>
                      <DropdownMenuItem><Archive size={14} className="mr-2" />Archive</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive"><Trash2 size={14} className="mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Priority List</DialogTitle></DialogHeader>
          <Input placeholder="List name..." value={newListName} onChange={(e) => setNewListName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newListName.trim() || createList.isPending}>{createList.isPending ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AqdListsPage;
