import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RightDetailsPanel } from '@/components/shared/RightDetailsPanel';
import { ListScreenToolbar } from '@/components/shared/ListScreenToolbar';
import { ThemeDialog } from '@/components/forms/ThemeDialog';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Edit } from 'lucide-react';
import { exportToCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';

export default function Themes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: themes, isLoading } = useQuery({
    queryKey: ['strategic_themes', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('strategic_themes')
        .select('*')
        .order('name');

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const selectedThemeData = themes?.find(t => t.id === selectedTheme);

  const toggleRow = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedRows.length === themes?.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(themes?.map(t => t.id) || []);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      active: 'default',
      proposed: 'secondary',
      done: 'outline',
      cancelled: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const handleCreate = () => {
    setEditingTheme(null);
    setDialogOpen(true);
  };

  const handleEdit = (theme: any) => {
    setEditingTheme(theme);
    setDialogOpen(true);
  };

  const importThemesMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const themesToInsert = data.map(row => ({
        name: row.name,
        description: row.description || null,
        status: row.status || 'proposed',
        start_date: row.start_date || null,
        end_date: row.end_date || null,
        color_tag: row.color_tag || null,
      }));
      const { error } = await supabase.from('strategic_themes').insert(themesToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      toast({ title: 'Themes imported successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to import themes', variant: 'destructive' });
    }
  });

  const handleExport = () => {
    if (themes && themes.length > 0) {
      exportToCSV(themes, 'strategic-themes', ['name', 'description', 'status', 'start_date', 'end_date', 'color_tag']);
      toast({ title: 'Themes exported successfully' });
    }
  };

  const handleImport = (data: any[]) => {
    importThemesMutation.mutate(data);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Strategic Themes</h1>
            <p className="text-sm text-muted-foreground">High-level strategic investment areas</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Theme
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 space-y-4 overflow-hidden">
        {/* Filter Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Toolbar */}
        <ListScreenToolbar
          selectedCount={selectedRows.length}
          onColumnChooser={() => {}}
          onBulkEdit={() => {}}
          onExport={handleExport}
          onImport={() => setImportDialogOpen(true)}
        />

        {/* Data Grid */}
        <div className="flex-1 border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.length === themes?.length && themes.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : themes && themes.length > 0 ? (
                themes.map((theme) => (
                  <TableRow
                    key={theme.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedTheme(theme.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedRows.includes(theme.id)}
                        onCheckedChange={() => toggleRow(theme.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{theme.name}</TableCell>
                    <TableCell>{getStatusBadge(theme.status || 'proposed')}</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-sm">
                      {theme.start_date ? new Date(theme.start_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {theme.end_date ? new Date(theme.end_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-xs">
                      {theme.description || '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No themes found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Right Details Panel */}
      {selectedThemeData && (
        <RightDetailsPanel
          open={!!selectedTheme}
          onClose={() => setSelectedTheme(null)}
          title={selectedThemeData.name}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              content: (
                <div className="space-y-4">
                  <Button onClick={() => handleEdit(selectedThemeData)} className="w-full mb-4">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Theme
                  </Button>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedThemeData.status || 'proposed')}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="mt-1 text-sm">{selectedThemeData.description || 'No description'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                      <p className="mt-1 text-sm">
                        {selectedThemeData.start_date ? new Date(selectedThemeData.start_date).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">End Date</label>
                      <p className="mt-1 text-sm">
                        {selectedThemeData.end_date ? new Date(selectedThemeData.end_date).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>
                  {selectedThemeData.color_tag && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Color Tag</label>
                      <div className="mt-1 flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: selectedThemeData.color_tag }}
                        />
                        <span className="text-sm">{selectedThemeData.color_tag}</span>
                      </div>
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: 'links',
              label: 'Links',
              content: (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Linked initiatives and work items</p>
                </div>
              ),
            },
          ]}
        />
      )}

      <ThemeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        theme={editingTheme}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        title="Import Strategic Themes"
        requiredFields={['name']}
      />
    </div>
  );
}
