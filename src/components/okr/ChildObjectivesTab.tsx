import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { AddChildObjectiveDialog } from "./AddChildObjectiveDialog";

interface ChildObjectivesTabProps {
  objectiveId: string;
}

export function ChildObjectivesTab({ objectiveId }: ChildObjectivesTabProps) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Fetch child objectives
  const { data: childObjectives = [] } = useQuery({
    queryKey: ["child-objectives", objectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("objectives")
        .select("*")
        .eq("parent_objective_id", objectiveId);
      if (error) throw error;
      return data || [];
    },
  });

  // Remove child link mutation
  const removeChildMutation = useMutation({
    mutationFn: async (childId: string) => {
      const { error } = await supabase
        .from("objectives")
        .update({ parent_objective_id: null })
        .eq("id", childId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-objectives", objectiveId] });
      toast.success("Child objective removed");
    },
    onError: () => {
      toast.error("Failed to remove child objective");
    },
  });

  const getScoreColor = (score: number | null) => {
    if (score === null) return "gray";
    if (score >= 0.7) return "green";
    if (score >= 0.4) return "yellow";
    return "red";
  };

  const getScoreVariant = (score: number | null): any => {
    const color = getScoreColor(score);
    if (color === "green") return "default";
    if (color === "yellow") return "secondary";
    if (color === "red") return "destructive";
    return "outline";
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Child Objectives ({childObjectives.length})</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Child
          </Button>
        </div>

        {childObjectives.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No child objectives linked to this objective
          </p>
        ) : (
          <div className="space-y-2">
            {childObjectives.map((child: any) => (
              <div
                key={child.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{child.id.slice(0, 8)}</span>
                    <span className="text-sm">{child.summary}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{child.tier}</Badge>
                    <Badge variant={getScoreVariant(child.score)}>
                      {child.score !== null ? (child.score * 100).toFixed(0) + "%" : "N/A"}
                    </Badge>
                    <Badge variant="outline">
                      {child.status?.replace("_", " ").toUpperCase() || "PENDING"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChildMutation.mutate(child.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AddChildObjectiveDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        parentObjectiveId={objectiveId}
      />
    </div>
  );
}
