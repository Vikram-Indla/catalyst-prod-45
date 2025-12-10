import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useCreateKeyResult, useUpdateKeyResult } from "@/hooks/useKeyResults";
import { getCurrencyLabel } from "@/lib/currencyConfig";

// Mapping between UI labels and DB values per constraint:
// DB allows: 'percentage', 'count', 'cost_currency', 'nps', 'score'
const METRIC_TYPE_OPTIONS = [
  { label: "Percentage", value: "percentage" },
  { label: "Count", value: "count" },
  { label: "Currency", value: "cost_currency" },
  { label: "Decimal Score", value: "score" },
  { label: "Net Promoter Score", value: "nps" },
] as const;

interface KeyResultDialogProps {
  open: boolean;
  onClose: () => void;
  objectiveId: string;
  keyResult?: any;
}

export function KeyResultDialog({
  open,
  onClose,
  objectiveId,
  keyResult,
}: KeyResultDialogProps) {
  const [summary, setSummary] = useState("");
  const [metricType, setMetricType] = useState<string>("percentage");
  // Use string state for inputs to avoid leading zero issue
  const [baselineValue, setBaselineValue] = useState<string>("0");
  const [goalValue, setGoalValue] = useState<string>("100");
  const [currentValue, setCurrentValue] = useState<string>("0");

  const createMutation = useCreateKeyResult();
  const updateMutation = useUpdateKeyResult();

  useEffect(() => {
    if (keyResult) {
      setSummary(keyResult.summary || "");
      setMetricType(keyResult.metric_type || "percentage");
      setBaselineValue(String(keyResult.baseline_value ?? 0));
      setGoalValue(String(keyResult.goal_value ?? 100));
      setCurrentValue(String(keyResult.current_value ?? 0));
    } else {
      setSummary("");
      setMetricType("percentage");
      setBaselineValue("0");
      setGoalValue("100");
      setCurrentValue("0");
    }
  }, [keyResult, open]);

  // Parse string to number for calculations and submission
  const parseValue = (val: string): number => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const baselineNum = parseValue(baselineValue);
  const currentNum = parseValue(currentValue);
  const goalNum = parseValue(goalValue);

  const handleSubmit = () => {
    if (!summary.trim()) {
      return;
    }

    const data = {
      objective_id: objectiveId,
      summary,
      metric_type: metricType,
      baseline_value: baselineNum,
      goal_value: goalNum,
      current_value: currentNum,
    };

    if (keyResult) {
      updateMutation.mutate(
        { id: keyResult.id, ...data },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };

  // Get display suffix based on metric type
  const getMetricSuffix = () => {
    if (metricType === "percentage") return "%";
    if (metricType === "cost_currency") return ` ${getCurrencyLabel()}`;
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {keyResult ? "Edit Key Result" : "Create Key Result"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="summary">Summary *</Label>
            <Input
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Key result summary..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metricType">Metric Type</Label>
            <Select value={metricType} onValueChange={setMetricType}>
              <SelectTrigger id="metricType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baselineValue">Baseline Value</Label>
              <Input
                id="baselineValue"
                type="text"
                inputMode="decimal"
                value={baselineValue}
                onChange={(e) => setBaselineValue(e.target.value)}
                onBlur={() => {
                  // Normalize to clean number on blur
                  const num = parseValue(baselineValue);
                  setBaselineValue(String(num));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentValue">Current Value</Label>
              <Input
                id="currentValue"
                type="text"
                inputMode="decimal"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={() => {
                  const num = parseValue(currentValue);
                  setCurrentValue(String(num));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalValue">Goal Value</Label>
              <Input
                id="goalValue"
                type="text"
                inputMode="decimal"
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
                onBlur={() => {
                  const num = parseValue(goalValue);
                  setGoalValue(String(num));
                }}
              />
            </div>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <div className="text-sm font-medium mb-2">Progress</div>
            <div className="text-sm text-muted-foreground">
              {baselineNum} → {currentNum} / {goalNum}
              {getMetricSuffix()}
            </div>
            <div className="mt-2">
              <div className="w-full bg-background rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        goalNum !== baselineNum
                          ? ((currentNum - baselineNum) / (goalNum - baselineNum)) * 100
                          : 0
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {keyResult ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
