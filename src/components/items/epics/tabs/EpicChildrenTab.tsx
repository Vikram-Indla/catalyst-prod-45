import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, ChevronDown, ChevronRight, Link2Off, Eye, Edit, ExternalLink } from 'lucide-react';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';
import { TeamDetailsDrawer } from '@/components/teams/TeamDetailsDrawer';
import { StoryDetailsPanel } from '@/components/items/stories/StoryDetailsPanel';
import { toast } from 'sonner';

interface EpicChildrenTabProps {
  epic: any;
}

interface LinkedFeature {
  id: string;
  name: string;
  display_id: string;
  status: string;
  estimate_points: number | null;
  team_id: string | null;
  teams?: { name: string } | null;
  programs?: { name: string } | null;
  stories?: { id: string; name: string; status: string; story_points: number | null; assignee_id: string | null }[];
}

export function EpicChildrenTab({ epic }: EpicChildrenTabProps) {
  const queryClient = useQueryClient();
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [featureToUnlink, setFeatureToUnlink] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeaturesToLink, setSelectedFeaturesToLink] = useState<string[]>([]);

  // Fetch linked features with their stories
  const { data: features, isLoading } = useQuery({
    queryKey: ['epic-children', epic?.id],
    queryFn: async () => {
      if (!epic?.id) return [];
      
      const { data, error } = await supabase
        .from('features')
        .select(`
          id, name, display_id, status, estimate_points, team_id, description,
          teams(name), 
          programs(name)
        `)
        .eq('epic_id', epic.id)
        .order('global_rank');

      if (error) throw error;

      // Fetch stories for each feature
      const featuresWithStories = await Promise.all(
        (data || []).map(async (feature) => {
          const { data: stories } = await supabase
            .from('stories')
            .select('id, name, status, story_points, assignee_id')
            .eq('feature_id', feature.id)
            .order('created_at');
          return { ...feature, stories: stories || [] };
        })
      );

      return featuresWithStories as LinkedFeature[];
    },
    enabled: !!epic?.id,
  });

  // Fetch unlinked features for the link picker
  const { data: unlinkedFeatures, isLoading: loadingUnlinked } = useQuery({
    queryKey: ['unlinked-features', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('features')
        .select('id, name, display_id, status, teams(name)')
        .is('epic_id', null)
        .order('name');
      
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: linkDialogOpen,
  });

  // Link features mutation
  const linkFeaturesMutation = useMutation({
    mutationFn: async (featureIds: string[]) => {
      const { error } = await supabase
        .from('features')
        .update({ epic_id: epic.id })
        .in('id', featureIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-children', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-features'] });
      toast.success('Features linked successfully');
      setLinkDialogOpen(false);
      setSelectedFeaturesToLink([]);
    },
    onError: () => {
      toast.error('Failed to link features');
    }
  });

  // Unlink feature mutation
  const unlinkFeatureMutation = useMutation({
    mutationFn: async (featureId: string) => {
      const { error } = await supabase
        .from('features')
        .update({ epic_id: null })
        .eq('id', featureId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-children', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-features'] });
      toast.success('Feature unlinked');
      setUnlinkDialogOpen(false);
      setFeatureToUnlink(null);
    },
    onError: () => {
      toast.error('Failed to unlink feature');
    }
  });

  const toggleFeatureExpansion = (featureId: string) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  const handleFeatureClick = (feature: any) => {
    setSelectedFeature(feature);
    setSelectedFeatureId(feature.id);
  };

  const handleTeamClick = (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTeamId(teamId);
  };

  const handleUnlinkClick = (feature: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setFeatureToUnlink(feature);
    setUnlinkDialogOpen(true);
  };

  const toggleFeatureSelection = (featureId: string) => {
    setSelectedFeaturesToLink(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const calculateProgress = (stories: any[]) => {
    if (!stories || stories.length === 0) return 0;
    const completed = stories.filter(s => s.status === 'done' || s.status === 'accepted').length;
    return Math.round((completed / stories.length) * 100);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'backlog': 'bg-muted text-muted-foreground',
      'in_progress': 'bg-primary/20 text-primary',
      'done': 'bg-success/20 text-success',
      'accepted': 'bg-success/20 text-success',
      'blocked': 'bg-destructive/20 text-destructive'
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  if (!epic) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Epic data not available
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

  const totalStories = features?.reduce((sum, f) => sum + (f.stories?.length || 0), 0) || 0;
  const completedStories = features?.reduce((sum, f) => 
    sum + (f.stories?.filter(s => s.status === 'done' || s.status === 'accepted').length || 0), 0) || 0;
  const overallProgress = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0;

  return (
    <>
      <div className="space-y-4">
        {/* Header with Add Feature CTA */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-lg font-semibold">Linked Features ({features?.length || 0})</h3>
            <p className="text-sm text-muted-foreground">
              {totalStories} Stories | {overallProgress}% Complete
            </p>
          </div>
          <Button onClick={() => setLinkDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Feature
          </Button>
        </div>

        {/* Overall Progress */}
        {totalStories > 0 && (
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground">{completedStories}/{totalStories} Stories</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}

        {/* Features List */}
        {!features || features.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground mb-4">No features linked to this epic</p>
            <Button variant="outline" onClick={() => setLinkDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Link Existing Feature
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {features.map((feature) => {
              const isExpanded = expandedFeatures.has(feature.id);
              const progress = calculateProgress(feature.stories || []);
              
              return (
                <Card key={feature.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Feature Header */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-accent/30 transition-colors flex items-center gap-3"
                      onClick={() => toggleFeatureExpansion(feature.id)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFeatureExpansion(feature.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono text-muted-foreground">
                            {feature.display_id || 'F-???'}
                          </span>
                          <Badge className={getStatusColor(feature.status || 'backlog')}>
                            {(feature.status || 'backlog').replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {feature.stories?.length || 0} Stories
                          </span>
                        </div>
                        <h4 className="font-medium text-sm truncate">{feature.name}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={progress} className="h-1.5 flex-1 max-w-32" />
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {feature.teams?.name && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs cursor-pointer"
                            onClick={(e) => handleTeamClick(feature.team_id!, e)}
                          >
                            {feature.teams.name}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeatureClick(feature);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleUnlinkClick(feature, e)}
                          title="Unlink Feature"
                        >
                          <Link2Off className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Stories */}
                    {isExpanded && feature.stories && feature.stories.length > 0 && (
                      <div className="border-t bg-muted/20">
                        <div className="p-3 pl-12 space-y-2">
                          {feature.stories.map((story: any) => (
                            <div 
                              key={story.id}
                              className="flex items-center justify-between p-2 rounded hover:bg-background cursor-pointer"
                              onClick={() => setSelectedStory(story)}
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  checked={story.status === 'done' || story.status === 'accepted'}
                                  className="pointer-events-none"
                                />
                                <span className="text-sm">{story.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {story.story_points && (
                                  <Badge variant="outline" className="text-xs">
                                    {story.story_points} pts
                                  </Badge>
                                )}
                                <Badge className={getStatusColor(story.status)}>
                                  {story.status?.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isExpanded && (!feature.stories || feature.stories.length === 0) && (
                      <div className="border-t bg-muted/20 p-4 pl-12 text-sm text-muted-foreground">
                        No stories linked to this feature
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Link Feature Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Features to Epic</DialogTitle>
            <DialogDescription>
              Select unlinked features to associate with this epic
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input 
              placeholder="Search features..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <ScrollArea className="h-[300px] border rounded-md p-2">
              {loadingUnlinked ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : unlinkedFeatures && unlinkedFeatures.length > 0 ? (
                <div className="space-y-2">
                  {unlinkedFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                      onClick={() => toggleFeatureSelection(feature.id)}
                    >
                      <Checkbox 
                        checked={selectedFeaturesToLink.includes(feature.id)}
                        onCheckedChange={() => toggleFeatureSelection(feature.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {feature.display_id}
                          </span>
                          {feature.status && (
                            <Badge variant="outline" className="text-xs">
                              {feature.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">{feature.name}</p>
                        {feature.teams?.name && (
                          <p className="text-xs text-muted-foreground">{feature.teams.name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No unlinked features found
                </div>
              )}
            </ScrollArea>

            {selectedFeaturesToLink.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedFeaturesToLink.length} feature(s) selected
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => linkFeaturesMutation.mutate(selectedFeaturesToLink)}
              disabled={selectedFeaturesToLink.length === 0 || linkFeaturesMutation.isPending}
            >
              {linkFeaturesMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Link {selectedFeaturesToLink.length} Feature(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Confirmation Dialog */}
      <Dialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink Feature</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlink "{featureToUnlink?.name}" from this epic?
              The feature will not be deleted, only disassociated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => featureToUnlink && unlinkFeatureMutation.mutate(featureToUnlink.id)}
              disabled={unlinkFeatureMutation.isPending}
            >
              {unlinkFeatureMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Unlink Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature Details Panel */}
      <FeatureDetailsPanel
        feature={selectedFeature}
        open={!!selectedFeatureId}
        onClose={() => {
          setSelectedFeatureId(null);
          setSelectedFeature(null);
        }}
      />

      {/* Team Details Drawer */}
      <TeamDetailsDrawer
        teamId={selectedTeamId}
        open={!!selectedTeamId}
        onOpenChange={(open) => !open && setSelectedTeamId(null)}
      />

      {/* Story Details Panel */}
      {selectedStory && (
        <StoryDetailsPanel
          story={selectedStory}
          open={!!selectedStory}
          onClose={() => setSelectedStory(null)}
        />
      )}
    </>
  );
}
