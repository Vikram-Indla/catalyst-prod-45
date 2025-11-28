import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Printer, Download, ChevronRight, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportTemplatesDialog } from "@/components/items/epics/dialogs/ReportTemplatesDialog";

export default function EpicTraceReport() {
  const { epicId } = useParams();
  const navigate = useNavigate();
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

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const content = `Epic Trace Report\n\nEpic: ${epic?.epic_key} - ${epic?.name}\n\n${
      features?.map(f => {
        const featureStories = stories?.filter(s => s.feature_id === f.id) || [];
        return `Feature: ${f.display_id} - ${f.name}\n${
          featureStories.map(s => {
            const storySubtasks = subtasks?.filter(st => st.story_id === s.id) || [];
            return `  Story: ${s.id.slice(0, 8)} - ${s.name}\n${
              storySubtasks.map(st => `    Subtask: ${st.id.slice(0, 8)} - ${st.name}`).join('\n')
            }`;
          }).join('\n')
        }`;
      }).join('\n\n')
    }`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epic-trace-${epic?.epic_key}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (epicLoading || featuresLoading || storiesLoading || subtasksLoading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
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

      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-2">Epic Trace Report</h1>
        <p className="text-muted-foreground mb-8">Hierarchy visualization for {epic?.epic_key}</p>

        <div className="space-y-6">
          {/* Epic Level */}
          <div className="border-l-4 border-primary pl-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm bg-primary/10 px-2 py-1 rounded">
                {epic?.epic_key}
              </span>
              <h2 className="text-xl font-semibold">{epic?.name}</h2>
            </div>
            {epic?.description && (
              <p className="text-sm text-muted-foreground mb-4">{epic.description}</p>
            )}

            {/* Features Level */}
            {features?.map((feature) => {
              const featureStories = stories?.filter(s => s.feature_id === feature.id) || [];
              
              return (
                <div key={feature.id} className="ml-6 mt-4 border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm bg-blue-500/10 px-2 py-1 rounded">
                      {feature.display_id}
                    </span>
                    <h3 className="text-lg font-semibold">{feature.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      ({feature.estimate_points || 0} pts)
                    </span>
                  </div>

                  {/* Stories Level */}
                  {featureStories.map((story) => {
                    const storySubtasks = subtasks?.filter(st => st.story_id === story.id) || [];
                    
                    return (
                      <div key={story.id} className="ml-6 mt-3 border-l-4 border-green-500 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm bg-green-500/10 px-2 py-1 rounded">
                            {story.id.slice(0, 8)}
                          </span>
                          <h4 className="font-medium">{story.name}</h4>
                          <span className="text-sm text-muted-foreground">
                            ({story.estimate_points || 0} pts)
                          </span>
                        </div>

                        {/* Subtasks Level */}
                        {storySubtasks.length > 0 && (
                          <div className="ml-6 mt-2 space-y-2">
                            {storySubtasks.map((subtask) => (
                              <div key={subtask.id} className="flex items-center gap-2 border-l-4 border-orange-500 pl-4 py-1">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono text-xs bg-orange-500/10 px-2 py-1 rounded">
                                  {subtask.id.slice(0, 8)}
                                </span>
                                <span className="text-sm">{subtask.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-8 pt-6 border-t">
          <h3 className="font-semibold mb-3">Summary</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">1</div>
              <div className="text-sm text-muted-foreground">Epic</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{features?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Features</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stories?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Stories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{subtasks?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Subtasks</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
