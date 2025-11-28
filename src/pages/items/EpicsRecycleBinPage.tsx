import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, RotateCcw, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
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

export default function EpicsRecycleBinPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: deletedEpics, isLoading } = useQuery({
    queryKey: ['deleted-epics', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select('*, strategic_themes(name), programs(name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (epicId: string) => {
      const { error } = await supabase
        .from('epics')
        .update({ deleted_at: null })
        .eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-epics'] });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic restored successfully');
    },
    onError: () => {
      toast.error('Failed to restore epic');
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (epicId: string) => {
      const { error } = await supabase
        .from('epics')
        .delete()
        .eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-epics'] });
      toast.success('Epic permanently deleted');
      setConfirmDelete(null);
    },
    onError: () => {
      toast.error('Failed to delete epic permanently');
      setConfirmDelete(null);
    },
  });

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/items/epics')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Epics Recycle Bin</h1>
              <p className="text-sm text-muted-foreground">
                Restore or permanently delete epics
              </p>
            </div>
          </div>
          <Badge variant="secondary">
            {deletedEpics?.length || 0} deleted items
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deleted epics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Theme</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Deleted Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading deleted epics...
                  </TableCell>
                </TableRow>
              ) : deletedEpics && deletedEpics.length > 0 ? (
                deletedEpics.map((epic) => (
                  <TableRow key={epic.id}>
                    <TableCell className="font-medium">{epic.name}</TableCell>
                    <TableCell className="text-sm">
                      {epic.strategic_themes?.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {epic.programs?.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {epic.deleted_at
                        ? new Date(epic.deleted_at).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreMutation.mutate(epic.id)}
                          disabled={restoreMutation.isPending}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setConfirmDelete(epic.id)}
                          disabled={permanentDeleteMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete Forever
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No deleted epics found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Epic?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the epic
              and all its associated data from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && permanentDeleteMutation.mutate(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
