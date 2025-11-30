// Stories Module - Jira Align compliant implementation
// Citation: Catalyst_Stories_PRD_v2.pdf, Lovable-Build-Instructions-Story-Module.pdf
import { useState } from 'react';
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
import { Plus, List, LayoutGrid, Filter, Columns } from 'lucide-react';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { STORY_STATUS_LABELS, StoryWithRelations } from '@/types/story.types';

export default function Stories() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<StoryWithRelations | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnConfigOpen, setColumnConfigOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<any>({});

  const { data: stories, refetch } = useQuery({
    queryKey: ['all-stories', searchTerm, statusFilter, advancedFilters],
    queryFn: async () => {
      let query = supabase
        .from('stories')
        .select('*, features(name, epic_id), iterations(name), teams(name)');

      if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
      if (statusFilter) query = query.eq('status', statusFilter as any);
      
      // Advanced filters
      if (advancedFilters.featureId) query = query.eq('feature_id', advancedFilters.featureId);
      if (advancedFilters.teamId) query = query.eq('team_id', advancedFilters.teamId);
      if (advancedFilters.sprintId) {
        if (advancedFilters.sprintId === 'backlog') {
          query = query.is('sprint_id', null);
        } else {
          query = query.eq('sprint_id', advancedFilters.sprintId);
        }
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
        <div className="flex items-center gap-3 px-4 pb-4">
          <Input
            placeholder="Search stories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter || undefined} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="w-[180px]">
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
            Filters
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
              onRefetch={refetch}
              onClearSelection={() => setSelectedRows(new Set())}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {/* Quick Add */}
            <StoryQuickAdd onSuccess={refetch} />
            
            <div className="border rounded-lg bg-card">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Story</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Sprint</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stories?.map((story) => (
                  <TableRow
                    key={story.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(story)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedRows.has(story.id)}
                        onCheckedChange={() => handleRowSelect(story.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{story.name}</TableCell>
                    <TableCell>{story.features?.name || '-'}</TableCell>
                    <TableCell>{story.iterations?.name || 'Backlog'}</TableCell>
                    <TableCell>{story.teams?.name || '-'}</TableCell>
                    <TableCell>{story.estimate_points || '-'}</TableCell>
                    <TableCell>Unassigned</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {story.status ? STORY_STATUS_LABELS[story.status as keyof typeof STORY_STATUS_LABELS] : 'To Do'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!stories?.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No stories found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
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
        <div className="fixed right-0 top-0 h-full w-[500px] border-l shadow-lg z-50">
          <StoryDetailPanel
            story={selectedStory}
            onClose={() => setDetailsOpen(false)}
            onUpdate={refetch}
          />
        </div>
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
    </div>
  );
}
