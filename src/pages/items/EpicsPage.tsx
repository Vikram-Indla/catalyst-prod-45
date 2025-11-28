import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';
import { EpicDialog } from '@/components/forms/EpicDialog';
import { WSJFPrioritizationDialog } from '@/components/items/epics/dialogs/WSJFPrioritizationDialog';
import { MassMoveDialog } from '@/components/items/epics/dialogs/MassMoveDialog';
import { EpicKanbanView } from '@/components/items/epics/EpicKanbanView';
import { EpicListDragDrop } from '@/components/items/epics/EpicListDragDrop';
import { EpicContextMenu } from '@/components/items/epics/EpicContextMenu';
import { MoveToPositionDialog } from '@/components/items/epics/dialogs/MoveToPositionDialog';
import { DuplicateEpicDialog } from '@/components/items/epics/dialogs/DuplicateEpicDialog';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Columns, 
  Upload, 
  Download,
  Move,
  Calculator,
  ListTree,
  Printer,
  Trash2,
  XCircle,
  LayoutList,
  LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';

export default function EpicsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [wsjfDialogOpen, setWSJFDialogOpen] = useState(false);
  const [massMoveDialogOpen, setMassMoveDialogOpen] = useState(false);
  const [moveToPositionOpen, setMoveToPositionOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [contextEpic, setContextEpic] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [columnsToShow, setColumnsToShow] = useState([
    'name', 'theme', 'program', 'state', 'health', 'dates', 'owner'
  ]);

  const portfolioId = searchParams.get('portfolioId');
  const queryClient = useQueryClient();

  // Check for create parameter in URL
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateDialogOpen(true);
      // Remove the parameter from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: epics, isLoading } = useQuery({
    queryKey: ['epics', portfolioId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select(`
          *,
          strategic_themes(name),
          programs(name)
        `)
        .order('name');

      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      }

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const selectedEpic = epics?.find(e => e.id === selectedEpicId);

  const getStateBadge = (state: string | null) => {
    if (!state) return <Badge variant="secondary">New</Badge>;
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      'funnel': 'secondary',
      'analyzing': 'secondary',
      'portfolio_backlog': 'outline',
      'implementing': 'default',
      'validating_in_production': 'default',
      'done': 'outline',
    };
    return <Badge variant={variants[state] || 'secondary'}>{state.replace(/_/g, ' ')}</Badge>;
  };

  const duplicateEpicMutation = useMutation({
    mutationFn: async ({ epicId, newName, options }: any) => {
      const { data: epic } = await supabase
        .from('epics')
        .select('*')
        .eq('id', epicId)
        .single();

      const { data, error } = await supabase
        .from('epics')
        .insert({
          ...epic,
          id: undefined,
          name: newName,
          epic_key: `${epic.epic_key}-COPY`,
          start_date: options.includeDates ? epic.start_date : null,
          end_date: options.includeDates ? epic.end_date : null,
          created_at: undefined,
          updated_at: undefined
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic duplicated successfully');
    }
  });

  const moveToPositionMutation = useMutation({
    mutationFn: async ({ epicId, position }: { epicId: string; position: number }) => {
      const { error } = await supabase
        .from('epics')
        .update({ global_rank: position })
        .eq('id', epicId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic position updated');
    }
  });

  const parkingLotMutation = useMutation({
    mutationFn: async (epicId: string) => {
      const { data: epic } = await supabase
        .from('epics')
        .select('parked_at')
        .eq('id', epicId)
        .single();

      const { error } = await supabase
        .from('epics')
        .update({ parked_at: epic?.parked_at ? null : new Date().toISOString() })
        .eq('id', epicId);
      
      if (error) throw error;
      return !epic?.parked_at;
    },
    onSuccess: (isParked) => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success(isParked ? 'Epic moved to parking lot' : 'Epic removed from parking lot');
    }
  });

  const recycleBinMutation = useMutation({
    mutationFn: async (epicId: string) => {
      const { error } = await supabase
        .from('epics')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', epicId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic moved to recycle bin');
    }
  });

  const handleMoreAction = (action: string) => {
    switch (action) {
      case 'bottom-up-estimate':
        toast.info('Bottom-Up Estimate calculation started');
        break;
      case 'prioritization':
        setWSJFDialogOpen(true);
        break;
      case 'import':
        toast.info('Opening Import Epics dialog');
        break;
      case 'export':
        if (epics && epics.length > 0) {
          // Export epics data
          const columns = ['epic_key', 'name', 'state', 'health', 'strategic_themes.name', 'programs.name'];
          const exportData = epics.map(e => ({
            'Epic Key': e.epic_key || '',
            'Name': e.name,
            'State': e.state || '',
            'Health': e.health || '',
            'Theme': e.strategic_themes?.name || '',
            'Program': e.programs?.name || ''
          }));
          
          const csv = [
            Object.keys(exportData[0]).join(','),
            ...exportData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
          ].join('\n');
          
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'epics-export.csv';
          link.click();
          
          toast.success('Epics exported to CSV');
        } else {
          toast.error('No epics to export');
        }
        break;
      case 'mass-move':
        if (selectedRows.length === 0) {
          toast.error('Please select epics to move');
        } else {
          setMassMoveDialogOpen(true);
        }
        break;
      case 'work-tree':
        window.open('/reports/work-tree', '_blank');
        break;
      case 'print-cards':
        toast.info('Printing epic cards');
        break;
      case 'recycle-bin':
        window.location.href = '/items/epics/recycle-bin';
        break;
      case 'canceled-items':
        window.location.href = '/items/epics/canceled';
        break;
    }
  };

  const handleContextMenuAction = {
    duplicate: (epic: any) => {
      setContextEpic(epic);
      setDuplicateDialogOpen(true);
    },
    moveToTop: async (epic: any) => {
      await moveToPositionMutation.mutateAsync({ epicId: epic.id, position: 1 });
    },
    moveToBottom: async (epic: any) => {
      await moveToPositionMutation.mutateAsync({ epicId: epic.id, position: epics?.length || 1 });
    },
    moveToPosition: (epic: any) => {
      setContextEpic(epic);
      setMoveToPositionOpen(true);
    },
    moveToPI: (epic: any) => {
      toast.info('Move to PI dialog coming soon');
    },
    recycleBin: async (epic: any) => {
      await recycleBinMutation.mutateAsync(epic.id);
    },
    parkingLot: async (epic: any) => {
      await parkingLotMutation.mutateAsync(epic.id);
    }
  };

  const handleMassMoveConfirm = (programId: string, piId: string) => {
    toast.success(`Moving ${selectedRows.length} epics to selected program and PI`);
    setSelectedRows([]);
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === epics?.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(epics?.map(e => e.id) || []);
    }
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Epics</h1>
            <p className="text-sm text-muted-foreground">
              Large initiatives broken into capabilities and features
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList>
                <TabsTrigger value="list">
                  <LayoutList className="h-4 w-4 mr-2" />
                  List
                </TabsTrigger>
                <TabsTrigger value="kanban">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Epic
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreVertical className="h-4 w-4 mr-2" />
                  More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleMoreAction('bottom-up-estimate')}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Bottom-Up Estimate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMoreAction('prioritization')}>
                  <ListTree className="h-4 w-4 mr-2" />
                  Prioritization (WSJF)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleMoreAction('import')}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Epics
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMoreAction('export')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Epics
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleMoreAction('mass-move')}>
                  <Move className="h-4 w-4 mr-2" />
                  Mass Move
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMoreAction('work-tree')}>
                  <ListTree className="h-4 w-4 mr-2" />
                  Work Tree
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMoreAction('print-cards')}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Epic Cards
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleMoreAction('recycle-bin')}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Access Recycle Bin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMoreAction('canceled-items')}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Access Canceled Items
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Columns className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="p-2 text-sm font-semibold">Columns Shown</div>
                {/* Column visibility toggles would go here */}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search epics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {selectedRows.length > 0 && (
            <Badge variant="secondary">{selectedRows.length} selected</Badge>
          )}
        </div>
      </div>

      {/* Table/Kanban View */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {viewMode === 'kanban' ? (
          <EpicKanbanView
            epics={epics || []}
            onEpicClick={setSelectedEpicId}
            onContextMenu={(epic, e) => {
              e.preventDefault();
              setContextEpic(epic);
            }}
          />
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.length === epics?.length && epics.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Theme</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Dates</TableHead>
                </TableRow>
              </TableHeader>
              {isLoading ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading epics...
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : epics && epics.length > 0 ? (
                <EpicListDragDrop
                  epics={epics}
                  selectedRows={selectedRows}
                  onRowClick={setSelectedEpicId}
                  onRowSelect={toggleRowSelection}
                  getStateBadge={getStateBadge}
                />
              ) : (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No epics found
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}
            </Table>
          </div>
        )}
      </div>

      {/* Epic Details Panel */}
      {selectedEpic && (
        <EpicDetailsPanel
          epic={selectedEpic}
          open={!!selectedEpicId}
          onClose={() => setSelectedEpicId(null)}
        />
      )}

      {/* Create Epic Dialog */}
      <EpicDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            // Refetch epics when dialog closes after creation
            queryClient.invalidateQueries({ queryKey: ['epics'] });
          }
        }}
      />

      {/* WSJF Prioritization Dialog */}
      <WSJFPrioritizationDialog
        open={wsjfDialogOpen}
        onOpenChange={setWSJFDialogOpen}
        epics={epics || []}
      />

      {/* Mass Move Dialog */}
      <MassMoveDialog
        open={massMoveDialogOpen}
        onOpenChange={setMassMoveDialogOpen}
        selectedEpics={selectedRows}
        onConfirm={handleMassMoveConfirm}
      />

      {/* Move to Position Dialog */}
      {contextEpic && (
        <MoveToPositionDialog
          open={moveToPositionOpen}
          onOpenChange={setMoveToPositionOpen}
          epicName={contextEpic.name}
          maxPosition={epics?.length || 1}
          onConfirm={(position) => {
            moveToPositionMutation.mutate({ epicId: contextEpic.id, position });
          }}
        />
      )}

      {/* Duplicate Epic Dialog */}
      {contextEpic && (
        <DuplicateEpicDialog
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
          epicName={contextEpic.name}
          onConfirm={(newName, options) => {
            duplicateEpicMutation.mutate({ epicId: contextEpic.id, newName, options });
          }}
        />
      )}
    </div>
  );
}
