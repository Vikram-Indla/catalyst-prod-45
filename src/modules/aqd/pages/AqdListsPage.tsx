/**
 * Task¹⁰ Lists Page - Priority Management Dashboard
 * Uses direct CSS classes for proper styling
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
// Import CSS files - these define the global .aqd-* and .t10-* classes
import '../styles/aqd.css';
import '../styles/task10-override.css';

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
    <div className="flex h-full min-h-screen task10-app aqd-root" style={{ background: 'var(--aqd-background, #f8fafc)' }}>
      <PlannerSidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Enterprise Clean Header */}
        <div className="aqd-header t10-header">
          {/* Left: Brand + Title */}
          <div className="aqd-header-left t10-header-left">
            {/* ISSUE 6 FIX: Gradient icon + wordmark logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center text-white text-xs font-extrabold">
                10
              </div>
              <span className="text-lg font-bold text-slate-900">
                Task<sup className="text-xs font-bold text-teal-600 -top-1 relative">10</sup>
              </span>
            </div>
            <div className="t10-header-title-group">
              <h1 className="aqd-list-title t10-header-title">
                Priority Lists
              </h1>
              <p className="aqd-list-meta t10-header-meta">
                Focus on your top 10 weekly priorities
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="aqd-header-right t10-header-right">
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="t10-btn-primary"
            >
              <Plus size={16} />
              New List
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="aqd-container t10-content">
          <div className="aqd-container-inner">
            {isLoading ? (
              <div className="aqd-loading">
                <div className="aqd-spinner" />
              </div>
            ) : lists.length === 0 ? (
              <div className="aqd-empty-state t10-empty-state">
                <div className="aqd-empty-state-icon t10-empty-icon">
                  <Target size={32} />
                </div>
                <h3 className="aqd-empty-state-title t10-empty-title">No priority lists yet</h3>
                <p className="aqd-empty-state-description t10-empty-description">
                  Create your first priority list to start tracking your top 10 weekly priorities.
                </p>
                <button 
                  className="t10-btn-primary" 
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={16} />
                  Create First List
                </button>
              </div>
            ) : (
              <div className="aqd-cards-list t10-lists-grid">
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
