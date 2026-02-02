/**
 * Task¹⁰ Lists Page - Priority Management Dashboard
 * Enterprise Clean header with proper card rendering
 */
import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PlannerSidebar } from '@/modules/planner/components/PlannerSidebar';
import { AqdListCard } from '../components/AqdListCard';
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
      if (error) throw new Error(error.message);
      return (data || []) as unknown as AqdListFull[];
    },
  });

  const createList = useMutation({
    mutationFn: async (name: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('aqd_lists')
        .insert({ name, created_by: userData.user?.id })
        .select()
        .single();
      if (error) throw new Error(error.message);
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
    <div className="flex h-full min-h-screen" style={{ background: 'var(--aqd-background, #f8fafc)' }}>
      <PlannerSidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Enterprise Clean Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0" style={{ borderColor: 'var(--aqd-border, #e2e8f0)' }}>
          {/* Left: Brand + Title */}
          <div className="flex items-center gap-4">
            <div className={styles['aqd-brand']}>
              <span className={styles['aqd-brand-task']}>Task</span>
              <span className={styles['aqd-brand-sup']}>10</span>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--aqd-gray-900, #0f172a)' }}>
                Priority Lists
              </h1>
              <p className="text-sm" style={{ color: 'var(--aqd-gray-500, #64748b)' }}>
                Focus on your top 10 weekly priorities
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowCreateModal(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              New List
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className={styles['aqd-container']}>
          <div className={styles['aqd-container-inner']}>
            {isLoading ? (
              <div className={styles['aqd-loading']}>
                <div className={styles['aqd-spinner']} />
              </div>
            ) : lists.length === 0 ? (
              <div className={styles['aqd-empty-state']}>
                <div className={styles['aqd-empty-state-icon']}>
                  <Target size={32} />
                </div>
                <h3 className={styles['aqd-empty-state-title']}>No priority lists yet</h3>
                <p className={styles['aqd-empty-state-description']}>
                  Create your first priority list to start tracking your top 10 weekly priorities.
                </p>
                <button 
                  className={`${styles['aqd-btn']} ${styles['aqd-btn-primary']}`} 
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={16} />
                  Create First List
                </button>
              </div>
            ) : (
              <div className={styles['aqd-cards-list']}>
                {lists.map((list) => (
                  <AqdListCard 
                    key={list.id} 
                    list={list}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Priority List</DialogTitle>
          </DialogHeader>
          <Input 
            placeholder="List name..." 
            value={newListName} 
            onChange={(e) => setNewListName(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()} 
            autoFocus 
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!newListName.trim() || createList.isPending}
            >
              {createList.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AqdListsPage;
