import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { StoryDetailPanel } from '@/components/stories/StoryDetailPanel';
import { TeamDetailsDrawer } from '@/components/teams/TeamDetailsDrawer';

interface FeatureChildrenTabProps {
  feature: any;
}

export function FeatureChildrenTab({ feature }: FeatureChildrenTabProps) {
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const { data: stories, isLoading } = useQuery({
    queryKey: ['feature-children', feature?.id],
    queryFn: async () => {
      if (!feature?.id) return [];
      
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          features(name),
          teams(name),
          assignee:profiles!stories_assignee_id_fkey(full_name)
        `)
        .eq('feature_id', feature.id)
        .order('rank_order');

      if (error) throw error;
      return data || [];
    },
    enabled: !!feature?.id,
  });

  const handleStoryClick = (story: any) => {
    setSelectedStory(story);
    setSelectedStoryId(story.id);
  };

  const handleTeamClick = (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTeamId(teamId);
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

  if (!stories || stories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No stories found for this feature
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Stories ({stories.length})</h3>
        </div>

        <div className="space-y-2">
          {stories.map((story) => (
            <Card 
              key={story.id} 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleStoryClick(story)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-muted-foreground">
                        {story.story_key || 'S-???'}
                      </span>
                      {story.status && (
                        <Badge variant="outline" className="text-xs">
                          {story.status}
                        </Badge>
                      )}
                      {story.state && (
                        <Badge variant="secondary" className="text-xs">
                          {story.state}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-2 line-clamp-2">
                      {story.name || story.title}
                    </h4>
                    {story.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {story.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {(story.assignee as any)?.full_name && (
                      <Badge variant="secondary" className="text-xs">
                        {(story.assignee as any).full_name}
                      </Badge>
                    )}
                    {story.story_points !== null && (
                      <span className="text-sm text-muted-foreground">
                        {story.story_points} pts
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {selectedStory && (
        <StoryDetailPanel
          story={selectedStory}
          open={!!selectedStoryId}
          onClose={() => {
            setSelectedStoryId(null);
            setSelectedStory(null);
          }}
        />
      )}

      <TeamDetailsDrawer
        teamId={selectedTeamId}
        open={!!selectedTeamId}
        onOpenChange={(open) => !open && setSelectedTeamId(null)}
      />
    </>
  );
}
