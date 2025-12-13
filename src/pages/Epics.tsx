import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV } from '@/lib/exportUtils';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { CommentsSection } from '@/components/shared/CommentsSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RightDetailsPanel } from '@/components/shared/RightDetailsPanel';
import { ListScreenToolbar } from '@/components/shared/ListScreenToolbar';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { EpicDialog } from '@/components/forms/EpicDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Edit } from 'lucide-react';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

export default function Epics() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['epics', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select('*, strategic_themes(name), programs!primary_program_id(name)')
        .order('name');

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const selectedData = items?.find(i => i.id === selectedItem);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      proposed: 'secondary',
      analyzing: 'secondary',
      approved: 'default',
      in_progress: 'default',
      done: 'outline',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status.replace('_', ' ')}</Badge>;
  };

  const handleCreate = () => {
    setEditingEpic(null);
    setDialogOpen(true);
  };

  const handleEdit = (epic: any) => {
    setEditingEpic(epic);
    setDialogOpen(true);
  };

  const importMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const { error } = await supabase.from('epics').insert(data.map(row => ({
        name: row.name,
        description: row.description || null,
        status: row.status || 'proposed',
        health: row.health || 'green',
        theme_id: row.theme_id || null,
      })));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast({ title: 'Epics imported successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to import epics', variant: 'destructive' });
    }
  });

  const handleExport = () => {
    if (items && items.length > 0) {
      exportToCSV(items, 'epics', ['name', 'description', 'status', 'health', 'start_date', 'end_date']);
      toast({ title: 'Epics exported successfully' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="h-[72px] border-b bg-card flex-shrink-0">
        <div className="h-full px-3 sm:px-6 flex items-center">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">Epics</h1>
              <p className="text-sm text-muted-foreground truncate">Large initiatives broken into deliverable features</p>
            </div>
            <PermissionGuard requiredRole="program_manager" showMessage={false}>
              <Button onClick={handleCreate} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm flex-shrink-0 px-3">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </PermissionGuard>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-3 sm:p-6 space-y-3 sm:space-y-4 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search epics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        <ListScreenToolbar selectedCount={selectedRows.length} onColumnChooser={() => {}} onBulkEdit={() => {}} onExport={handleExport} onImport={() => setImportDialogOpen(true)} />

        <div className="flex-1 border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><Checkbox /></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Theme</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Dates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : items && items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell><Checkbox /></TableCell>
                    <TableCell className="font-medium cursor-pointer" onClick={() => setSelectedItem(item.id)}>{item.name}</TableCell>
                    <TableCell className="text-sm">{item.strategic_themes?.name || '-'}</TableCell>
                    <TableCell className="text-sm">{item.programs?.name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(item.status || 'proposed')}</TableCell>
                    <TableCell><HealthBadge health={item.health} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.start_date && item.end_date 
                        ? `${new Date(item.start_date).toLocaleDateString()} - ${new Date(item.end_date).toLocaleDateString()}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No epics found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedData && (
        <RightDetailsPanel open={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedData.name}
          tabs={[
            { id: 'overview', label: 'Overview', content: (
              <div className="space-y-4">
                <PermissionGuard requiredRole="program_manager" showMessage={false}>
                  <Button onClick={() => handleEdit(selectedData)} className="w-full mb-4">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Epic
                  </Button>
                </PermissionGuard>
                <div><label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedData.status || 'proposed')}</div></div>
                <div><label className="text-sm font-medium text-muted-foreground">Health</label>
                  <div className="mt-1"><HealthBadge health={selectedData.health} /></div></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium text-muted-foreground">Start Date</label>
                    <p className="mt-1 text-sm">{selectedData.start_date ? new Date(selectedData.start_date).toLocaleDateString() : '-'}</p></div>
                  <div><label className="text-sm font-medium text-muted-foreground">End Date</label>
                    <p className="mt-1 text-sm">{selectedData.end_date ? new Date(selectedData.end_date).toLocaleDateString() : '-'}</p></div>
                </div>
                <div><label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1 text-sm">{selectedData.description || 'No description'}</p></div>
              </div>
            )},
            { id: 'links', label: 'Links', content: <p className="text-sm text-muted-foreground">Linked features and stories</p> },
            { id: 'forecast', label: 'Forecast', content: <p className="text-sm text-muted-foreground">PI planning and estimates</p> },
            { id: 'comments', label: 'Comments', content: <CommentsSection entityId={selectedItem} entityType="epic" /> },
          ]}
        />
      )}

      <EpicDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        epic={editingEpic}
      />
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={(data) => importMutation.mutate(data)}
        title="Import Epics"
        requiredFields={['name']}
      />
    </div>
  );
}
