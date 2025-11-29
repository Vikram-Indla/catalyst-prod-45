import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Target } from "lucide-react";

interface FeaturePIObjectiveLinkDialogProps {
  featureId: string;
  programId: string;
  piId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FeaturePIObjectiveLinkDialog({
  featureId,
  programId,
  piId,
  open,
  onOpenChange,
}: FeaturePIObjectiveLinkDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);

  const { data: piObjectives } = useQuery({
    queryKey: ["pi-objectives", programId, piId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pi_objectives")
        .select("*")
        .eq("program_id", programId)
        .eq("pi_id", piId);
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!programId && !!piId,
  });

  const { data: existingLinks } = useQuery({
    queryKey: ["feature-pi-objective-links", featureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_pi_objective_links")
        .select("pi_objective_id")
        .eq("feature_id", featureId);
      
      if (error) throw error;
      return data.map(link => link.pi_objective_id);
    },
    enabled: open && !!featureId,
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      // Remove existing links
      await supabase
        .from("feature_pi_objective_links")
        .delete()
        .eq("feature_id", featureId);

      // Add new links
      if (selectedObjectives.length > 0) {
        const links = selectedObjectives.map(objectiveId => ({
          feature_id: featureId,
          pi_objective_id: objectiveId,
        }));

        const { error } = await supabase
          .from("feature_pi_objective_links")
          .insert(links);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "PI Objectives Updated",
        description: "Feature linked to PI objectives successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["feature-pi-objective-links"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error Linking Objectives",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleObjective = (objectiveId: string) => {
    setSelectedObjectives(prev => 
      prev.includes(objectiveId)
        ? prev.filter(id => id !== objectiveId)
        : [...prev, objectiveId]
    );
  };

  const handleSave = () => {
    linkMutation.mutate();
  };

  // Initialize selected objectives when existing links are loaded
  useState(() => {
    if (existingLinks) {
      setSelectedObjectives(existingLinks);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Link to PI Objectives
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select which PI objectives this feature contributes to. This helps track business value delivery.
          </p>

          <ScrollArea className="h-[400px] border rounded-lg p-4">
            {piObjectives?.map((objective) => (
              <div key={objective.id} className="flex items-start space-x-3 p-3 hover:bg-muted rounded-lg">
                <Checkbox
                  checked={selectedObjectives.includes(objective.id)}
                  onCheckedChange={() => handleToggleObjective(objective.id)}
                />
                <div className="flex-1">
                  <Label className="font-semibold cursor-pointer">
                    {objective.name}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {objective.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      Planned BV: {objective.planned_bv}
                    </span>
                    {objective.stretch && (
                      <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">
                        Stretch
                      </span>
                    )}
                    {objective.committed && (
                      <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded">
                        Committed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(!piObjectives || piObjectives.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No PI objectives found for this program increment
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={linkMutation.isPending}>
              {linkMutation.isPending ? "Saving..." : "Save Links"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}