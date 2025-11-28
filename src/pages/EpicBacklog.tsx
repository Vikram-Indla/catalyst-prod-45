import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EpicBacklogListView } from '@/components/epic-backlog/EpicBacklogListView';
import { EpicBacklogKanbanState } from '@/components/epic-backlog/EpicBacklogKanbanState';
import { EpicBacklogKanbanProcess } from '@/components/epic-backlog/EpicBacklogKanbanProcess';
import { EpicBacklogKanbanCustom } from '@/components/epic-backlog/EpicBacklogKanbanCustom';
import { EpicDetailsPanel } from '@/components/epic-backlog/EpicDetailsPanel';
import { EpicColumnsDialog } from '@/components/epic-backlog/EpicColumnsDialog';
import { EpicFiltersDialog } from '@/components/epic-backlog/EpicFiltersDialog';
import { LabelsManagementDialog } from '@/components/epic-backlog/LabelsManagementDialog';
import { CustomColumnsDialog } from '@/components/epic-backlog/CustomColumnsDialog';
import { OrphanObjectsDialog } from '@/components/epic-backlog/OrphanObjectsDialog';
import { ViewSwitcher, ViewMode, KanbanMode } from '@/components/backlog/ViewSwitcher';
import { WSJFPrioritizationDialog } from '@/components/epic-backlog/WSJFPrioritizationDialog';
import { EnhancedBottomUpDialog } from '@/components/items/epics/dialogs/EnhancedBottomUpDialog';
import { usePIProgress } from '@/hooks/usePIProgress';
import { Star, Eye, TrendingUp, Download, ChevronDown, Plus, Grid3x3, Filter, Search, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EpicBacklog() {
  const [selectedEpic, setSelectedEpic] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const [kanbanMode, setKanbanMode] = useState<KanbanMode>('state');
  const [backlogType, setBacklogType] = useState<string>('epic');
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [epicsExpanded, setEpicsExpanded] = useState(true);
  const [unassignedExpanded, setUnassignedExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wsjfModalOpen, setWsjfModalOpen] = useState(false);
  const [labelsDialogOpen, setLabelsDialogOpen] = useState(false);
  const [customColumnsDialogOpen, setCustomColumnsDialogOpen] = useState(false);
  const [orphanObjectsDialogOpen, setOrphanObjectsDialogOpen] = useState(false);
  const [bottomUpEstimateOpen, setBottomUpEstimateOpen] = useState(false);
  const [selectedEpicIds, setSelectedEpicIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'id', 'name', 'state', 'labels', 'points_estimate', 'mvp', 'process_step'
  ]);
  const { toast } = useToast();

  // Get PI Progress
  const { data: piProgress } = usePIProgress('pi-5');

  // Fetch custom columns for Column View
  const { data: customColumns } = useQuery({
    queryKey: ['process-steps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('process_steps')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      
      // Add unassigned column
      return [
        { id: 'unassigned', name: 'Unassigned', exit_criteria: 'gray' },
        ...(data || []).map(step => ({
          id: step.id,
          name: step.name,
          color: step.exit_criteria
        }))
      ];
    },
  });

  // Fetch epics with PI filtering
  const { data: epics, refetch } = useQuery({
    queryKey: ['epic-backlog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*, epic_program_increments!inner(pi_id)')
        .is('deleted_at', null)
        .is('parked_at', null)
        .order('global_rank');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch unassigned epics (no PI assignment)
  const { data: unassignedEpics } = useQuery({
    queryKey: ['unassigned-epics'],
    queryFn: async () => {
      const { data: allEpics } = await supabase
        .from('epics')
        .select('id')
        .is('deleted_at', null)
        .is('parked_at', null);
      
      const { data: assignedEpicIds } = await supabase
        .from('epic_program_increments')
        .select('epic_id');
      
      const assignedIds = new Set(assignedEpicIds?.map(e => e.epic_id) || []);
      const unassignedIds = allEpics?.filter(e => !assignedIds.has(e.id)) || [];
      
      const { data: unassigned } = await supabase
        .from('epics')
        .select('*')
        .in('id', unassignedIds.map(e => e.id))
        .order('global_rank');
      
      return unassigned || [];
    },
  });

  const assignedEpics = epics || [];
  
  // Handle Quick Add Epic
  const handleQuickAdd = async (title: string, programId: string) => {
    try {
      const { error } = await supabase
        .from('epics')
        .insert({
          name: title,
          primary_program_id: programId,
          global_rank: (assignedEpics.length || 0) + 1,
          state: 'not_started',
          status: 'proposed',
        });

      if (error) throw error;

      // Also add to current PI
      const { data: newEpic } = await supabase
        .from('epics')
        .select('id')
        .eq('name', title)
        .single();

      if (newEpic) {
        await supabase
          .from('epic_program_increments')
          .insert({
            epic_id: newEpic.id,
            pi_id: 'pi-5', // TODO: Get from context
          });
      }

      toast({ title: 'Epic created', description: `"${title}" has been added to the backlog` });
      refetch();
    } catch (error) {
      console.error('Error creating epic:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to create epic', 
        variant: 'destructive' 
      });
    }
  };
  
  const handleExport = () => {
    const csv = [
      ['Rank', 'ID', 'Epic Name', 'Points', 'MVP', 'Process Step', 'State'].join(','),
      ...assignedEpics.map((epic, idx) => 
        [idx + 1, epic.epic_key || epic.id, epic.name, epic.points_estimate || 0, epic.mvp ? 'Yes' : 'No', '', epic.state].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epic-backlog-pi-5-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast({ title: 'Export complete', description: 'Epic backlog exported to CSV' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Action Bar - First Row */}
      <div className="border-b bg-card px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Star and Viewing dropdown */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Star className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Viewing:</span>
            <Select value={backlogType} onValueChange={setBacklogType}>
              <SelectTrigger className="w-[180px] border-0 shadow-none">
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

          {/* Right: Action buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setOrphanObjectsDialogOpen(true)}
            >
              <Eye className="h-4 w-4" />
              Orphan Objects
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setLabelsDialogOpen(true)}
            >
              <Tag className="h-4 w-4" />
              Manage Labels
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setColumnsDialogOpen(true)}
            >
              <Grid3x3 className="h-4 w-4" />
              Columns Shown
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setFiltersDialogOpen(true)}
            >
              <Filter className="h-4 w-4" />
              Apply Filters
            </Button>
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* View Switcher Row - Under Apply Filters */}
      <div className="border-b bg-card px-6 py-2 flex justify-end">
        <ViewSwitcher 
          currentView={view}
          kanbanMode={kanbanMode}
          onViewChange={setView}
          onKanbanModeChange={setKanbanMode}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <h1 className="text-2xl font-semibold mb-8">All Programs for Digital Services</h1>

        {/* Epics for PI-5 Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEpicsExpanded(!epicsExpanded)}
                className="p-0 h-auto hover:bg-transparent"
              >
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-primary transition-transform",
                    !epicsExpanded && "-rotate-90"
                  )}
                />
              </Button>
              <h2 className="text-lg font-semibold">Epics for PI-5</h2>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm text-muted-foreground">Total Items: {assignedEpics.length}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setBottomUpEstimateOpen(true)}
                disabled={selectedEpicIds.length === 0}
              >
                <TrendingUp className="h-4 w-4" />
                Bottom-Up Estimate
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setWsjfModalOpen(true)}
              >
                <TrendingUp className="h-4 w-4" />
                Prioritize
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">PI Progress:</span>
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 transition-all" 
                    style={{ width: `${piProgress?.percentage || 0}%` }} 
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {piProgress?.percentage || 0}%
                </span>
              </div>
            </div>
          </div>

          {epicsExpanded && (
            <>
              {view === 'list' && (
                <div className="border rounded-lg bg-card overflow-hidden">
                  {/* Quick Add Row */}
                  <div className="border-b px-4 py-3 bg-muted/30">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <Input 
                          id="epic-name-input"
                          placeholder="New Epic Name..."
                          className="max-w-xs bg-background"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget;
                              const select = document.getElementById('program-select') as HTMLButtonElement;
                              const programId = select?.getAttribute('data-value');
                              if (input.value && programId) {
                                handleQuickAdd(input.value, programId);
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <Select onValueChange={(value) => {
                          const select = document.getElementById('program-select');
                          select?.setAttribute('data-value', value);
                        }}>
                          <SelectTrigger id="program-select" className="w-[160px] bg-background">
                            <SelectValue placeholder="Select Program" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="p1">Program A</SelectItem>
                            <SelectItem value="p2">Program B</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="gap-2"
                          onClick={() => {
                            const input = document.getElementById('epic-name-input') as HTMLInputElement;
                            const select = document.getElementById('program-select') as HTMLButtonElement;
                            const programId = select?.getAttribute('data-value');
                            if (input.value && programId) {
                              handleQuickAdd(input.value, programId);
                              input.value = '';
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </Button>
                      </div>
                      <Select>
                        <SelectTrigger className="w-[140px] bg-background">
                          <SelectValue placeholder="Labels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="program">Program Labels</SelectItem>
                          <SelectItem value="parent">Parent Labels</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Epic List */}
                  <EpicBacklogListView
                    epics={assignedEpics}
                    onEpicSelect={setSelectedEpic}
                    onRefetch={refetch}
                    onManageLabels={() => setLabelsDialogOpen(true)}
                    visibleColumns={visibleColumns}
                  />
                </div>
              )}

              {view === 'kanban' && kanbanMode === 'state' && (
                <EpicBacklogKanbanState
                  epics={assignedEpics}
                  onEpicSelect={setSelectedEpic}
                  onRefetch={refetch}
                />
              )}

              {view === 'kanban' && kanbanMode === 'process' && (
                <EpicBacklogKanbanProcess
                  epics={assignedEpics}
                  onEpicSelect={setSelectedEpic}
                  onRefetch={refetch}
                />
              )}

              {view === 'kanban' && kanbanMode === 'column' && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Custom Columns View</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomColumnsDialogOpen(true)}
                    >
                      Manage Columns
                    </Button>
                  </div>
                  {customColumns && customColumns.length > 0 ? (
                    <EpicBacklogKanbanCustom
                      epics={assignedEpics}
                      columns={customColumns}
                      onEpicSelect={setSelectedEpic}
                      onRefetch={refetch}
                      onManageLabels={() => setLabelsDialogOpen(true)}
                    />
                  ) : (
                    <div className="text-center py-12 border rounded-lg">
                      <p className="text-muted-foreground mb-4">No custom columns created yet</p>
                      <Button onClick={() => setCustomColumnsDialogOpen(true)}>
                        Create Custom Columns
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Unassigned Backlog Section */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUnassignedExpanded(!unassignedExpanded)}
                className="p-0 h-auto hover:bg-transparent"
              >
                <Plus
                  className={cn(
                    "h-5 w-5 text-primary transition-transform",
                    unassignedExpanded && "rotate-45"
                  )}
                />
              </Button>
              <h2 className="text-lg font-semibold">Unassigned Backlog</h2>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm text-muted-foreground">
                Total Items: {unassignedEpics?.length || 0}
              </span>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <TrendingUp className="h-4 w-4" />
                Prioritize
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {unassignedExpanded && unassignedEpics && unassignedEpics.length > 0 && (
            <div className="border rounded-lg bg-card overflow-hidden">
              <EpicBacklogListView
                epics={unassignedEpics}
                onEpicSelect={setSelectedEpic}
                onRefetch={refetch}
                onManageLabels={() => setLabelsDialogOpen(true)}
                visibleColumns={visibleColumns}
              />
            </div>
          )}

          {unassignedExpanded && (!unassignedEpics || unassignedEpics.length === 0) && (
            <div className="border rounded-lg bg-card p-12 text-center text-muted-foreground">
              <div className="text-sm">Drag & Drop Items Here</div>
            </div>
          )}
        </div>
      </div>

      {/* Epic Details Panel */}
      {selectedEpic && (
        <EpicDetailsPanel 
          epicId={selectedEpic} 
          onClose={() => setSelectedEpic(null)} 
          onRefetch={refetch} 
        />
      )}

      {/* Dialogs */}
      <EpicColumnsDialog 
        open={columnsDialogOpen} 
        onOpenChange={setColumnsDialogOpen}
        selectedColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
      />
      <EpicFiltersDialog 
        open={filtersDialogOpen} 
        onOpenChange={setFiltersDialogOpen} 
      />
      <LabelsManagementDialog 
        open={labelsDialogOpen}
        onOpenChange={setLabelsDialogOpen}
      />
      <CustomColumnsDialog 
        open={customColumnsDialogOpen}
        onOpenChange={setCustomColumnsDialogOpen}
      />
      <OrphanObjectsDialog 
        open={orphanObjectsDialogOpen}
        onOpenChange={setOrphanObjectsDialogOpen}
      />
      
      {/* WSJF Prioritization Dialog */}
      <WSJFPrioritizationDialog
        open={wsjfModalOpen}
        onOpenChange={setWsjfModalOpen}
        epicIds={assignedEpics.map(e => e.id)}
        onSuccess={() => {
          refetch();
          toast({ title: 'WSJF scores updated', description: 'Epic prioritization has been updated' });
        }}
      />
    </div>
  );
}
