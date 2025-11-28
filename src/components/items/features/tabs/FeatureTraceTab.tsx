import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight } from 'lucide-react';
import type { Feature } from '@/types/feature.types';

interface FeatureTraceTabProps {
  feature?: Feature;
}

export function FeatureTraceTab({ feature }: FeatureTraceTabProps) {
  const { data: traceData } = useQuery({
    queryKey: ['feature-trace', feature?.id],
    queryFn: async () => {
      if (!feature?.id) return null;

      // Get epic parent
      const { data: epic } = await supabase
        .from('epics')
        .select('id, name, epic_key')
        .eq('id', feature.epic_id)
        .single();

      // Get child stories
      const { data: stories } = await supabase
        .from('stories')
        .select('id, name, story_key, state')
        .eq('feature_id', feature.id)
        .order('created_at');

      return { epic, stories: stories || [] };
    },
    enabled: !!feature?.id,
  });

  if (!feature) {
    return (
      <div className="text-sm text-muted-foreground">
        Save feature to view trace relationships
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        View parent and child work items in the hierarchy
      </div>

      {/* Parent Epic */}
      {traceData?.epic && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-sm">Parent Epic</h3>
          <div className="flex items-center gap-2 text-sm">
            <div className="font-mono text-muted-foreground">
              {traceData.epic.epic_key || traceData.epic.id.slice(0, 8)}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <div className="font-medium">{traceData.epic.name}</div>
          </div>
        </div>
      )}

      {/* Current Feature */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <h3 className="font-semibold mb-3 text-sm">Current Feature</h3>
        <div className="flex items-center gap-2 text-sm">
          <div className="font-mono text-muted-foreground">
            {feature.display_id || feature.id.slice(0, 8)}
          </div>
          <div className="font-medium">{feature.name}</div>
        </div>
      </div>

      {/* Child Stories */}
      {traceData?.stories && traceData.stories.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-sm">Child Stories ({traceData.stories.length})</h3>
          <div className="space-y-2">
            {traceData.stories.map((story: any) => (
              <div key={story.id} className="flex items-center gap-2 text-sm py-2 border-b last:border-0">
                <div className="font-mono text-muted-foreground min-w-[80px]">
                  {story.story_key || story.id.slice(0, 8)}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">{story.name}</div>
                <div className="text-xs text-muted-foreground">{story.state}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!traceData?.stories || traceData.stories.length === 0) && (
        <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
          No child stories found
        </div>
      )}
    </div>
  );
}
