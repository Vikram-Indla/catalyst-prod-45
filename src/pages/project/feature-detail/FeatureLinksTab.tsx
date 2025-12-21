/**
 * FeatureLinksTab — Links and dependencies view (V1 Wired)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, FileText, Link2, ArrowUp, ArrowDown, Ban, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Real hooks
import { useFeatureStories } from '@/hooks/useFeature';
import { useWorkItemDependencies } from '@/hooks/useWorkItemDependencies';

// Existing dialogs
import { CreateDependencyDialog } from '@/components/dependencies/CreateDependencyDialog';
import { DependencyDetailsDrawer } from '@/components/dependencies/DependencyDetailsDrawer';
import { StoryDetailsPanel } from '@/components/items/stories/StoryDetailsPanel';

interface FeatureLinksTabProps {
  feature: {
    id: string;
    epic_id: string;
    project_id: string;
    epic?: { id: string; epic_key: string; name: string; primary_program_id?: string | null } | null;
  };
}

export function FeatureLinksTab({ feature }: FeatureLinksTabProps) {
  const navigate = useNavigate();
  const [createDepOpen, setCreateDepOpen] = useState(false);
  const [selectedDepId, setSelectedDepId] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [storyPanelOpen, setStoryPanelOpen] = useState(false);

  // Real data hooks
  const { data: stories = [] } = useFeatureStories(feature.id);
  const { outgoing, incoming, isLoading: depsLoading } = useWorkItemDependencies('feature', feature.id);

  const allDependencies = [
    ...outgoing.map(d => ({ ...d, type: 'blocks' })),
    ...incoming.map(d => ({ ...d, type: 'blocked_by' })),
  ];

  const handleEpicClick = () => {
    if (feature.epic) {
      navigate(`/epics/${feature.epic.id}`);
    }
  };

  const handleStoryClick = (story: any) => {
    setSelectedStory(story);
    setStoryPanelOpen(true);
  };

  const handleDepClick = (depId: string) => {
    setSelectedDepId(depId);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Parent Epic */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Parent Epic</h3>
        {feature.epic ? (
          <div 
            className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={handleEpicClick}
          >
            <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-mono text-sm font-medium text-gold-link hover:text-gold-link-hover transition-colors">
                {feature.epic.epic_key}
              </span>
              <span className="text-muted-foreground mx-2">·</span>
              <span className="text-sm text-foreground">{feature.epic.name}</span>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic p-4 border rounded-lg">No parent Epic linked.</div>
        )}
      </section>

      {/* Child Stories */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Child Stories ({stories.length})
          </h3>
        </div>
        <div className="space-y-2">
          {stories.length === 0 ? (
            <div className="text-sm text-muted-foreground italic p-4 border rounded-lg">No stories linked.</div>
          ) : stories.map((story: any) => (
            <div 
              key={story.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => handleStoryClick(story)}
            >
              <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <span className="font-mono text-xs font-medium text-gold-link">{story.story_key || `STO-${story.id.slice(0,4).toUpperCase()}`}</span>
              <span className="text-sm text-foreground flex-1 truncate">{story.name}</span>
              <Badge variant="secondary" className={cn("text-xs", story.status === 'done' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700")}>
                {story.status || 'To Do'}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Dependencies */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Blocks / Blocked By</h3>
          <Button variant="outline" size="sm" onClick={() => setCreateDepOpen(true)}>
            <Link2 className="h-4 w-4 mr-1" />
            Add Dependency
          </Button>
        </div>
        <div className="space-y-2">
          {allDependencies.length === 0 ? (
            <div className="text-sm text-muted-foreground italic p-4 border rounded-lg">No dependencies.</div>
          ) : allDependencies.map((dep: any) => (
            <div 
              key={dep.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => handleDepClick(dep.id)}
            >
              <div className={cn("w-6 h-6 rounded flex items-center justify-center", dep.type === 'blocks' ? "bg-red-500/10" : "bg-orange-500/10")}>
                {dep.type === 'blocks' ? <ArrowUp className="h-3.5 w-3.5 text-red-500" /> : <ArrowDown className="h-3.5 w-3.5 text-orange-500" />}
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase">{dep.type === 'blocks' ? 'Blocks' : 'Blocked by'}</span>
              <span className="font-mono text-xs font-medium text-gold-link">{dep.target_key || dep.source_key}</span>
              <span className="text-sm text-foreground flex-1 truncate">{dep.target_name || dep.source_name}</span>
              <Badge variant="secondary" className={cn("text-xs", dep.status === 'done' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                {dep.status || 'Pending'}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Dialogs */}
      <CreateDependencyDialog
        open={createDepOpen}
        onOpenChange={setCreateDepOpen}
        prefilledFromId={feature.id}
        prefilledFromType="feature"
      />
      <DependencyDetailsDrawer
        dependencyId={selectedDepId}
        open={!!selectedDepId}
        onClose={() => setSelectedDepId(null)}
      />
      <StoryDetailsPanel
        story={selectedStory}
        open={storyPanelOpen}
        onClose={() => { setStoryPanelOpen(false); setSelectedStory(null); }}
      />
    </div>
  );
}
