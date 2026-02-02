/**
 * Task10 Priority Lists Page — Linear-inspired Enterprise UI
 * 
 * CRITICAL FIXES:
 * - Clean "Priorities" wordmark (no childish Task¹⁰ branding)
 * - Compact cards (~70px vs ~120px)
 * - Status-based left borders
 * - Avatar circles for owners
 * - Progress % integrated with bar
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
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

  // Pin/Unpin list mutation
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

  // Archive list mutation
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

  // Delete list mutation
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
        {/* Enterprise Clean Header — No childish Task¹⁰ branding */}
        <header className="priority-header">
          <div className="priority-header__left">
            <span className="priority-header__logo">Priorities</span>
            <div className="priority-header__title-area">
              <p className="priority-header__subtitle">
                Focus on your top weekly priorities
              </p>
            </div>
          </div>
          <button 
            className="priority-header__new-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={14} />
            New List
          </button>
        </header>

        {/* Content Area */}
        <div className="priority-container">
          {isLoading ? (
            <AqdSkeletonListCard count={3} />
          ) : lists.length === 0 ? (
            <div className="priority-empty">
              <div className="priority-empty__icon">📋</div>
              <h3 className="priority-empty__title">No priority lists yet</h3>
              <p className="priority-empty__desc">
                Create your first list to start tracking your weekly priorities
              </p>
              <button 
                className="priority-empty__btn"
                onClick={() => setShowCreateModal(true)}
              >
                Create List
              </button>
            </div>
          ) : (
            <div className="priority-list">
              {lists.map((list) => (
                <AqdListCard 
                  key={list.id} 
                  list={list}
                  onPin={(id) => pinList.mutate(id)}
                  onArchive={(id) => archiveList.mutate(id)}
                  onDelete={(id) => setDeleteConfirmId(id)}
                />
              ))}
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
