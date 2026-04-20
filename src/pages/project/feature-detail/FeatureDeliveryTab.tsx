/**
 * FeatureDeliveryTab — Child Stories table for Feature detail page
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Plus, ChevronDown, Search, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
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

interface FeatureDeliveryTabProps {
  featureId: string;
  projectId: string;
}

interface Story {
  id: string;
  name: string;
  status: string | null;
  state: string | null;
  priority: string | null;
  estimate_points: number | null;
  assignee_id: string | null;
  iteration_id: string | null;
  updated_at: string | null;
  assignee?: { full_name: string } | null;
  iteration?: { name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; appearance: LozengeAppearance }> = {
  backlog: { label: 'Backlog', appearance: 'default' },
  todo: { label: 'To Do', appearance: 'default' },
  in_progress: { label: 'In Progress', appearance: 'inprogress' },
  done: { label: 'Done', appearance: 'success' },
  blocked: { label: 'Blocked', appearance: 'removed' },
};

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function FeatureDeliveryTab({ featureId, projectId }: FeatureDeliveryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['feature-stories', featureId],
    queryFn: async (): Promise<Story[]> => {
      const { data, error } = await supabase
        .from('stories')
        .select(`id, name, status, state, priority, estimate_points, assignee_id, updated_at`)
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
        iteration_id: null,
        assignee: story.assignee_id ? assigneeMap.get(story.assignee_id) : null,
        iteration: null,
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
          <Button size="sm">
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
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[120px]">Sprint</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[100px]">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No stories match your search.' : 'No stories yet. Add one to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredStories.map((story) => {
                const status = story.status || story.state || 'backlog';
                const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.backlog;
                const storyKey = `STO-${story.id.slice(0, 4).toUpperCase()}`;
                
                return (
                  <TableRow key={story.id} className="hover:bg-muted/30">
                    <TableCell>
                      <span className="font-mono text-xs font-medium text-primary">
                        {storyKey}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">{story.name}</span>
                    </TableCell>
                    <TableCell>
                      <Lozenge appearance={statusConfig.appearance}>
                        {statusConfig.label}
                      </Lozenge>
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
                      <span className="text-sm text-muted-foreground">
                        {story.iteration?.name || '-'}
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
    </div>
  );
}
