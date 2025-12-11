import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download, Archive, TrendingUp, PanelRightClose, PanelRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBacklogState } from '../hooks/useBacklogState';

interface BacklogToolbarProps {
  selectedCount: number;
  onOpenPrioritization: () => void;
  onToggleUnassigned: () => void;
  isUnassignedOpen: boolean;
  onExport?: () => void;
  onImport?: () => void;
  onBulkDelete?: () => void;
  onBulkMove?: () => void;
}

export function BacklogToolbar({
  selectedCount,
  onOpenPrioritization,
  onToggleUnassigned,
  isUnassignedOpen,
  onExport,
  onImport,
  onBulkDelete,
  onBulkMove,
}: BacklogToolbarProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEpicName, setNewEpicName] = useState('');
  const queryClient = useQueryClient();
  const { type, isEpicBacklog } = useBacklogState();

  const createEpicMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('epics')
        .insert({ name })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Epic created successfully');
      setNewEpicName('');
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to create epic: ${error.message}`);
    },
  });

  const handleAddClick = () => {
    setIsAddDialogOpen(true);
  };

  const handleCreateEpic = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEpicName.trim()) {
      createEpicMutation.mutate(newEpicName.trim());
    }
  };

  // Label for add button based on type (always Epic in Epic Backlog mode)
  const itemTypeLabel = isEpicBacklog ? 'Epic' : (type === 'epic' ? 'Epic' : type.charAt(0).toUpperCase() + type.slice(1));

  return (
    <>
      <div className="flex items-center gap-2 border-b bg-card px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s4)]">
        <Button size="sm" variant="default" onClick={handleAddClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onImport}>
              <Upload className="h-4 w-4 mr-2" />
              Import from CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </DropdownMenuItem>
            {!isEpicBacklog && (
              <DropdownMenuItem disabled={selectedCount === 0} onClick={onBulkMove}>
                <Archive className="h-4 w-4 mr-2" />
                Mass Move to PI ({selectedCount})
              </DropdownMenuItem>
            )}
            <DropdownMenuItem disabled={selectedCount === 0} onClick={onBulkDelete}>
              <Archive className="h-4 w-4 mr-2" />
              Mass Delete ({selectedCount})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" variant="outline" onClick={onOpenPrioritization}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Prioritize
        </Button>

        {selectedCount > 0 && (
          <div className="ml-2 text-sm text-muted-foreground">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </div>
        )}

        <div className="flex-1" />

        <Button
          size="sm"
          variant="outline"
          onClick={onToggleUnassigned}
        >
          {isUnassignedOpen ? (
            <PanelRightClose className="h-4 w-4 mr-2" />
          ) : (
            <PanelRight className="h-4 w-4 mr-2" />
          )}
          Unassigned Backlog
        </Button>
      </div>

      {/* Add Epic Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New {itemTypeLabel}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateEpic} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{itemTypeLabel} Name</Label>
              <Input
                id="name"
                value={newEpicName}
                onChange={(e) => setNewEpicName(e.target.value)}
                placeholder={`Enter ${itemTypeLabel.toLowerCase()} name...`}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newEpicName.trim() || createEpicMutation.isPending}>
                {createEpicMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}