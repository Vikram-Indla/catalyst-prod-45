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
import { FeatureDialog } from '@/components/forms/FeatureDialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Edit } from 'lucide-react';

export default function Features() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['features', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('features')
        .select('*, epics(name), programs(name), program_increments(name), iterations(name)')
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
      funnel: 'secondary',
      analyzing: 'secondary',
      backlog: 'default',
      implementing: 'default',
      done: 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const handleCreate = () => {
    setEditingFeature(null);
    setDialogOpen(true);
  };

  const handleEdit = (feature: any) => {
    setEditingFeature(feature);
    setDialogOpen(true);
  };

  const importMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const { error } = await supabase.from('features').insert(data.map(row => ({
        name: row.name,
        description: row.description || null,
        status: row.status || 'funnel',
        health: row.health || 'green',
        epic_id: row.epic_id,
        program_id: row.program_id,
        estimate_points: row.estimate_points || 0,
      })));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast({ title: 'Features imported successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to import features', variant: 'destructive' });
    }
  });

  const handleExport = () => {
    if (items && items.length > 0) {
      exportToCSV(items, 'features', ['name', 'description', 'status', 'health', 'estimate_points', 'wsjf_score']);
      toast({ title: 'Features exported successfully' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Features</h1>
            <p className="text-sm text-muted-foreground">Program-level features driving epic delivery</p>
          </div>
          <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" />New Feature</Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 space-y-4 overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search features..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        <ListScreenToolbar selectedCount={selectedRows.length} onColumnChooser={() => {}} onBulkEdit={() => {}} onExport={handleExport} onImport={() => setImportDialogOpen(true)} />

        <div className="flex-1 border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><Checkbox /></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Epic</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>PI</TableHead>
                <TableHead>Iteration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : items && items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedItem(item.id)}>
                    <TableCell onClick={(e) => e.stopPropagation()}><Checkbox /></TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-sm">{item.epics?.name || '-'}</TableCell>
                    <TableCell className="text-sm">{item.programs?.name || '-'}</TableCell>
                    <TableCell className="text-sm">{item.program_increments?.name || '-'}</TableCell>
                    <TableCell className="text-sm">{item.iterations?.name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(item.status || 'funnel')}</TableCell>
                    <TableCell><HealthBadge health={item.health} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={item.progress_pct || 0} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">{item.progress_pct || 0}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No features found</TableCell></TableRow>
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
                <Button onClick={() => handleEdit(selectedData)} className="w-full mb-4">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Feature
                </Button>
                <div><label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedData.status || 'funnel')}</div></div>
                <div><label className="text-sm font-medium text-muted-foreground">Health</label>
                  <div className="mt-1"><HealthBadge health={selectedData.health} /></div></div>
                <div><label className="text-sm font-medium text-muted-foreground">Progress</label>
                  <div className="mt-2 space-y-1">
                    <Progress value={selectedData.progress_pct || 0} className="h-2" />
                    <p className="text-sm text-muted-foreground">{selectedData.progress_pct || 0}%</p>
                  </div></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium text-muted-foreground">Estimate</label>
                    <p className="mt-1 text-sm">{selectedData.estimate_points || 0} pts</p></div>
                  <div><label className="text-sm font-medium text-muted-foreground">WSJF</label>
                    <p className="mt-1 text-sm">{selectedData.wsjf_score || 0}</p></div>
                </div>
                <div><label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1 text-sm">{selectedData.description || 'No description'}</p></div>
              </div>
            )},
            { id: 'links', label: 'Links', content: <p className="text-sm text-muted-foreground">Linked stories and dependencies</p> },
            { id: 'forecast', label: 'Forecast', content: <p className="text-sm text-muted-foreground">Capacity and timeline planning</p> },
            { id: 'milestones', label: 'Milestones', content: <p className="text-sm text-muted-foreground">Feature milestones and checkpoints</p> },
            { id: 'comments', label: 'Comments', content: <CommentsSection entityId={selectedItem} entityType="feature" /> },
          ]}
        />
      )}

      <FeatureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        feature={editingFeature}
      />
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={(data) => importMutation.mutate(data)}
        title="Import Features"
        requiredFields={['name', 'epic_id', 'program_id']}
      />
    </div>
  );
}
