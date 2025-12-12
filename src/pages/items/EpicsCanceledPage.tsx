import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, RotateCcw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function EpicsCanceledPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: canceledEpics, isLoading } = useQuery({
    queryKey: ['canceled-epics', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select('*, strategic_themes(name), programs!primary_program_id(name)')
        .eq('status', 'cancelled')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

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
        .update({ status: 'proposed' })
        .eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canceled-epics'] });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic restored from canceled state');
    },
    onError: () => {
      toast.error('Failed to restore epic');
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
              <h1 className="text-2xl font-bold">Canceled Epics</h1>
              <p className="text-sm text-muted-foreground">
                Epics that have been canceled or frozen
              </p>
            </div>
          </div>
          <Badge variant="secondary">
            {canceledEpics?.length || 0} canceled items
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search canceled epics..."
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
                <TableHead>Canceled Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading canceled epics...
                  </TableCell>
                </TableRow>
              ) : canceledEpics && canceledEpics.length > 0 ? (
                canceledEpics.map((epic) => (
                  <TableRow key={epic.id}>
                    <TableCell className="font-medium">{epic.name}</TableCell>
                    <TableCell className="text-sm">
                      {epic.strategic_themes?.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {epic.programs?.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {epic.updated_at
                        ? new Date(epic.updated_at).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreMutation.mutate(epic.id)}
                        disabled={restoreMutation.isPending}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No canceled epics found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="px-6 py-4 border-t bg-muted/30">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Canceled epics are frozen and not included in active planning.
          Restore them to bring them back into active status.
        </p>
      </div>
    </div>
  );
}
