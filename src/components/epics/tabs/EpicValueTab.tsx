import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface EpicValueTabProps {
  epicId: string;
}

export function EpicValueTab({ epicId }: EpicValueTabProps) {
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [formData, setFormData] = useState({
    budget: 0,
    forecasted_spend: 0,
    estimated_spend: 0,
    accepted_spend: 0,
    initial_investment: 0,
    return_on_investment: 0,
    revenue_assurance: 0,
    efficiency_dividend: 0,
    discount_rate: 0,
  });

  const { data: spendData, refetch } = useQuery({
    queryKey: ["epic-spend", epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epic_spend")
        .select("*")
        .eq("epic_id", epicId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setFormData({
          budget: data.budget || 0,
          forecasted_spend: data.forecasted_spend || 0,
          estimated_spend: data.estimated_spend || 0,
          accepted_spend: data.accepted_spend || 0,
          initial_investment: data.initial_investment || 0,
          return_on_investment: data.return_on_investment || 0,
          revenue_assurance: data.revenue_assurance || 0,
          efficiency_dividend: data.efficiency_dividend || 0,
          discount_rate: data.discount_rate || 0,
        });
      }
      return data;
    },
  });

  const handleSave = async () => {
    if (spendData) {
      const { error } = await supabase
        .from("epic_spend")
        .update(formData)
        .eq("id", spendData.id);

      if (error) {
        toast.error("Failed to update value data");
      } else {
        toast.success("Value data updated");
        setUnsavedChanges(false);
        refetch();
      }
    } else {
      const { error } = await supabase
        .from("epic_spend")
        .insert({ epic_id: epicId, ...formData });

      if (error) {
        toast.error("Failed to save value data");
      } else {
        toast.success("Value data saved");
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
          <h3 className="text-lg font-semibold">Value & Financial Data</h3>
          <p className="text-sm text-muted-foreground">
            Track financial metrics and value realization
          </p>
        </div>
        {unsavedChanges && (
          <Button onClick={handleSave} size="sm">
            Save Changes
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="budget">Budget ($)</Label>
          <Input
            id="budget"
            type="number"
            value={formData.budget}
            onChange={(e) => handleFieldChange("budget", parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="forecasted_spend">Forecasted Spend ($)</Label>
          <Input
            id="forecasted_spend"
            type="number"
            value={formData.forecasted_spend}
            onChange={(e) => handleFieldChange("forecasted_spend", parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimated_spend">Estimated Spend ($)</Label>
          <Input
            id="estimated_spend"
            type="number"
            value={formData.estimated_spend}
            onChange={(e) => handleFieldChange("estimated_spend", parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accepted_spend">Accepted Spend ($)</Label>
          <Input
            id="accepted_spend"
            type="number"
            value={formData.accepted_spend}
            onChange={(e) => handleFieldChange("accepted_spend", parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="initial_investment">Initial Investment ($)</Label>
          <Input
            id="initial_investment"
            type="number"
            value={formData.initial_investment}
            onChange={(e) => handleFieldChange("initial_investment", parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="return_on_investment">Return on Investment (%)</Label>
          <Input
            id="return_on_investment"
            type="number"
            value={formData.return_on_investment}
            onChange={(e) => handleFieldChange("return_on_investment", parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="revenue_assurance">Revenue Assurance ($)</Label>
          <Input
            id="revenue_assurance"
            type="number"
            value={formData.revenue_assurance}
            onChange={(e) => handleFieldChange("revenue_assurance", parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="efficiency_dividend">Efficiency Dividend ($)</Label>
          <Input
            id="efficiency_dividend"
            type="number"
            value={formData.efficiency_dividend}
            onChange={(e) => handleFieldChange("efficiency_dividend", parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount_rate">Discount Rate (%)</Label>
          <Input
            id="discount_rate"
            type="number"
            value={formData.discount_rate}
            onChange={(e) => handleFieldChange("discount_rate", parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
      </div>
    </div>
  );
}
