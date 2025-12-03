import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, TrendingUp } from "lucide-react";

interface EnhancedBottomUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epicIds: string[];
}

export function EnhancedBottomUpDialog({
  open,
  onOpenChange,
  epicIds,
}: EnhancedBottomUpDialogProps) {
  const queryClient = useQueryClient();

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const results = [];

      for (const epicId of epicIds) {
        // Get all features for this epic
        const { data: features } = await supabase
          .from("features")
          .select("id")
          .eq("epic_id", epicId);

        let totalStoryPoints = 0;

        if (features && features.length > 0) {
          const featureIds = features.map(f => f.id);
          
          // Get all stories for these features and sum their points
          const { data: stories } = await supabase
            .from("stories")
            .select("story_points")
            .in("feature_id", featureIds);

          totalStoryPoints = stories?.reduce((sum, s) => sum + (s.story_points || 0), 0) || 0;
        }

        // Update epic with bottom-up estimate from story points
        const { error } = await supabase
          .from("epics")
          .update({
            estimate: totalStoryPoints,
            estimate_method: "bottom_up",
            last_estimate_calculation: new Date().toISOString(),
          })
          .eq("id", epicId);

        if (error) throw error;

        results.push({ epicId, estimate: totalStoryPoints });
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["epics"] });
      toast.success(
        `Updated ${results.length} epic${results.length > 1 ? "s" : ""} with bottom-up estimates`
      );
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Bottom-up calculation error:", error);
      toast.error("Failed to calculate estimates");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Bottom-Up Estimate
          </DialogTitle>
          <DialogDescription>
            Calculate epic estimates by summing story points from all associated stories.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-muted/50 p-4 rounded-lg border space-y-2">
            <p className="text-sm font-medium">Calculation Method</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Sum story points from all stories linked to features</li>
              <li>• Push totals up from stories → features → epic</li>
              <li>• Update epic estimate with calculated total</li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            This will update {epicIds.length} epic{epicIds.length > 1 ? "s" : ""} with estimates calculated from their associated story points.
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => calculateMutation.mutate()}
              disabled={calculateMutation.isPending}
            >
              {calculateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Calculate
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
