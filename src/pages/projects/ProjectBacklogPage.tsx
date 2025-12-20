/**
 * ProjectBacklogPage - Feature → Story hierarchy work tree
 * Pattern: Based on Epic Backlog work tree pattern
 * MVP Scope: Expand/collapse, real data, navigation
 */

import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Layers, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkItemsHierarchy } from '@/modules/project-work-hub/hooks/useWorkItems';
import { WorkItemWithChildren, WorkItem } from '@/modules/project-work-hub/types';
import { WorkItemDetailsDrawer } from '@/modules/project-work-hub/components/WorkItemDetailsDrawer';
import { StatusLozenge } from '@/modules/project-work-hub/components/StatusLozenge';
import { WorkTypeIcon } from '@/modules/project-work-hub/components/WorkTypeIcon';
import { cn } from '@/lib/utils';

interface FeatureRowProps {
  feature: WorkItemWithChildren;
  isExpanded: boolean;
  onToggle: () => void;
  onFeatureClick: () => void;
  onStoryClick: (story: WorkItem) => void;
}

function FeatureRow({ feature, isExpanded, onToggle, onFeatureClick, onStoryClick }: FeatureRowProps) {
  const hasStories = feature.children && feature.children.length > 0;

  return (
    <>
      {/* Feature Row */}
      <div
        className={cn(
          "grid grid-cols-[40px_1fr_120px_100px] items-center px-4 py-3 border-b hover:bg-accent/50 transition-colors cursor-pointer bg-card"
        )}
        onClick={onFeatureClick}
      >
        {/* Expand/Collapse */}
        <div className="flex items-center justify-center">
          {hasStories ? (
            <button
              className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-6 h-6" />
          )}
        </div>

        {/* Feature Info */}
        <div className="flex items-center gap-3 min-w-0">
          <WorkTypeIcon type="FEATURE" size="small" />
          <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{feature.key}</span>
          <span className="text-sm font-medium text-foreground truncate">{feature.summary}</span>
        </div>

        {/* Status */}
        <div>
          <StatusLozenge status={feature.status} statusCategory={feature.statusCategory} />
        </div>

        {/* Story Count */}
        <div className="text-sm text-muted-foreground text-right">
          {feature.children?.length || 0} stories
        </div>
      </div>

      {/* Expanded Stories */}
      {isExpanded && (
        <div className="bg-muted/30">
          {hasStories ? (
            feature.children.map((story) => (
              <div
                key={story.id}
                className="grid grid-cols-[40px_1fr_120px_100px] items-center px-4 py-2.5 border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => onStoryClick(story)}
              >
                {/* Indent spacer */}
                <div className="flex items-center justify-center">
                  <div className="w-6 h-6" />
                </div>

                {/* Story Info */}
                <div className="flex items-center gap-3 min-w-0 pl-4">
                  <WorkTypeIcon type="STORY" size="small" />
                  <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{story.key}</span>
                  <span className="text-sm text-foreground truncate">{story.summary}</span>
                </div>

                {/* Status */}
                <div>
                  <StatusLozenge status={story.status} statusCategory={story.statusCategory} />
                </div>

                {/* Points placeholder */}
                <div className="text-sm text-muted-foreground text-right">
                  —
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-3 pl-16 text-sm text-muted-foreground italic border-b border-border/50">
              No stories
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function ProjectBacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);

  // Fetch project name for breadcrumb
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, key')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: features, isLoading } = useWorkItemsHierarchy(projectId || '');

  // Sort features by created_at ascending
  const sortedFeatures = useMemo(() => {
    if (!features) return [];
    return [...features].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [features]);

  const toggleFeature = (featureId: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  const handleFeatureClick = (featureId: string) => {
    navigate(`/projects/${projectId}/features/${featureId}`);
  };

  const handleStoryClick = (story: WorkItem) => {
    setSelectedItem(story);
  };

  const totalStories = useMemo(() => {
    return sortedFeatures.reduce((acc, f) => acc + (f.children?.length || 0), 0);
  }, [sortedFeatures]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Link to="/projects" className="hover:text-foreground transition-colors">Projects</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/projects/${projectId}/work`} className="hover:text-foreground transition-colors">
            {project?.name || 'Project Room'}
          </Link>
        </nav>

        <h1 className="text-2xl font-medium text-foreground">Backlog</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedFeatures.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No Features Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Features in this project will appear here with their stories.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{sortedFeatures.length} Features</span>
              <span>•</span>
              <span>{totalStories} Stories</span>
            </div>

            {/* Work Tree */}
            <div className="border rounded-lg bg-card overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[40px_1fr_120px_100px] px-4 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <div></div>
                <div>Name</div>
                <div>Status</div>
                <div className="text-right">Stories</div>
              </div>

              {/* Feature Rows */}
              <div>
                {sortedFeatures.map((feature) => (
                  <FeatureRow
                    key={feature.id}
                    feature={feature}
                    isExpanded={expandedFeatures.has(feature.id)}
                    onToggle={() => toggleFeature(feature.id)}
                    onFeatureClick={() => handleFeatureClick(feature.id)}
                    onStoryClick={handleStoryClick}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Work Item Details Drawer - same as Project Room */}
      <WorkItemDetailsDrawer
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}

export default ProjectBacklogPage;
