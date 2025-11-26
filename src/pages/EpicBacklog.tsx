import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV } from '@/lib/exportUtils';
import { useEpicBacklogPreferences } from '@/hooks/useEpicBacklogPreferences';
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
import { UnassignedBacklogSlideout } from '@/components/epic-backlog/UnassignedBacklogSlideout';
import { PullRankDialog } from '@/components/epic-backlog/PullRankDialog';
import { WSJFPrioritizationDialog } from '@/components/epic-backlog/WSJFPrioritizationDialog';
import { Search, Download, Settings, Filter, TrendingUp, Layers, ArrowUpDown } from 'lucide-react';

export default function EpicBacklog() {
  const { preferences, isLoading: prefsLoading, updatePreferences } = useEpicBacklogPreferences();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedPI, setSelectedPI] = useState<string>('');
  const [selectedEpic, setSelectedEpic] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [kanbanSubview, setKanbanSubview] = useState<'state' | 'process' | 'column'>('state');
  const [selectedColumnsMain, setSelectedColumnsMain] = useState<string[]>([]);
  const [selectedColumnsSmall, setSelectedColumnsSmall] = useState<string[]>([]);
  const [labelsDisplay, setLabelsDisplay] = useState<'program' | 'parent'>('program');
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [unassignedSlideoutOpen, setUnassignedSlideoutOpen] = useState(false);
  const [pullRankDialogOpen, setPullRankDialogOpen] = useState(false);
  const [wsjfDialogOpen, setWsjfDialogOpen] = useState(false);
  const [selectedEpicsForAction, setSelectedEpicsForAction] = useState<string[]>([]);
  const { toast } = useToast();

  // Load preferences on mount
  useEffect(() => {
    if (preferences && !prefsLoading) {
      setView(preferences.last_view || 'list');
      setKanbanSubview(preferences.last_kanban_subview || 'state');
      setSelectedColumnsMain(preferences.selected_columns_main || []);
      setSelectedColumnsSmall(preferences.selected_columns_small || []);
      setLabelsDisplay(preferences.labels_display || 'program');
    }
  }, [preferences, prefsLoading]);

  // Save view preference when changed
  useEffect(() => {
    if (!prefsLoading && preferences) {
      updatePreferences({ last_view: view });
    }
  }, [view]);

  // Save kanban subview preference when changed
  useEffect(() => {
    if (!prefsLoading && preferences) {
      updatePreferences({ last_kanban_subview: kanbanSubview });
    }
  }, [kanbanSubview]);

  // Save columns preferences when changed
  useEffect(() => {
    if (!prefsLoading && preferences && selectedColumnsMain.length > 0) {
      updatePreferences({ selected_columns_main: selectedColumnsMain });
    }
  }, [selectedColumnsMain]);

  useEffect(() => {
    if (!prefsLoading && preferences && selectedColumnsSmall.length > 0) {
      updatePreferences({ selected_columns_small: selectedColumnsSmall });
    }
  }, [selectedColumnsSmall]);

  // Save labels display preference when changed
  useEffect(() => {
    if (!prefsLoading && preferences) {
      updatePreferences({ labels_display: labelsDisplay });
    }
  }, [labelsDisplay]);

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

  // Get unassigned epics (not assigned to any PI)
  const unassignedEpics = epics?.filter(epic => 
    !epic.epic_program_increments || epic.epic_program_increments.length === 0
  ) || [];

  // Calculate PI Progress per Jira Align spec:
  // ((Sum of LOE points for all accepted stories) / (Sum of LOE points for all stories)) * 100
  // Include orphan stories; exclude misaligned stories
  const { data: piProgressData } = useQuery({
    queryKey: ['pi-progress', selectedPI, selectedProgram],
    queryFn: async () => {
      if (!selectedPI || !selectedProgram) return null;
      
      // Get all stories for features in this epic backlog + orphan stories
      const { data: stories, error } = await supabase
        .from('stories')
        .select(`
          id,
          loe_points,
          status,
          sprint_id,
          sprints(id, pi_id),
          features(epic_id, epics(primary_program_id))
        `)
        .or(`features.epics.primary_program_id.eq.${selectedProgram},features.is.null`);
      
      if (error || !stories) return { planned: 0, accepted: 0, percentage: 0 };
      
      // Filter to only include stories in selected PI (and exclude misaligned)
      const relevantStories = stories.filter((story: any) => {
        const storyPI = story.sprints?.pi_id;
        // Include if: assigned to selected PI, or orphan in selected program
        return storyPI === selectedPI || (!story.features && !storyPI);
      });
      
      const totalPoints = relevantStories.reduce((sum: number, s: any) => sum + (s.loe_points || 0), 0);
      const acceptedPoints = relevantStories
        .filter((s: any) => s.status === 'accepted')
        .reduce((sum: number, s: any) => sum + (s.loe_points || 0), 0);
      
      return {
        planned: totalPoints,
        accepted: acceptedPoints,
        percentage: totalPoints > 0 ? Math.round((acceptedPoints / totalPoints) * 100) : 0,
      };
    },
    enabled: !!(selectedPI && selectedProgram),
  });
  
  const piProgress = piProgressData || null;

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

  // Separate assigned and unassigned epics
  const assignedEpics = epics?.filter(epic => 
    epic.epic_program_increments && epic.epic_program_increments.length > 0
  ) || [];

  return (
    <div className="flex flex-col bg-background h-full">
      {/* Main Content - Epic List */}
      <div className="flex-1 flex flex-col border rounded-lg bg-card overflow-hidden">
        <div className="border-b px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Epics for {selectedPI ? programIncrements?.find(pi => pi.id === selectedPI)?.name : 'All PIs'}
            </h2>
            <div className="flex items-center gap-2">
              <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                <TabsList>
                  <TabsTrigger value="list">List</TabsTrigger>
                  <TabsTrigger value="kanban">Kanban</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Items: {assignedEpics.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                setSelectedEpicsForAction(assignedEpics.map(e => e.id));
                setWsjfDialogOpen(true);
              }}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Prioritize
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={assignedEpics.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {selectedProgram && (
                <Button variant="outline" size="sm" onClick={() => setPullRankDialogOpen(true)}>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Pull Rank
                </Button>
              )}
            </div>
          </div>

          {/* PI Progress Bar */}
          {selectedPI && piProgress && (
            <div className="bg-muted/50 rounded-lg p-3">
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

          {/* Kanban Subview Selector */}
          {view === 'kanban' && (
            <Tabs value={kanbanSubview} onValueChange={(v) => setKanbanSubview(v as any)}>
              <TabsList>
                <TabsTrigger value="state">State</TabsTrigger>
                <TabsTrigger value="process">Process</TabsTrigger>
                <TabsTrigger value="column">Column</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {view === 'list' && (
            <EpicBacklogListView
              epics={assignedEpics}
              onEpicSelect={setSelectedEpic}
              onRefetch={refetch}
              selectedProgram={selectedProgram}
              selectedPI={selectedPI}
              labelsDisplay={labelsDisplay}
            />
          )}
          {view === 'kanban' && kanbanSubview === 'state' && (
            <EpicBacklogKanbanState epics={assignedEpics} onEpicSelect={setSelectedEpic} onRefetch={refetch} />
          )}
          {view === 'kanban' && kanbanSubview === 'process' && (
            <EpicBacklogKanbanProcess epics={assignedEpics} onEpicSelect={setSelectedEpic} onRefetch={refetch} />
          )}
          {view === 'kanban' && kanbanSubview === 'column' && (
            <EpicBacklogKanbanColumn
              epics={assignedEpics}
              programIncrements={programIncrements || []}
              onEpicSelect={setSelectedEpic}
              onRefetch={refetch}
            />
          )}
        </div>
      </div>

      {/* Epic Details Panel */}
      {selectedEpic && (
        <EpicDetailsPanel epicId={selectedEpic} onClose={() => setSelectedEpic(null)} onRefetch={refetch} />
      )}

      {/* Dialogs */}
      <EpicColumnsDialog 
        open={columnsDialogOpen} 
        onOpenChange={setColumnsDialogOpen}
        selectedColumnsMain={selectedColumnsMain}
        selectedColumnsSmall={selectedColumnsSmall}
        onColumnsChange={(main, small) => {
          setSelectedColumnsMain(main);
          setSelectedColumnsSmall(small);
        }}
      />
      <EpicFiltersDialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen} />
      
      {/* Slideouts and Action Dialogs */}
      <UnassignedBacklogSlideout
        open={unassignedSlideoutOpen}
        onClose={() => setUnassignedSlideoutOpen(false)}
        epics={unassignedEpics}
        onEpicSelect={setSelectedEpic}
      />
      
      <PullRankDialog
        open={pullRankDialogOpen}
        onOpenChange={setPullRankDialogOpen}
        epicIds={epics?.map(e => e.id) || []}
        onSuccess={refetch}
      />
      
      <WSJFPrioritizationDialog
        open={wsjfDialogOpen}
        onOpenChange={setWsjfDialogOpen}
        epicIds={selectedEpicsForAction}
        onSuccess={refetch}
      />
    </div>
  );
}
