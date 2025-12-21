/**
 * FeatureDeliveryTab — Child Stories table for Feature detail page (V1 Wired)
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Reuse existing StoryDetailsPanel
import { StoryDetailsPanel } from '@/components/items/stories/StoryDetailsPanel';
import { CreateStoryDialog } from '@/modules/project-work-hub/components/dialogs/CreateStoryDialog';

interface FeatureDeliveryTabProps {
  featureId: string;
  projectId: string;
}

interface Story {
  id: string;
  name: string;
  story_key: string | null;
  status: string | null;
  state: string | null;
  priority: string | null;
  estimate_points: number | null;
  assignee_id: string | null;
  updated_at: string | null;
  assignee?: { full_name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  backlog: { label: 'Backlog', class: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  todo: { label: 'To Do', class: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  in_progress: { label: 'In Progress', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  done: { label: 'Done', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  blocked: { label: 'Blocked', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function FeatureDeliveryTab({ featureId, projectId }: FeatureDeliveryTabProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [storyPanelOpen, setStoryPanelOpen] = useState(false);
  const [createStoryOpen, setCreateStoryOpen] = useState(false);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['feature-stories', featureId],
    queryFn: async (): Promise<Story[]> => {
      const { data, error } = await supabase
        .from('stories')
        .select(`id, name, story_key, status, state, priority, estimate_points, assignee_id, updated_at`)
        .eq('feature_id', featureId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch stories:', error);
        return [];
      }

      const storyData = data || [];
      const assigneeIds = [...new Set(storyData.filter(s => s.assignee_id).map(s => s.assignee_id))] as string[];

      const assigneesResult = assigneeIds.length > 0 
        ? await supabase.from('profiles').select('id, full_name').in('id', assigneeIds)
        : { data: [] };

      const assigneeMap = new Map((assigneesResult.data || []).map(a => [a.id, a]));

      return storyData.map(story => ({
        ...story,
        assignee: story.assignee_id ? assigneeMap.get(story.assignee_id) : null,
      }));
    },
    enabled: !!featureId,
  });

  const filteredStories = stories.filter(story => 
    story.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const doneCount = stories.filter(s => s.status === 'done' || s.state === 'done').length;
  const totalCount = stories.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleStoryClick = (story: Story) => {
    setSelectedStory(story);
    setStoryPanelOpen(true);
  };

  const handleStoryCreated = () => {
    setCreateStoryOpen(false);
    queryClient.invalidateQueries({ queryKey: ['feature-stories', featureId] });
    queryClient.invalidateQueries({ queryKey: ['feature-story-stats', featureId] });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Child Stories
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-status-success rounded-full transition-all" 
                style={{ width: `${progressPct}%` }} 
              />
            </div>
            <span>{doneCount} / {totalCount} done</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search stories..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Button size="sm" onClick={() => setCreateStoryOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Story
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[100px]">Key</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Summary</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[120px]">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[150px]">Assignee</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[80px] text-center">Points</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[100px]">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No stories match your search.' : 'No stories yet. Add one to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredStories.map((story) => {
                const status = story.status || story.state || 'backlog';
                const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.backlog;
                const storyKey = story.story_key || `STO-${story.id.slice(0, 4).toUpperCase()}`;
                
                return (
                  <TableRow 
                    key={story.id} 
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleStoryClick(story)}
                  >
                    <TableCell>
                      <span className="font-mono text-xs font-medium text-gold-link hover:text-gold-link-hover">
                        {storyKey}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">{story.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", statusConfig.class)}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {story.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-medium">
                            {getInitials(story.assignee.full_name)}
                          </div>
                          <span className="text-sm truncate">{story.assignee.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium">
                        {story.estimate_points ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {story.updated_at 
                          ? new Date(story.updated_at).toLocaleDateString()
                          : '-'
                        }
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Story Details Panel */}
      <StoryDetailsPanel
        story={selectedStory}
        open={storyPanelOpen}
        onClose={() => {
          setStoryPanelOpen(false);
          setSelectedStory(null);
        }}
      />

      {/* Create Story Dialog */}
      <CreateStoryDialog
        isOpen={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
        onSuccess={handleStoryCreated}
        projectId={projectId}
      />
    </div>
  );
}
