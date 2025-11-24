import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RightDetailsPanel } from '@/components/shared/RightDetailsPanel';
import { ListScreenToolbar } from '@/components/shared/ListScreenToolbar';
import { InitiativeDialog } from '@/components/forms/InitiativeDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Edit } from 'lucide-react';

export default function Initiatives() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<any>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['initiatives', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('initiatives')
        .select('*, strategic_themes(name)')
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
      active: 'default',
      proposed: 'secondary',
      done: 'outline',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const handleCreate = () => {
    setEditingInitiative(null);
    setDialogOpen(true);
  };

  const handleEdit = (initiative: any) => {
    setEditingInitiative(initiative);
    setDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Initiatives</h1>
            <p className="text-sm text-muted-foreground">Strategic initiatives driving portfolio goals</p>
          </div>
          <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" />New Initiative</Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 space-y-4 overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search initiatives..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        <ListScreenToolbar selectedCount={selectedRows.length} onColumnChooser={() => {}} onBulkEdit={() => {}} onExport={() => {}} />

        <div className="flex-1 border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><Checkbox /></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Theme</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>WSJF</TableHead>
                <TableHead>Benefit Score</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : items && items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedItem(item.id)}>
                    <TableCell onClick={(e) => e.stopPropagation()}><Checkbox /></TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-sm">{item.strategic_themes?.name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(item.status || 'proposed')}</TableCell>
                    <TableCell className="text-sm">{item.wsjf_score || 0}</TableCell>
                    <TableCell className="text-sm">{item.benefit_score || 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{item.description || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No initiatives found</TableCell></TableRow>
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
                  Edit Initiative
                </Button>
                <div><label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedData.status || 'proposed')}</div></div>
                <div><label className="text-sm font-medium text-muted-foreground">Theme</label>
                  <p className="mt-1 text-sm">{selectedData.strategic_themes?.name || '-'}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium text-muted-foreground">WSJF Score</label>
                    <p className="mt-1 text-sm">{selectedData.wsjf_score || 0}</p></div>
                  <div><label className="text-sm font-medium text-muted-foreground">Benefit Score</label>
                    <p className="mt-1 text-sm">{selectedData.benefit_score || 0}</p></div>
                </div>
                <div><label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1 text-sm">{selectedData.description || 'No description'}</p></div>
              </div>
            )},
            { id: 'links', label: 'Links', content: <p className="text-sm text-muted-foreground">Linked work items</p> },
          ]}
        />
      )}

      <InitiativeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initiative={editingInitiative}
      />
    </div>
  );
}
