/**
 * Task¹⁰ Priority Lists Page — Enterprise UI v2
 * 
 * ENTERPRISE OVERHAUL:
 * - Branded header with Task¹⁰ logo + stats
 * - Section headers (Pinned / All Lists)
 * - No emoji icons (professional design)
 * - Hover-reveal menus
 * - Last updated timestamps
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pin, ClipboardList, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlannerSidebar } from '@/modules/planner/components/PlannerSidebar';
import { AqdListCard } from '../components/AqdListCard';
import { AqdSkeletonListCard } from '../components/AqdSkeletonCard';
import type { AqdListFull } from '../types/aqd.types';
import '@/styles/priority-lists.css';

export function AqdListsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  // Separate pinned and unpinned lists
  const { pinnedLists, unpinnedLists } = useMemo(() => {
    const pinned = lists.filter(l => l.is_pinned);
    const unpinned = lists.filter(l => !l.is_pinned);
    return { pinnedLists: pinned, unpinnedLists: unpinned };
  }, [lists]);

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

  const pinList = useMutation({
    mutationFn: async (listId: string) => {
      const list = lists.find(l => l.id === listId);
      const { error } = await supabase
        .from('aqd_lists')
        .update({ is_pinned: !list?.is_pinned })
        .eq('id', listId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-lists'] });
      toast.success('List updated');
    },
    onError: (e) => toast.error(`Failed to update list: ${e.message}`),
  });

  const archiveList = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('aqd_lists')
        .update({ is_archived: true })
        .eq('id', listId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-lists'] });
      toast.success('List archived');
    },
    onError: (e) => toast.error(`Failed to archive list: ${e.message}`),
  });

  const deleteList = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('aqd_lists')
        .delete()
        .eq('id', listId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-lists'] });
      setDeleteConfirmId(null);
      toast.success('List deleted');
    },
    onError: (e) => toast.error(`Failed to delete list: ${e.message}`),
  });

  const handleCreate = () => {
    if (newListName.trim()) createList.mutate(newListName.trim());
  };

  return (
    <div className="flex h-full min-h-screen priority-page">
      <PlannerSidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Minimal Header — Matches Weekly Detail Page Style */}
        <header className="priority-header-v3">
          <div className="priority-header-v3__inner">
            {/* Left: Back + Logo + Title */}
            <div className="priority-header-v3__left">
              <button 
                className="priority-header-v3__back"
                onClick={() => navigate('/taskhub')}
                aria-label="Go back"
              >
                <ArrowLeft size={20} />
              </button>
              
              {/* Logo badge */}
              <div className="priority-header-v3__logo">
                <span className="priority-header-v3__logo-text">10</span>
              </div>
              <span className="priority-header-v3__wordmark">
                Task<sup className="priority-header-v3__sup">10</sup>
              </span>
              
              {/* Title */}
              <h1 className="priority-header-v3__title">Priority Lists</h1>
            </div>
            
            {/* Right: Action */}
            <button 
              className="priority-header-v3__action"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} />
              New List
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="priority-container">
          {isLoading ? (
            <AqdSkeletonListCard count={3} />
          ) : lists.length === 0 ? (
            <div className="priority-empty-v2">
              <div className="priority-empty-v2__icon">
                <ClipboardList size={32} />
              </div>
              <h3 className="priority-empty-v2__title">No priority lists yet</h3>
              <p className="priority-empty-v2__desc">
                Create your first list to start focusing on your top 10 weekly priorities.
              </p>
              <button 
                className="priority-empty-v2__btn"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={16} />
                Create Your First List
              </button>
            </div>
          ) : (
            <div className="priority-sections">
              {/* Pinned Section */}
              {pinnedLists.length > 0 && (
                <section className="priority-section">
                  <h2 className="priority-section__header">
                    <Pin size={12} />
                    Pinned
                  </h2>
                  <div className="priority-list">
                    {pinnedLists.map((list) => (
                      <AqdListCard 
                        key={list.id} 
                        list={list}
                        onPin={(id) => pinList.mutate(id)}
                        onArchive={(id) => archiveList.mutate(id)}
                        onDelete={(id) => setDeleteConfirmId(id)}
                      />
                    ))}
                  </div>
                </section>
              )}
              
              {/* All Lists Section */}
              <section className="priority-section">
                <h2 className="priority-section__header">
                  {pinnedLists.length > 0 ? 'All Lists' : 'Your Lists'}
                </h2>
                <div className="priority-list">
                  {unpinnedLists.map((list) => (
                    <AqdListCard 
                      key={list.id} 
                      list={list}
                      onPin={(id) => pinList.mutate(id)}
                      onArchive={(id) => archiveList.mutate(id)}
                      onDelete={(id) => setDeleteConfirmId(id)}
                    />
                  ))}
                  {unpinnedLists.length === 0 && pinnedLists.length > 0 && (
                    <p className="priority-section__empty">No unpinned lists</p>
                  )}
                </div>
              </section>
            </div>
          )}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Priority List?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All items in this list will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && deleteList.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteList.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AqdListsPage;
