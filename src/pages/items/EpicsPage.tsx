/**
 * Canonical global Epics list view for Catalyst Epics vNext.
 * All navigation entry points for "Items → Epics" must route here.
 * Uses canonical EpicDetailsPanel for details drawer.
 */
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSearchParams, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
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
import { EpicProcessFlowKanban } from '@/components/items/epics/EpicProcessFlowKanban';
import { EpicKanbanCustom } from '@/components/items/epics/EpicKanbanCustom';
import { EpicListDragDrop } from '@/components/items/epics/EpicListDragDrop';
import { MoveToPositionDialog } from '@/components/items/epics/dialogs/MoveToPositionDialog';
import { QuickAddEpicRow } from '@/components/items/epics/QuickAddEpicRow';
import { DuplicateEpicDialog } from '@/components/items/epics/dialogs/DuplicateEpicDialog';
import { PullRankDialog } from '@/components/items/epics/dialogs/PullRankDialog';
import { ImportEpicsDialog } from '@/components/items/epics/dialogs/ImportEpicsDialog';
import { MoveToPIDialog } from '@/components/items/epics/dialogs/MoveToPIDialog';
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
  const [pullRankOpen, setPullRankOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [moveToPIOpen, setMoveToPIOpen] = useState(false);
  const [contextEpic, setContextEpic] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'process-flow' | 'custom'>('list');
  const [kanbanSubView, setKanbanSubView] = useState<'state' | 'process' | 'custom'>('state');
  const [columnsToShow, setColumnsToShow] = useState([
    'rank', 'name', 'theme', 'program', 'state', 'health', 'dates', 'owner', 'estimate'
  ]);

  const availableColumns = [
    { id: 'rank', label: 'Rank' },
    { id: 'name', label: 'Name' },
    { id: 'epic_key', label: 'Epic Key' },
    { id: 'theme', label: 'Theme' },
    { id: 'program', label: 'Program' },
    { id: 'state', label: 'State' },
    { id: 'health', label: 'Health' },
    { id: 'owner', label: 'Owner' },
    { id: 'dates', label: 'Dates' },
    { id: 'estimate', label: 'Estimate' },
  ];

  const toggleColumn = (columnId: string) => {
    setColumnsToShow(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

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
    queryKey: ['epics', portfolioId, searchQuery, viewMode],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select(`
          *,
          strategic_themes(name),
          programs(name)
        `)
        .is('deleted_at', null);

      // Order by rank in list view, by name in kanban views
      if (viewMode === 'list') {
        query = query.order('global_rank', { ascending: true, nullsFirst: false });
      } else {
        query = query.order('name');
      }

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

      if (!epic) throw new Error('Epic not found');

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
      setDuplicateDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to duplicate epic');
    }
  });

  const moveToPositionMutation = useMutation({
    mutationFn: async ({ epicId, position }: { epicId: string; position: number }) => {
      // Fetch all epics in order
      const { data: allEpics } = await supabase
        .from('epics')
        .select('id, global_rank')
        .is('deleted_at', null)
        .order('global_rank', { ascending: true, nullsFirst: false });

      if (!allEpics) throw new Error('Failed to fetch epics');

      // Find the target epic and remove it from the list
      const targetIndex = allEpics.findIndex(e => e.id === epicId);
      if (targetIndex === -1) throw new Error('Epic not found');
      
      const [movedEpic] = allEpics.splice(targetIndex, 1);
      
      // Insert at the new position (position is 1-indexed)
      allEpics.splice(position - 1, 0, movedEpic);

      // Update all ranks sequentially
      const updates = allEpics.map((epic, index) =>
        supabase
          .from('epics')
          .update({ global_rank: index + 1 })
          .eq('id', epic.id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw new Error('Failed to update ranks');
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
        calculateBottomUpEstimate();
        break;
      case 'prioritization':
        window.location.href = portfolioId 
          ? `/portfolio/${portfolioId}/epic-estimation` 
          : '/items/epics/estimation';
        break;
      case 'import':
        setImportDialogOpen(true);
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
        printEpicCards();
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
      try {
        await moveToPositionMutation.mutateAsync({ epicId: epic.id, position: 1 });
      } catch (error) {
        toast.error('Failed to move epic to top');
      }
    },
    moveToBottom: async (epic: any) => {
      try {
        const maxPosition = epics?.length || 1;
        await moveToPositionMutation.mutateAsync({ epicId: epic.id, position: maxPosition });
      } catch (error) {
        toast.error('Failed to move epic to bottom');
      }
    },
    moveToPosition: (epic: any) => {
      setContextEpic(epic);
      setMoveToPositionOpen(true);
    },
    moveToPI: (epic: any) => {
      setContextEpic(epic);
      setMoveToPIOpen(true);
    },
    recycleBin: async (epic: any) => {
      try {
        await recycleBinMutation.mutateAsync(epic.id);
      } catch (error) {
        toast.error('Failed to move epic to recycle bin');
      }
    },
    parkingLot: async (epic: any) => {
      try {
        await parkingLotMutation.mutateAsync(epic.id);
      } catch (error) {
        toast.error('Failed to update parking lot status');
      }
    }
  };

  const handleMassMoveConfirm = () => {
    // Handled by MassMoveDialog internally
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

  const calculateBottomUpEstimate = async () => {
    if (selectedRows.length === 0) {
      toast.error('Please select epics to calculate estimates');
      return;
    }

    try {
      // For each selected epic, calculate bottom-up estimate from features
      for (const epicId of selectedRows) {
        const { data: features } = await supabase
          .from('features')
          .select('estimate_points')
          .eq('epic_id', epicId);

        const totalEstimate = features?.reduce((sum, f) => sum + (f.estimate_points || 0), 0) || 0;

        await supabase
          .from('epics')
          .update({ estimate: totalEstimate })
          .eq('id', epicId);
      }

      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success(`Bottom-up estimates calculated for ${selectedRows.length} epic(s)`);
      setSelectedRows([]);
    } catch (error) {
      toast.error('Failed to calculate bottom-up estimates');
    }
  };

  const printEpicCards = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const selectedEpics = epics?.filter(e => selectedRows.length === 0 || selectedRows.includes(e.id)) || [];
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Epic Cards</title>
          <style>
            @media print {
              @page { margin: 1cm; size: A4; }
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              .card { 
                page-break-inside: avoid; 
                border: 2px solid #333; 
                padding: 20px; 
                margin-bottom: 20px;
                border-radius: 8px;
              }
              .card-header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
              .card-key { color: #666; font-size: 14px; }
              .card-body { margin-top: 15px; }
              .card-footer { margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd; }
              .badge { 
                display: inline-block; 
                padding: 4px 8px; 
                background: #e5e7eb; 
                border-radius: 4px;
                margin-right: 8px;
                font-size: 12px;
              }
            }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; margin-bottom: 30px;">Epic Cards</h1>
          ${selectedEpics.map(epic => `
            <div class="card">
              <div class="card-header">
                ${epic.name}
              </div>
              <div class="card-key">${epic.epic_key || epic.id.slice(0, 8)}</div>
              <div class="card-body">
                ${epic.description ? `<p>${epic.description}</p>` : ''}
              </div>
              <div class="card-footer">
                ${epic.state ? `<span class="badge">State: ${epic.state.replace(/_/g, ' ')}</span>` : ''}
                ${epic.health ? `<span class="badge">Health: ${epic.health}</span>` : ''}
                ${epic.estimate ? `<span class="badge">Estimate: ${epic.estimate} pts</span>` : ''}
                ${epic.strategic_themes?.name ? `<span class="badge">Theme: ${epic.strategic_themes.name}</span>` : ''}
              </div>
            </div>
          `).join('')}
          <script>
            window.onload = function() { 
              window.print(); 
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s4)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Epics</h1>
            <p className="text-sm text-muted-foreground">
              Large initiatives broken into capabilities and features
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              {viewMode === 'kanban' && (
                <Tabs value={kanbanSubView} onValueChange={(v) => setKanbanSubView(v as any)}>
                  <TabsList>
                    <TabsTrigger value="state">State</TabsTrigger>
                    <TabsTrigger value="process">Process Flow</TabsTrigger>
                    <TabsTrigger value="custom">Custom</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
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
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2 text-sm font-semibold border-b">Columns Shown</div>
                <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
                  {availableColumns.map(column => (
                    <div key={column.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.id}
                        checked={columnsToShow.includes(column.id)}
                        onCheckedChange={() => toggleColumn(column.id)}
                      />
                      <label
                        htmlFor={column.id}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {column.label}
                      </label>
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s4)] border-b bg-card">
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
      <div className="flex-1 overflow-auto px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s6)]">
        {viewMode === 'kanban' ? (
          <>
            {kanbanSubView === 'state' && (
              <EpicKanbanView
                epics={epics || []}
                onEpicClick={setSelectedEpicId}
                onContextMenu={(epic, e) => {
                  e.preventDefault();
                  setContextEpic(epic);
                }}
              />
            )}
            {kanbanSubView === 'process' && (
              <EpicProcessFlowKanban
                epics={epics || []}
                onEpicClick={setSelectedEpicId}
                onContextMenu={(epic, e) => {
                  e.preventDefault();
                  setContextEpic(epic);
                }}
              />
            )}
            {kanbanSubView === 'custom' && (
              <EpicKanbanCustom
                epics={epics || []}
                onEpicClick={setSelectedEpicId}
                onContextMenu={(epic, e) => {
                  e.preventDefault();
                  setContextEpic(epic);
                }}
                onConfigureColumns={() => toast.info('Column configuration coming soon')}
              />
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.length === epics?.length && epics.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  {columnsToShow.includes('rank') && <TableHead className="w-20">Rank</TableHead>}
                  {columnsToShow.includes('name') && <TableHead>Name</TableHead>}
                  {columnsToShow.includes('epic_key') && <TableHead>Epic Key</TableHead>}
                  {columnsToShow.includes('theme') && <TableHead>Theme</TableHead>}
                  {columnsToShow.includes('program') && <TableHead>Program</TableHead>}
                  {columnsToShow.includes('state') && <TableHead>State</TableHead>}
                  {columnsToShow.includes('health') && <TableHead>Health</TableHead>}
                  {columnsToShow.includes('owner') && <TableHead>Owner</TableHead>}
                  {columnsToShow.includes('dates') && <TableHead>Dates</TableHead>}
                  {columnsToShow.includes('estimate') && <TableHead>Estimate</TableHead>}
                </TableRow>
              </TableHeader>
              {isLoading ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      Loading epics...
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : epics && epics.length > 0 ? (
                <>
                  <EpicListDragDrop
                    epics={epics}
                    selectedRows={selectedRows}
                    onRowClick={setSelectedEpicId}
                    onRowSelect={toggleRowSelection}
                    getStateBadge={getStateBadge}
                    columnsToShow={columnsToShow}
                    onContextMenuAction={handleContextMenuAction}
                  />
                  <QuickAddEpicRow columnsCount={columnsToShow.length + 1} />
                </>
              ) : (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No epics found
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}
            </Table>
            </CardContent>
          </Card>
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
        onSuccess={() => setSelectedRows([])}
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

      {/* Pull Rank Dialog */}
      <PullRankDialog
        open={pullRankOpen}
        onOpenChange={setPullRankOpen}
        onConfirm={(sourceEpicId) => {
          toast.info('Pull rank feature coming soon');
          // Will implement rank copying logic
        }}
      />

      {/* Import Epics Dialog */}
      <ImportEpicsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      {/* Move to PI Dialog */}
      {contextEpic && (
        <MoveToPIDialog
          open={moveToPIOpen}
          onOpenChange={setMoveToPIOpen}
          epicId={contextEpic.id}
          epicName={contextEpic.name}
        />
      )}
    </div>
  );
}
