import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { AddAlignedWorkDialog } from "./AddAlignedWorkDialog";

interface AlignedWorkTabProps {
  objectiveId: string;
}

export function AlignedWorkTab({ objectiveId }: AlignedWorkTabProps) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [workType, setWorkType] = useState<string>("");

  // Fetch aligned epics
  const { data: epics = [] } = useQuery({
    queryKey: ["objective-epics", objectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("objective_epic_links")
        .select("epic_id, epics!inner(id, name, epic_key, state)")
        .eq("objective_id", objectiveId);
      if (error) throw error;
      const results = (data || []) as any[];
      return results.map(d => d.epics).filter(Boolean);
    },
  });

  // Fetch aligned features
  const { data: features = [] } = useQuery({
    queryKey: ["objective-features", objectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("objective_feature_links")
        .select("feature_id, features!inner(id, name, display_id, status)")
        .eq("objective_id", objectiveId);
      if (error) throw error;
      const results = (data || []) as any[];
      return results.map(d => d.features).filter(Boolean);
    },
  });

  // Remove link mutation
  const removeLinkMutation = useMutation({
    mutationFn: async ({ type, itemId }: { type: string; itemId: string }) => {
      const table = type === "epic" ? "objective_epic_links" : "objective_feature_links" as any;
      const column = type === "epic" ? "epic_id" : "feature_id";
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("objective_id", objectiveId)
        .eq(column, itemId);
      
      if (error) throw error;
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: [`objective-${type}s`, objectiveId] });
      toast.success("Work item removed");
    },
    onError: () => {
      toast.error("Failed to remove work item");
    },
  });

  const handleAddWork = (type: string) => {
    setWorkType(type);
    setShowAddDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Epics */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Epics ({epics.length})</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddWork("epic")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Epic
          </Button>
        </div>
        
        {epics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No epics aligned to this objective</p>
        ) : (
          <div className="space-y-2">
            {epics.map((epic: any) => (
              <div
                key={epic.id}
                className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{epic.epic_key}</span>
                  <span className="text-sm">{epic.name}</span>
                  <Badge variant="outline">{epic.state}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLinkMutation.mutate({ type: "epic", itemId: epic.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Features */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Features ({features.length})</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddWork("feature")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Feature
          </Button>
        </div>
        
        {features.length === 0 ? (
          <p className="text-sm text-muted-foreground">No features aligned to this objective</p>
        ) : (
          <div className="space-y-2">
            {features.map((feature: any) => (
              <div
                key={feature.id}
                className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{feature.display_id}</span>
                  <span className="text-sm">{feature.name}</span>
                  <Badge variant="outline">{feature.status}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLinkMutation.mutate({ type: "feature", itemId: feature.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AddAlignedWorkDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        objectiveId={objectiveId}
        workType={workType}
      />
    </div>
  );
}
