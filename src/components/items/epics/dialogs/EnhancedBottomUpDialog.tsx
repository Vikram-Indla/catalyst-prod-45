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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

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
  const [includeFeatures, setIncludeFeatures] = useState(true);
  const [confidenceLevel, setConfidenceLevel] = useState([80]);

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const results = [];

      for (const epicId of epicIds) {
        let totalEstimate = 0;

        // Calculate from direct features
        if (includeFeatures) {
          const { data: features } = await supabase
            .from("features")
            .select("estimate_points")
            .eq("epic_id", epicId);

          totalEstimate +=
            features?.reduce((sum, f) => sum + (f.estimate_points || 0), 0) || 0;
        }

        // Apply confidence adjustment
        const adjustedEstimate = Math.round(
          totalEstimate * (confidenceLevel[0] / 100)
        );

        // Update epic with new estimate and metadata
        const { error } = await supabase
          .from("epics")
          .update({
            estimate: adjustedEstimate,
            estimate_method: "bottom_up",
            estimate_confidence: confidenceLevel[0],
            last_estimate_calculation: new Date().toISOString(),
          })
          .eq("id", epicId);

        if (error) throw error;

        results.push({ epicId, estimate: adjustedEstimate });
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

  const disabled = !includeFeatures;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Bottom-Up Estimate Calculation
          </DialogTitle>
          <DialogDescription>
            Calculate epic estimates by aggregating story points from child work
            items with confidence adjustment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="features"
                checked={includeFeatures}
                onCheckedChange={(checked) =>
                  setIncludeFeatures(checked as boolean)
                }
              />
              <Label htmlFor="features" className="font-normal cursor-pointer">
                Include All Features
              </Label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Confidence Level</Label>
              <span className="text-sm font-medium text-primary">
                {confidenceLevel[0]}%
              </span>
            </div>
            <Slider
              value={confidenceLevel}
              onValueChange={setConfidenceLevel}
              min={50}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Lower confidence creates more conservative estimates to account for
              uncertainty and risk.
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg border space-y-2">
            <p className="text-sm font-medium">Calculation Method</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>
                • Sum story points from all features
              </li>
              <li>• Apply {confidenceLevel[0]}% confidence factor</li>
              <li>• Round to nearest integer</li>
              <li>• Track calculation metadata</li>
            </ul>
          </div>

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
              disabled={calculateMutation.isPending || disabled}
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
