import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EpicBacklogListView } from '@/components/epic-backlog/EpicBacklogListView';
import { EpicBacklogKanbanState } from '@/components/epic-backlog/EpicBacklogKanbanState';
import { EpicBacklogKanbanProcess } from '@/components/epic-backlog/EpicBacklogKanbanProcess';
import { EpicBacklogKanbanColumn } from '@/components/epic-backlog/EpicBacklogKanbanColumn';
import { EpicDetailsPanel } from '@/components/epic-backlog/EpicDetailsPanel';
import { EpicColumnsDialog } from '@/components/epic-backlog/EpicColumnsDialog';
import { EpicFiltersDialog } from '@/components/epic-backlog/EpicFiltersDialog';
import { Search, Download, Settings, Filter, TrendingUp } from 'lucide-react';

export default function EpicBacklog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedPI, setSelectedPI] = useState<string>('');
  const [selectedEpic, setSelectedEpic] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [kanbanSubview, setKanbanSubview] = useState<'state' | 'process' | 'column'>('state');
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const { toast } = useToast();

  // Fetch portfolios
  const { data: portfolios } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch programs for selected portfolio
  const { data: programs } = useQuery({
    queryKey: ['programs', selectedPortfolio],
    queryFn: async () => {
      if (!selectedPortfolio) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('portfolio_id', selectedPortfolio)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPortfolio,
  });

  // Fetch PIs for selected program
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments', selectedProgram],
    queryFn: async () => {
      if (!selectedProgram) return [];
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .eq('portfolio_id', selectedPortfolio)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProgram || !!selectedPortfolio,
  });

  // Fetch epics with filters
  const { data: epics, refetch } = useQuery({
    queryKey: ['epic-backlog', selectedPortfolio, selectedProgram, selectedPI, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select(`
          *,
          strategic_themes(name),
          programs(name),
          epic_program_increments(pi_id, pi_rank, program_increments(name))
        `)
        .is('deleted_at', null);

      if (selectedPortfolio) {
        query = query.eq('portfolio_id', selectedPortfolio);
      }
      if (selectedProgram) {
        query = query.eq('primary_program_id', selectedProgram);
      }
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,epic_key.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order('global_rank');
      if (error) throw error;
      
      // Filter by PI if selected
      if (selectedPI && data) {
        return data.filter(epic => 
          epic.epic_program_increments?.some((epi: any) => epi.pi_id === selectedPI)
        );
      }
      
      return data || [];
    },
  });

  // Calculate PI Progress
  const piProgress = selectedPI && selectedProgram ? { planned: 0, accepted: 0, percentage: 0 } : null;

  const handleExport = () => {
    if (epics && epics.length > 0) {
      exportToCSV(
        epics.map(e => ({
          ID: e.epic_key || e.id,
          Name: e.name,
          State: e.state,
          'Process Step': e.process_step_id || '',
          Owner: e.owner_id || '',
          MVP: e.mvp ? 'Yes' : 'No',
          Points: e.points_estimate || '',
          'Global Rank': e.global_rank,
        })),
        'epic-backlog',
        ['ID', 'Name', 'State', 'Process Step', 'Owner', 'MVP', 'Points', 'Global Rank']
      );
      toast({ title: 'Epic backlog exported successfully' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Configuration Bar */}
      <div className="border-b bg-card px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Epic Backlog</h1>
            <p className="text-sm text-muted-foreground">Manage and prioritize epics across your portfolio</p>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Portfolio" />
            </SelectTrigger>
            <SelectContent>
              {portfolios?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedProgram} onValueChange={setSelectedProgram} disabled={!selectedPortfolio}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Program" />
            </SelectTrigger>
            <SelectContent>
              {programs?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedPI} onValueChange={setSelectedPI} disabled={!selectedPortfolio}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select PI" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All PIs</SelectItem>
              {programIncrements?.map((pi) => <SelectItem key={pi.id} value={pi.id}>{pi.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search epics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => setColumnsDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Columns
          </Button>

          <Button variant="outline" size="sm" onClick={() => setFiltersDialogOpen(true)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <Button variant="outline" size="sm" onClick={handleExport} disabled={!epics || epics.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button variant="outline" size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Prioritize
          </Button>
        </div>

        {/* PI Progress Bar */}
        {selectedPI && piProgress && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">PI Progress</span>
              <span className="text-sm text-muted-foreground">
                {piProgress.accepted} / {piProgress.planned} points ({piProgress.percentage}%)
              </span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${piProgress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="border-b">
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="px-6">
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="kanban">Kanban Views</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Kanban Subview Selector */}
      {view === 'kanban' && (
        <div className="border-b px-6 py-2">
          <Tabs value={kanbanSubview} onValueChange={(v) => setKanbanSubview(v as any)}>
            <TabsList>
              <TabsTrigger value="state">State View</TabsTrigger>
              <TabsTrigger value="process">Process Flow View</TabsTrigger>
              <TabsTrigger value="column">Column View (PI)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'list' && (
          <EpicBacklogListView
            epics={epics || []}
            onEpicSelect={setSelectedEpic}
            onRefetch={refetch}
            selectedProgram={selectedProgram}
            selectedPI={selectedPI}
          />
        )}
        {view === 'kanban' && kanbanSubview === 'state' && (
          <EpicBacklogKanbanState epics={epics || []} onEpicSelect={setSelectedEpic} onRefetch={refetch} />
        )}
        {view === 'kanban' && kanbanSubview === 'process' && (
          <EpicBacklogKanbanProcess epics={epics || []} onEpicSelect={setSelectedEpic} onRefetch={refetch} />
        )}
        {view === 'kanban' && kanbanSubview === 'column' && (
          <EpicBacklogKanbanColumn
            epics={epics || []}
            programIncrements={programIncrements || []}
            onEpicSelect={setSelectedEpic}
            onRefetch={refetch}
          />
        )}
      </div>

      {/* Epic Details Panel */}
      {selectedEpic && (
        <EpicDetailsPanel epicId={selectedEpic} onClose={() => setSelectedEpic(null)} onRefetch={refetch} />
      )}

      {/* Dialogs */}
      <EpicColumnsDialog open={columnsDialogOpen} onOpenChange={setColumnsDialogOpen} />
      <EpicFiltersDialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen} />
    </div>
  );
}
