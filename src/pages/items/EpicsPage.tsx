import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';
import { EpicDialog } from '@/components/forms/EpicDialog';
import { WSJFPrioritizationDialog } from '@/components/items/epics/dialogs/WSJFPrioritizationDialog';
import { MassMoveDialog } from '@/components/items/epics/dialogs/MassMoveDialog';
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
  XCircle
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
  const [columnsToShow, setColumnsToShow] = useState([
    'name', 'theme', 'program', 'state', 'health', 'dates', 'owner'
  ]);

  const portfolioId = searchParams.get('portfolioId');

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
        toast.success('Exporting epics to CSV');
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

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
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
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading epics...
                  </TableCell>
                </TableRow>
              ) : epics && epics.length > 0 ? (
                epics.map((epic) => (
                  <TableRow
                    key={epic.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedEpicId(epic.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedRows.includes(epic.id)}
                        onCheckedChange={() => toggleRowSelection(epic.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{epic.name}</TableCell>
                    <TableCell className="text-sm">
                      {epic.strategic_themes?.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {epic.programs?.name || '-'}
                    </TableCell>
                    <TableCell>{getStateBadge(epic.state)}</TableCell>
                    <TableCell>
                      <HealthBadge health={epic.health} />
                    </TableCell>
                    <TableCell className="text-sm">{epic.owner_id || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {epic.start_date && epic.end_date
                        ? `${new Date(epic.start_date).toLocaleDateString()} - ${new Date(epic.end_date).toLocaleDateString()}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No epics found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
        onOpenChange={setCreateDialogOpen}
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
    </div>
  );
}
