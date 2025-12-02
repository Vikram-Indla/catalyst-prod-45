// Team Stories Page - Shows stories for a specific team
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StoriesKanbanView } from '@/components/stories/StoriesKanbanView';
import { StoryDetailPanel } from '@/components/stories/StoryDetailPanel';
import { StoryDialog } from '@/components/forms/StoryDialog';
import { Plus, List, LayoutGrid, Search } from 'lucide-react';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { STORY_STATUS_LABELS, StoryWithRelations } from '@/types/story.types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function TeamStoriesPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedStory, setSelectedStory] = useState<StoryWithRelations | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch team info
  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', teamId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  // Fetch stories for this team
  const { data: stories = [], refetch } = useQuery({
    queryKey: ['team-stories', teamId, searchTerm, statusFilter, featureFilter],
    queryFn: async () => {
      let query = supabase
        .from('stories')
        .select('*, features(id, name, epic_id), iterations(name), teams(name)')
        .eq('team_id', teamId);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }
      if (featureFilter && featureFilter !== 'all') {
        query = query.eq('feature_id', featureFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!teamId,
  });

  // Fetch features for filter
  const { data: features = [] } = useQuery({
    queryKey: ['team-features', teamId],
    queryFn: async () => {
      // Get features that have stories assigned to this team
      const { data: storyFeatureIds } = await supabase
        .from('stories')
        .select('feature_id')
        .eq('team_id', teamId)
        .not('feature_id', 'is', null);

      if (!storyFeatureIds || storyFeatureIds.length === 0) return [];

      const featureIds = [...new Set(storyFeatureIds.map(s => s.feature_id))];
      const { data, error } = await supabase
        .from('features')
        .select('id, name')
        .in('id', featureIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!teamId,
  });

  const handleRowClick = (story: StoryWithRelations) => {
    setSelectedStory(story);
    setDetailsOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'done':
      case 'accepted':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'blocked':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-none border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-semibold">Stories</h1>
            <p className="text-sm text-muted-foreground">
              {team?.name ? `Stories for ${team.name}` : 'Team stories'}
            </p>
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
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Story
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-4 pb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
          <Select value={featureFilter} onValueChange={setFeatureFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Features" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Features</SelectItem>
              {features.map((feature) => (
                <SelectItem key={feature.id} value={feature.id}>
                  {feature.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {stories.length === 0 ? (
          <Card className="p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <List className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No Stories Found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || featureFilter !== 'all'
                  ? 'No stories match your current filters.'
                  : 'This team has no stories assigned yet.'}
              </p>
              <PermissionGuard requiredRole="user" showMessage={false}>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Story
                </Button>
              </PermissionGuard>
            </div>
          </Card>
        ) : viewMode === 'list' ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Story</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead className="w-24">Points</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stories.map((story) => (
                    <TableRow
                      key={story.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => handleRowClick(story)}
                    >
                      <TableCell className="font-medium">{story.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {story.features?.name || '-'}
                      </TableCell>
                      <TableCell>{story.estimate_points || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(story.status || '')}>
                          {STORY_STATUS_LABELS[story.status as keyof typeof STORY_STATUS_LABELS] || 'To Do'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <StoriesKanbanView
            stories={stories}
            onStorySelect={(id) => {
              const story = stories.find(s => s.id === id);
              if (story) handleRowClick(story);
            }}
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

      {/* Create Dialog */}
      <StoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
