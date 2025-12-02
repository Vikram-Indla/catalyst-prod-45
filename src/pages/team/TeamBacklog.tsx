// Team Backlog - Shows Stories with Feature context
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Plus, List, LayoutGrid } from 'lucide-react';
import { StoryDetailPanel } from '@/components/stories/StoryDetailPanel';
import { StoryDialog } from '@/components/forms/StoryDialog';
import { cn } from '@/lib/utils';
import { STORY_STATUS_LABELS } from '@/types/story.types';

export default function TeamBacklog() {
  const { teamId } = useParams<{ teamId: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);

  // Fetch team details
  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      if (!teamId) return null;
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', teamId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  // Fetch stories for this team
  const { data: stories, isLoading: storiesLoading, refetch } = useQuery({
    queryKey: ['team-stories-backlog', teamId, searchTerm, statusFilter],
    queryFn: async () => {
      if (!teamId) return [];
      let query = supabase
        .from('stories')
        .select(`
          id,
          name,
          status,
          estimate_points,
          feature_id,
          features(name)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!teamId,
  });

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'todo': return 'bg-muted text-muted-foreground';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'accepted': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'blocked': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s4)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s4)]">
          <div>
            <h1 className="text-2xl font-bold">Team Backlog</h1>
            <p className="text-sm text-muted-foreground">
              {team?.name || 'Loading...'} - Stories
            </p>
          </div>
          <div className="flex items-center gap-[var(--s2)]">
            {/* Add Story Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="bg-brand-gold hover:bg-brand-gold-hover">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Story
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsCreateStoryOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Story
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Kanban
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-[var(--s3)] mt-[var(--s4)]">
          <Input
            placeholder="Search stories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s4)]">
        {storiesLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading stories...</div>
        ) : stories && stories.length > 0 ? (
          <div className="border rounded-lg bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Story</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stories.map((story) => (
                  <TableRow
                    key={story.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedStory(story)}
                  >
                    <TableCell className="font-medium">{story.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {story.features?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('capitalize', getStatusColor(story.status))}>
                        {STORY_STATUS_LABELS[story.status as keyof typeof STORY_STATUS_LABELS] || 'To Do'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {story.estimate_points || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p>No stories found for this team</p>
            <p className="text-sm mt-2">Create stories to start building your backlog</p>
          </div>
        )}
      </div>

      {/* Story Details Panel */}
      {selectedStory && (
        <StoryDetailPanel
          story={selectedStory}
          open={!!selectedStory}
          onClose={() => setSelectedStory(null)}
          onUpdate={refetch}
        />
      )}

      {/* Create Story Dialog */}
      <StoryDialog
        open={isCreateStoryOpen}
        onOpenChange={setIsCreateStoryOpen}
      />
    </div>
  );
}
