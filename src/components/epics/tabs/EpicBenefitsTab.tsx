import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface EpicBenefitsTabProps {
  epicId: string;
}

export function EpicBenefitsTab({ epicId }: EpicBenefitsTabProps) {
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [formData, setFormData] = useState({
    value_score: 0,
    profit_potential_score: 0,
    cost_score: 0,
    time_to_market_score: 0,
    development_risks_score: 0,
  });

  const { data: roiScores, refetch } = useQuery({
    queryKey: ["epic-roi", epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epic_roi_scores")
        .select("*")
        .eq("epic_id", epicId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setFormData({
          value_score: data.value_score || 0,
          profit_potential_score: data.profit_potential_score || 0,
          cost_score: data.cost_score || 0,
          time_to_market_score: data.time_to_market_score || 0,
          development_risks_score: data.development_risks_score || 0,
        });
      }
      return data;
    },
  });

  const handleSave = async () => {
    if (roiScores) {
      const { error } = await supabase
        .from("epic_roi_scores")
        .update(formData)
        .eq("id", roiScores.id);

      if (error) {
        toast.error("Failed to update benefits");
      } else {
        toast.success("Benefits updated");
        setUnsavedChanges(false);
        refetch();
      }
    } else {
      const { error } = await supabase
        .from("epic_roi_scores")
        .insert({ epic_id: epicId, ...formData });

      if (error) {
        toast.error("Failed to save benefits");
      } else {
        toast.success("Benefits saved");
        setUnsavedChanges(false);
        refetch();
      }
    }
  };

  const handleFieldChange = (field: string, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Benefits & ROI</h3>
          <p className="text-sm text-muted-foreground">
            Evaluate the expected return on investment
          </p>
        </div>
        {unsavedChanges && (
          <Button onClick={handleSave} size="sm">
            Save Changes
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="value_score">Value Score (0-100)</Label>
          <div className="flex items-center gap-4">
            <Slider
              id="value_score"
              value={[formData.value_score]}
              onValueChange={([value]) => handleFieldChange("value_score", value)}
              max={100}
              step={1}
              className="flex-1"
            />
            <Input
              type="number"
              value={formData.value_score}
              onChange={(e) => handleFieldChange("value_score", parseInt(e.target.value) || 0)}
              className="w-20"
              min={0}
              max={100}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="profit_potential_score">Profit Potential (1-10)</Label>
          <div className="flex items-center gap-4">
            <Slider
              id="profit_potential_score"
              value={[formData.profit_potential_score]}
              onValueChange={([value]) => handleFieldChange("profit_potential_score", value)}
              max={10}
              step={1}
              className="flex-1"
            />
            <Input
              type="number"
              value={formData.profit_potential_score}
              onChange={(e) => handleFieldChange("profit_potential_score", parseInt(e.target.value) || 0)}
              className="w-20"
              min={1}
              max={10}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="cost_score">Cost Score (1-10)</Label>
          <div className="flex items-center gap-4">
            <Slider
              id="cost_score"
              value={[formData.cost_score]}
              onValueChange={([value]) => handleFieldChange("cost_score", value)}
              max={10}
              step={1}
              className="flex-1"
            />
            <Input
              type="number"
              value={formData.cost_score}
              onChange={(e) => handleFieldChange("cost_score", parseInt(e.target.value) || 0)}
              className="w-20"
              min={1}
              max={10}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="time_to_market_score">Time to Market (1-10)</Label>
          <div className="flex items-center gap-4">
            <Slider
              id="time_to_market_score"
              value={[formData.time_to_market_score]}
              onValueChange={([value]) => handleFieldChange("time_to_market_score", value)}
              max={10}
              step={1}
              className="flex-1"
            />
            <Input
              type="number"
              value={formData.time_to_market_score}
              onChange={(e) => handleFieldChange("time_to_market_score", parseInt(e.target.value) || 0)}
              className="w-20"
              min={1}
              max={10}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="development_risks_score">Development Risks (1-10)</Label>
          <div className="flex items-center gap-4">
            <Slider
              id="development_risks_score"
              value={[formData.development_risks_score]}
              onValueChange={([value]) => handleFieldChange("development_risks_score", value)}
              max={10}
              step={1}
              className="flex-1"
            />
            <Input
              type="number"
              value={formData.development_risks_score}
              onChange={(e) => handleFieldChange("development_risks_score", parseInt(e.target.value) || 0)}
              className="w-20"
              min={1}
              max={10}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
