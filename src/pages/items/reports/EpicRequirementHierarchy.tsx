import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Printer, Download, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ReportTemplatesDialog } from "@/components/items/epics/dialogs/ReportTemplatesDialog";

export default function EpicRequirementHierarchy() {
  const { epicId } = useParams();
  const navigate = useNavigate();
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [showTemplates, setShowTemplates] = useState(false);

  const { data: epic, isLoading: epicLoading } = useQuery({
    queryKey: ["epic", epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epics")
        .select("*")
        .eq("id", epicId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ["features", epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("features")
        .select("*")
        .eq("epic_id", epicId)
        .order("rank_within_epic");
      if (error) throw error;
      return data;
    },
  });

  const { data: stories, isLoading: storiesLoading } = useQuery({
    queryKey: ["stories", features?.map(f => f.id)],
    queryFn: async () => {
      if (!features?.length) return [];
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .in("feature_id", features.map(f => f.id))
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!features?.length,
  });

  const { data: subtasks, isLoading: subtasksLoading } = useQuery({
    queryKey: ["subtasks", stories?.map(s => s.id)],
    queryFn: async () => {
      if (!stories?.length) return [];
      const { data, error } = await supabase
        .from("subtasks")
        .select("*")
        .in("story_id", stories.map(s => s.id))
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!stories?.length,
  });

  const toggleFeature = (featureId: string) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(featureId)) {
      newExpanded.delete(featureId);
    } else {
      newExpanded.add(featureId);
    }
    setExpandedFeatures(newExpanded);
  };

  const toggleStory = (storyId: string) => {
    const newExpanded = new Set(expandedStories);
    if (newExpanded.has(storyId)) {
      newExpanded.delete(storyId);
    } else {
      newExpanded.add(storyId);
    }
    setExpandedStories(newExpanded);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const content = `Epic Requirement Hierarchy\n\nEpic: ${epic?.epic_key} - ${epic?.name}\nDescription: ${epic?.description || 'N/A'}\n\n${
      features?.map(f => {
        const featureStories = stories?.filter(s => s.feature_id === f.id) || [];
        const totalPoints = featureStories.reduce((sum, s) => sum + (s.estimate_points || 0), 0);
        return `Feature: ${f.display_id} - ${f.name}\nEstimate: ${f.estimate_points || 0} points\nAcceptance Criteria: ${f.acceptance_criteria || 'N/A'}\n\n${
          featureStories.map(s => {
            const storySubtasks = subtasks?.filter(st => st.story_id === s.id) || [];
            return `  Story: ${s.id.slice(0, 8)} - ${s.name}\n  Points: ${s.estimate_points || 0}\n  Acceptance: ${s.acceptance_criteria || 'N/A'}\n${
              storySubtasks.map(st => `    Subtask: ${st.id.slice(0, 8)} - ${st.name}\n    Status: ${st.status || 'N/A'}`).join('\n')
            }`;
          }).join('\n\n')
        }`;
      }).join('\n\n---\n\n')
    }`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epic-requirements-${epic?.epic_key}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (epicLoading || featuresLoading || storiesLoading || subtasksLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const totalStoryPoints = stories?.reduce((sum, s) => sum + (s.estimate_points || 0), 0) || 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplates(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <ReportTemplatesDialog
        open={showTemplates}
        onOpenChange={setShowTemplates}
        reportType="hierarchy"
      />

      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-2">Epic Requirement Hierarchy</h1>
        <p className="text-muted-foreground mb-8">Full requirement tree for {epic?.epic_key}</p>

        {/* Epic Details */}
        <div className="mb-8 pb-6 border-b">
          <div className="flex items-start gap-4">
            <Badge variant="secondary" className="text-lg px-3 py-1">{epic?.epic_key}</Badge>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{epic?.name}</h2>
              {epic?.description && (
                <p className="text-muted-foreground mb-3">{epic.description}</p>
              )}
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">State:</span>{" "}
                  <Badge variant="outline">{epic?.state || 'N/A'}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Health:</span>{" "}
                  <Badge variant="outline">{epic?.health || 'N/A'}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Story Points:</span>{" "}
                  <span className="font-semibold">{totalStoryPoints}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Tree */}
        <div className="space-y-4">
          {features?.map((feature) => {
            const featureStories = stories?.filter(s => s.feature_id === feature.id) || [];
            const isExpanded = expandedFeatures.has(feature.id);
            
            return (
              <Collapsible key={feature.id} open={isExpanded} onOpenChange={() => toggleFeature(feature.id)}>
                <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-start gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-primary">{feature.display_id}</Badge>
                          <h3 className="text-lg font-semibold">{feature.name}</h3>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{feature.estimate_points || 0} points</span>
                          <span>{featureStories.length} stories</span>
                          <Badge variant="outline" className="text-xs">{feature.status}</Badge>
                        </div>
                        {feature.acceptance_criteria && (
                          <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                            {feature.acceptance_criteria}
                          </p>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="ml-8 mt-4 space-y-3">
                      {featureStories.map((story) => {
                        const storySubtasks = subtasks?.filter(st => st.story_id === story.id) || [];
                        const isStoryExpanded = expandedStories.has(story.id);
                        
                        return (
                          <Collapsible key={story.id} open={isStoryExpanded} onOpenChange={() => toggleStory(story.id)}>
                            <div className="border-l-2 border-success pl-4 py-2">
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-start gap-3">
                                  {storySubtasks.length > 0 && (
                                    isStoryExpanded ? (
                                      <ChevronDown className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                    )
                                  )}
                                  <div className="flex-1 text-left">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="secondary" className="bg-success/10 text-success">
                                        {story.id.slice(0, 8)}
                                      </Badge>
                                      <span className="font-medium">{story.name}</span>
                                    </div>
                                    <div className="flex gap-3 text-xs text-muted-foreground">
                                      <span>{story.estimate_points || 0} points</span>
                                      <Badge variant="outline" className="text-xs">{story.status}</Badge>
                                      {storySubtasks.length > 0 && (
                                        <span>{storySubtasks.length} subtasks</span>
                                      )}
                                    </div>
                                    {story.acceptance_criteria && (
                                      <p className="text-xs mt-2 text-muted-foreground">
                                        AC: {story.acceptance_criteria}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              
                              {storySubtasks.length > 0 && (
                                <CollapsibleContent>
                                  <div className="ml-6 mt-2 space-y-2">
                                    {storySubtasks.map((subtask) => (
                                      <div key={subtask.id} className="flex items-center gap-2 border-l-2 border-warning pl-3 py-1">
                                        <Badge variant="outline" className="text-xs bg-warning/10 text-warning">
                                          {subtask.id.slice(0, 8)}
                                        </Badge>
                                        <span className="text-sm">{subtask.name}</span>
                                        <Badge variant="outline" className="text-xs ml-auto">
                                          {subtask.status}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              )}
                            </div>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Statistics */}
        <div className="mt-8 pt-6 border-t">
          <h3 className="font-semibold mb-4">Hierarchy Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">{features?.length || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Features</div>
              <div className="text-xs text-muted-foreground mt-1">
                {features?.reduce((sum, f) => sum + (f.estimate_points || 0), 0) || 0} points
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-success">{stories?.length || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Stories</div>
              <div className="text-xs text-muted-foreground mt-1">
                {totalStoryPoints} points
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-warning">{subtasks?.length || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Subtasks</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {(features?.length || 0) + (stories?.length || 0) + (subtasks?.length || 0)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Total Items</div>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}
