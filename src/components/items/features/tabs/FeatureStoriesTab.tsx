/**
 * FeatureStoriesTab — Slim Framework
 * 
 * List child stories with:
 * - Story key, name, status
 * - Story-driven progress summary
 * - Link to open story drawer
 * - Create story action
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, ExternalLink, CheckCircle2, Clock, CircleDashed } from 'lucide-react';
import { StoryDetailPanel } from '@/components/stories/StoryDetailPanel';
import type { Feature, FeatureProgress } from '@/types/feature.types';

interface FeatureStoriesTabProps {
  feature?: Feature;
  progress?: FeatureProgress;
}

export function FeatureStoriesTab({ feature, progress }: FeatureStoriesTabProps) {
  const [selectedStory, setSelectedStory] = useState<any>(null);

  const { data: stories, isLoading } = useQuery({
    queryKey: ['feature-stories', feature?.id],
    queryFn: async () => {
      if (!feature?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from('stories')
        .select(`
          id,
          story_key,
          name,
          title,
          status,
          state,
          story_points,
          assignee:profiles!stories_assignee_id_fkey(full_name)
        `)
        .eq('feature_id', feature.id)
        .order('rank_order');

      if (error) throw error;
      return data || [];
    },
    enabled: !!feature?.id,
  });

  const handleCreateStory = () => {
    // TODO: Open story creation dialog with feature pre-selected
    console.log('Create story for feature:', feature?.id);
  };

  const getStatusVariant = (status?: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    const s = (status || '').toLowerCase();
    if (['done', 'accepted', 'closed', 'deployed'].includes(s)) return 'default';
    if (['in_progress', 'in-progress', 'implementing', 'testing'].includes(s)) return 'secondary';
    return 'outline';
  };

  const getStatusIcon = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (['done', 'accepted', 'closed', 'deployed'].includes(s)) {
      return <CheckCircle2 className="h-3 w-3 text-emerald-600" />;
    }
    if (['in_progress', 'in-progress', 'implementing', 'testing'].includes(s)) {
      return <Clock className="h-3 w-3 text-sky-600" />;
    }
    return <CircleDashed className="h-3 w-3 text-muted-foreground" />;
  };

  if (!feature) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Feature data not available
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Progress Summary */}
        {progress && progress.totalStories > 0 && (
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Progress value={progress.completionPercent} className="flex-1 h-2" />
                <span className="text-sm font-medium tabular-nums">
                  {progress.completedStories}/{progress.totalStories} stories
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Stories ({stories?.length || 0})
          </h3>
          <Button size="sm" variant="outline" onClick={handleCreateStory}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Story
          </Button>
        </div>

        {/* Stories List */}
        {!stories || stories.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">No stories linked to this feature</p>
            <Button size="sm" variant="outline" onClick={handleCreateStory}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create First Story
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {stories.map((story) => {
              const displayStatus = story.state || story.status || 'new';
              return (
                <Card 
                  key={story.id} 
                  className="cursor-pointer hover:bg-muted/30 transition-colors border-border/60"
                  onClick={() => setSelectedStory(story)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Status Icon */}
                      {getStatusIcon(displayStatus)}
                      
                      {/* Key */}
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {story.story_key || 'S-???'}
                      </span>
                      
                      {/* Name */}
                      <span className="text-sm font-medium truncate flex-1">
                        {story.name || story.title}
                      </span>
                      
                      {/* Status Badge */}
                      <Badge variant={getStatusVariant(displayStatus)} className="text-[10px] shrink-0">
                        {displayStatus}
                      </Badge>
                      
                      {/* Points */}
                      {story.story_points != null && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {story.story_points} pts
                        </span>
                      )}
                      
                      {/* Assignee */}
                      {(story.assignee as any)?.full_name && (
                        <Badge variant="secondary" className="text-[10px] shrink-0 max-w-[100px] truncate">
                          {(story.assignee as any).full_name}
                        </Badge>
                      )}
                      
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Story Detail Panel */}
      {selectedStory && (
        <StoryDetailPanel
          story={selectedStory}
          open={!!selectedStory}
          onClose={() => setSelectedStory(null)}
        />
      )}
    </>
  );
}
