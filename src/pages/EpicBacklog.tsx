import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV } from '@/lib/exportUtils';
import { useEpicBacklogPreferences } from '@/hooks/useEpicBacklogPreferences';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EpicBacklogListView } from '@/components/epic-backlog/EpicBacklogListView';
import { EpicBacklogKanbanState } from '@/components/epic-backlog/EpicBacklogKanbanState';
import { EpicBacklogKanbanProcess } from '@/components/epic-backlog/EpicBacklogKanbanProcess';
import { EpicBacklogKanbanColumn } from '@/components/epic-backlog/EpicBacklogKanbanColumn';
import { EpicDetailsPanel } from '@/components/epic-backlog/EpicDetailsPanel';
import { EpicColumnsDialog } from '@/components/epic-backlog/EpicColumnsDialog';
import { EpicFiltersDialog } from '@/components/epic-backlog/EpicFiltersDialog';
import { PullRankDialog } from '@/components/epic-backlog/PullRankDialog';
import { WSJFPrioritizationDialog } from '@/components/epic-backlog/WSJFPrioritizationDialog';
import { Star, List, Columns3, Eye, TrendingUp, Download, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EpicBacklog() {
  const { preferences, isLoading: prefsLoading, updatePreferences } = useEpicBacklogPreferences();
  
  const [selectedEpic, setSelectedEpic] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'kanban' | 'unassigned'>('list');
  const [backlogType, setBacklogType] = useState<string>('epic');
  const [selectedPI, setSelectedPI] = useState<string>('');
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [pullRankDialogOpen, setPullRankDialogOpen] = useState(false);
  const [wsjfDialogOpen, setWsjfDialogOpen] = useState(false);
  const [selectedEpicsForAction, setSelectedEpicsForAction] = useState<string[]>([]);
  const [epicsExpanded, setEpicsExpanded] = useState(true);
  const [unassignedExpanded, setUnassignedExpanded] = useState(true);
  const { toast } = useToast();

  // Fetch PIs
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch epics
  const { data: epics, refetch } = useQuery({
    queryKey: ['epic-backlog', selectedPI],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select(`
          *,
          strategic_themes(name),
          programs(name),
          epic_program_increments(pi_id, pi_rank, program_increments(name))
        `)
        .is('deleted_at', null)
        .is('parked_at', null);

      const { data, error } = await query.order('global_rank');
      if (error) throw error;
      
      return data || [];
    },
  });

  // Separate assigned and unassigned epics
  const assignedEpics = epics?.filter(epic => 
    !selectedPI || epic.epic_program_increments?.some((epi: any) => epi.pi_id === selectedPI)
  ) || [];

  const unassignedEpics = epics?.filter(epic => 
    !epic.epic_program_increments || epic.epic_program_increments.length === 0
  ) || [];

  const handleExport = () => {
    if (assignedEpics && assignedEpics.length > 0) {
      exportToCSV(
        assignedEpics.map(e => ({
          ID: e.epic_key || e.id,
          Name: e.name,
          Points: e.points_estimate || '',
          MVP: e.mvp ? 'Yes' : 'No',
          'Process Step': e.state || '',
        })),
        'epic-backlog',
        ['ID', 'Name', 'Points', 'MVP', 'Process Step']
      );
      toast({ title: 'Epic backlog exported successfully' });
    }
  };

  return (
    <div className="flex flex-col bg-background h-full p-6">
      {/* Header with Viewing dropdown and view toggles */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Star className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Viewing:</span>
          <Select value={backlogType} onValueChange={setBacklogType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="theme">Theme Backlog</SelectItem>
              <SelectItem value="epic">Epic Backlog</SelectItem>
              <SelectItem value="capability">Capability Backlog</SelectItem>
              <SelectItem value="feature">Feature Backlog</SelectItem>
              <SelectItem value="story">Story Backlog</SelectItem>
              <SelectItem value="defect">Defect Backlog</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View toggle buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={view === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('kanban')}
          >
            <Columns3 className="h-4 w-4 mr-2" />
            Kanban
          </Button>
          <Button
            variant={view === 'unassigned' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('unassigned')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Unassigned Backlog
          </Button>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-6">All Programs for Digital Services</h2>

      {/* Epics for PI section */}
      {view !== 'unassigned' && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEpicsExpanded(!epicsExpanded)}
                className="p-0 h-auto"
              >
                {epicsExpanded ? (
                  <ChevronDown className="h-5 w-5 text-primary" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-primary" />
                )}
              </Button>
              <h3 className="text-lg font-semibold">
                Epics for {selectedPI ? programIncrements?.find(pi => pi.id === selectedPI)?.name || 'PI-5' : 'PI-5'}
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Total Items: {assignedEpics.length}</span>
              <Button variant="outline" size="sm" onClick={() => setWsjfDialogOpen(true)}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Prioritize
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <span className="text-sm font-medium">PI Progress:</span>
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: '75%' }} />
              </div>
            </div>
          </div>

          {epicsExpanded && (
            <div className="border rounded-lg bg-card">
              <div className="border-b px-4 py-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Input 
                      placeholder="New Epic Name..."
                      className="max-w-xs"
                    />
                    <Select>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Select Program" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="p1">Program A</SelectItem>
                        <SelectItem value="p2">Program B</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  <Select>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Labels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="program">Program</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {view === 'list' && (
                <EpicBacklogListView
                  epics={assignedEpics}
                  onEpicSelect={setSelectedEpic}
                  onRefetch={refetch}
                />
              )}
              {view === 'kanban' && (
                <EpicBacklogKanbanState 
                  epics={assignedEpics} 
                  onEpicSelect={setSelectedEpic} 
                  onRefetch={refetch} 
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Unassigned Backlog section */}
      {view === 'unassigned' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUnassignedExpanded(!unassignedExpanded)}
                className="p-0 h-auto"
              >
                {unassignedExpanded ? (
                  <ChevronDown className="h-5 w-5 text-primary" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-primary" />
                )}
              </Button>
              <h3 className="text-lg font-semibold">Unassigned Backlog</h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Total Items: {unassignedEpics.length}</span>
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Prioritize
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {unassignedExpanded && (
            <div className="border rounded-lg bg-card">
              <EpicBacklogListView
                epics={unassignedEpics}
                onEpicSelect={setSelectedEpic}
                onRefetch={refetch}
              />
            </div>
          )}
        </div>
      )}

      {/* Epic Details Panel */}
      {selectedEpic && (
        <EpicDetailsPanel epicId={selectedEpic} onClose={() => setSelectedEpic(null)} onRefetch={refetch} />
      )}

      {/* Dialogs */}
      <EpicColumnsDialog 
        open={columnsDialogOpen} 
        onOpenChange={setColumnsDialogOpen}
        selectedColumnsMain={[]}
        selectedColumnsSmall={[]}
        onColumnsChange={() => {}}
      />
      <EpicFiltersDialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen} />
      
      <PullRankDialog
        open={pullRankDialogOpen}
        onOpenChange={setPullRankDialogOpen}
        epicIds={assignedEpics.map(e => e.id)}
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
