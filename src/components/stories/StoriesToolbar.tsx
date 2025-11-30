// Stories Toolbar - bulk operations for selected stories
// Citation: Catalyst_Stories_PRD_v2.pdf
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Trash2, Move, UserPlus, MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface StoriesToolbarProps {
  selectedCount: number;
  selectedIds: string[];
  onRefetch: () => void;
  onClearSelection: () => void;
  onPullRank?: () => void;
}

export function StoriesToolbar({ selectedCount, selectedIds, onRefetch, onClearSelection, onPullRank }: StoriesToolbarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`Deleted ${selectedCount} stories`);
      onRefetch();
      onClearSelection();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting stories:', error);
      toast.error('Failed to delete stories');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkMove = () => {
    toast.info('Bulk move functionality coming soon');
  };

  const handleBulkAssign = () => {
    toast.info('Bulk assign functionality coming soon');
  };

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-accent/10 border rounded-lg">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {selectedCount} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-7 text-xs"
          >
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {onPullRank && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPullRank}
              className="h-8"
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Pull Rank
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkMove}
            className="h-8"
          >
            <Move className="h-4 w-4 mr-2" />
            Move
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkAssign}
            className="h-8"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Change Status</DropdownMenuItem>
              <DropdownMenuItem>Change Sprint</DropdownMenuItem>
              <DropdownMenuItem>Change Team</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stories</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} stories? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
