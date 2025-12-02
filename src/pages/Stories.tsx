// Stories Module - Jira Align compliant implementation
// Citation: Catalyst_Stories_PRD_v2.pdf, Lovable-Build-Instructions-Story-Module.pdf
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListScreenToolbar } from '@/components/shared/ListScreenToolbar';
import { StoryDialog } from '@/components/forms/StoryDialog';
import { StoriesKanbanView } from '@/components/stories/StoriesKanbanView';
import { StoryDetailPanel } from '@/components/stories/StoryDetailPanel';
import { StoriesToolbar } from '@/components/stories/StoriesToolbar';
import { StoriesFiltersDialog } from '@/components/stories/StoriesFiltersDialog';
import { StoriesColumnConfig } from '@/components/stories/StoriesColumnConfig';
import { StoryQuickAdd } from '@/components/stories/StoryQuickAdd';
import { StoriesListView } from '@/components/stories/StoriesListView';
import { PullRankDialog } from '@/components/stories/PullRankDialog';
import { Plus, List, LayoutGrid, Filter, Columns } from 'lucide-react';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { STORY_STATUS_LABELS, StoryWithRelations } from '@/types/story.types';
import { useWorkItemRanking } from '@/hooks/useWorkItemRanking';

export default function Stories() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<StoryWithRelations | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnConfigOpen, setColumnConfigOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<any>({});
  const [pullRankDialogOpen, setPullRankDialogOpen] = useState(false);

  // Fetch programs for filter
  const { data: programs = [] } = useQuery({
    queryKey: ['programs-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch teams for filter
  const { data: teams = [] } = useQuery({
    queryKey: ['teams-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Ranking context - Program Rank is DEFAULT per Jira Align spec
  const { detectRankingContext, pullRankFromParent, isRanking } = useWorkItemRanking('story', ['all-stories']);
  const currentContext = detectRankingContext(
    teamFilter !== 'all' ? teamFilter : advancedFilters.teamId,
    advancedFilters.sprintId,
    programFilter !== 'all' ? programFilter : advancedFilters.programId,
    advancedFilters.piId,
    advancedFilters.portfolioId
  );
  const hasActiveFilters = !!(searchTerm || statusFilter || programFilter !== 'all' || teamFilter !== 'all' || Object.keys(advancedFilters).length > 0);
  
  // No program requirement - show all stories with filters for All/Program/Team
  const requiresProgramSelection = false;

  // Check for create query parameter to auto-open dialog
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true') {
      setDialogOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: stories, refetch } = useQuery({
    queryKey: ['all-stories', searchTerm, statusFilter, programFilter, teamFilter, advancedFilters],
    queryFn: async () => {
      let query = supabase
        .from('stories')
        .select('*, features(name, epic_id, program_id), iterations(name), teams(name)');

      if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
      if (statusFilter) query = query.eq('status', statusFilter as any);
      
      // Team filter
      if (teamFilter && teamFilter !== 'all') {
        query = query.eq('team_id', teamFilter);
      }
      
      // Program filter - filter stories by features that belong to the program
      if (programFilter && programFilter !== 'all') {
        const { data: programFeatures } = await supabase
          .from('features')
          .select('id')
          .eq('program_id', programFilter);
        
        if (programFeatures && programFeatures.length > 0) {
          const featureIds = programFeatures.map(f => f.id);
          query = query.in('feature_id', featureIds);
        } else {
          // No features in this program, return empty
          return [];
        }
      }
      
      // Advanced filters
      if (advancedFilters.programId && programFilter === 'all') {
        // Filter stories by features that belong to the program
        const { data: programFeatures } = await supabase
          .from('features')
          .select('id')
          .eq('program_id', advancedFilters.programId);
        
        if (programFeatures && programFeatures.length > 0) {
          const featureIds = programFeatures.map(f => f.id);
          query = query.in('feature_id', featureIds);
        } else {
          // No features in this program, return empty
          return [];
        }
      }
      
      if (advancedFilters.featureId) {
        query = query.eq('feature_id', advancedFilters.featureId);
      }
      if (advancedFilters.teamId) {
        query = query.eq('team_id', advancedFilters.teamId);
      }
      if (advancedFilters.sprintId) {
        if (advancedFilters.sprintId === 'backlog') {
          query = query.is('sprint_id', null);
        } else {
          query = query.eq('sprint_id', advancedFilters.sprintId);
        }
      }
      if (advancedFilters.status) {
        query = query.eq('status', advancedFilters.status as any);
      }
      if (advancedFilters.minPoints) query = query.gte('estimate_points', parseInt(advancedFilters.minPoints));
      if (advancedFilters.maxPoints) query = query.lte('estimate_points', parseInt(advancedFilters.maxPoints));

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const handleRowClick = (story: StoryWithRelations) => {
    setSelectedStory(story);
    setDetailsOpen(true);
  };

  const handleRowSelect = (storyId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(storyId)) {
      newSelected.delete(storyId);
    } else {
      newSelected.add(storyId);
    }
    setSelectedRows(newSelected);
  };

  const handleCreate = () => {
    setEditingStory(null);
    setDialogOpen(true);
  };

  const handleEdit = (story: StoryWithRelations) => {
    setEditingStory(story);
    setDialogOpen(true);
  };

  const handleStorySelect = (id: string) => {
    const story = stories?.find(s => s.id === id);
    if (story) {
      handleRowClick(story);
    }
  };

  const handlePullRank = () => {
    setPullRankDialogOpen(true);
  };

  const confirmPullRank = async () => {
    await pullRankFromParent('feature', currentContext);
    refetch();
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-none border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-semibold">Stories</h1>
            <p className="text-sm text-muted-foreground">Manage user stories across teams</p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'kanban')}>
              <TabsList>
                <TabsTrigger value="list">
                  <List className="h-4 w-4 mr-2" />
                  List
                </TabsTrigger>
                <TabsTrigger value="kanban">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <PermissionGuard requiredRole="user" showMessage={false}>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Story
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-4 pb-4 flex-wrap">
          <Input
            placeholder="Search stories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setFiltersOpen(true)}>
            <Filter className="h-4 w-4 mr-2" />
            More
          </Button>
          <Button variant="outline" onClick={() => setColumnConfigOpen(true)}>
            <Columns className="h-4 w-4 mr-2" />
            Columns
          </Button>
        </div>

        {viewMode === 'list' && selectedRows.size > 0 && (
          <div className="px-4 pb-4">
            <StoriesToolbar
              selectedCount={selectedRows.size}
              selectedIds={Array.from(selectedRows)}
              stories={stories || []}
              onRefetch={refetch}
              onClearSelection={() => setSelectedRows(new Set())}
              onPullRank={handlePullRank}
            />
          </div>
        )}
        
        {/* Ranking Context Info - Show always in list view */}
        {viewMode === 'list' && selectedRows.size === 0 && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Context: {currentContext.label}</span>
              {!hasActiveFilters && (
                <span>Drag stories to reorder • Pull rank from Features</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {requiresProgramSelection ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 mx-auto bg-brand-gold/10 rounded-full flex items-center justify-center">
                <Filter className="h-8 w-8 text-brand-gold" />
              </div>
              <h3 className="text-lg font-semibold">Program Selection Required</h3>
              <p className="text-sm text-muted-foreground">
                To view the story backlog, select a program as your scope.
                Use the Filters button above to choose a program.
              </p>
              <Button onClick={() => setFiltersOpen(true)} className="mt-4">
                <Filter className="h-4 w-4 mr-2" />
                Select Program
              </Button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {/* Quick Add */}
            <StoryQuickAdd onSuccess={refetch} />
            
            {/* List View with Ranking */}
            <StoriesListView
              stories={stories || []}
              selectedRows={selectedRows}
              onRowClick={handleRowClick}
              onRowSelect={handleRowSelect}
              context={currentContext}
              isFilterActive={hasActiveFilters}
            />
          </div>
        ) : (
          <StoriesKanbanView
            stories={stories || []}
            onStorySelect={handleStorySelect}
            onRefetch={refetch}
          />
        )}
      </div>

      {/* Details Panel */}
      {detailsOpen && selectedStory && (
        <StoryDetailPanel
          story={selectedStory}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          onUpdate={refetch}
        />
      )}

      {/* Create/Edit Dialog */}
      <StoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        story={editingStory}
      />

      {/* Filters Dialog */}
      <StoriesFiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onApplyFilters={setAdvancedFilters}
      />

      {/* Column Config Dialog */}
      <StoriesColumnConfig
        open={columnConfigOpen}
        onOpenChange={setColumnConfigOpen}
        onApply={(columns) => console.log('Selected columns:', columns)}
      />

      {/* Pull Rank Dialog */}
      <PullRankDialog
        open={pullRankDialogOpen}
        onOpenChange={setPullRankDialogOpen}
        context={currentContext}
        storyCount={stories?.length || 0}
        onConfirm={confirmPullRank}
        isLoading={isRanking}
      />
    </div>
  );
}
