import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { useCreateKeyResultV2, useUpdateKeyResultV2, MetricType, Direction } from "@/hooks/useKeyResultsV2";
import { getCurrencyLabel } from "@/lib/currencyConfig";

// V1-style metric type options mapped to v2 types
// NOTE: DB CHECK constraint allows: 'percentage', 'count', 'cost_currency', 'nps', 'score'
// These UI values are mapped to DB values in useKeyResultsV2.ts
const METRIC_TYPE_OPTIONS = [
  { label: "Percentage", value: "percentage" },
  { label: "Number", value: "number" },  // maps to 'count' in DB
  { label: "Currency", value: "currency" }, // maps to 'cost_currency' in DB
  { label: "NPS", value: "nps" },
  { label: "Score", value: "score" },
] as const;

const DIRECTION_OPTIONS = [
  { label: "Increase", value: "increase" },
  { label: "Decrease", value: "decrease" },
  { label: "Maintain", value: "maintain" },
] as const;

interface KeyResultDialogV2Props {
  open: boolean;
  onClose: () => void;
  objectiveId: string;
  keyResult?: any;
}

export function KeyResultDialogV2({
  open,
  onClose,
  objectiveId,
  keyResult,
}: KeyResultDialogV2Props) {
  const [summary, setSummary] = useState("");
  const [metricType, setMetricType] = useState<MetricType>("percentage");
  const [direction, setDirection] = useState<Direction>("increase");
  const [baselineValue, setBaselineValue] = useState<string>("0");
  const [goalValue, setGoalValue] = useState<string>("100");
  const [currentValue, setCurrentValue] = useState<string>("0");

  const createMutation = useCreateKeyResultV2();
  const updateMutation = useUpdateKeyResultV2();

  useEffect(() => {
    if (keyResult) {
      setSummary(keyResult.summary || "");
      setMetricType(keyResult.metric_type || "percentage");
      setDirection(keyResult.direction || "increase");
      setBaselineValue(String(keyResult.baseline_value ?? 0));
      setGoalValue(String(keyResult.goal_value ?? 100));
      setCurrentValue(String(keyResult.current_value ?? 0));
    } else {
      setSummary("");
      setMetricType("percentage");
      setDirection("increase");
      setBaselineValue("0");
      setGoalValue("100");
      setCurrentValue("0");
    }
  }, [keyResult, open]);

  const parseValue = (val: string): number => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const baselineNum = parseValue(baselineValue);
  const currentNum = parseValue(currentValue);
  const goalNum = parseValue(goalValue);

  const handleSubmit = async () => {
    if (!summary.trim()) {
      return;
    }

    if (keyResult) {
      // Update existing KR
      await updateMutation.mutateAsync({
        id: keyResult.id,
        objectiveId,
        current_value: currentNum,
      });
      onClose();
    } else {
      // Create new KR - include current_value
      await createMutation.mutateAsync({
        objective_id: objectiveId,
        summary: summary.trim(),
        metric_type: metricType,
        baseline_value: baselineNum,
        current_value: currentNum,
        goal_value: goalNum,
        direction,
      });
      onClose();
    }
  };

  const getMetricSuffix = () => {
    if (metricType === "percentage") return "%";
    if (metricType === "currency") return ` ${getCurrencyLabel()}`;
    return "";
  };

  // Calculate progress
  const calculateProgress = () => {
    if (goalNum === baselineNum) return 0;
    const progress = direction === 'increase'
      ? ((currentNum - baselineNum) / (goalNum - baselineNum)) * 100
      : ((baselineNum - currentNum) / (baselineNum - goalNum)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {keyResult ? "Edit Key Result" : "Create Key Result"}
          </DialogTitle>
          <DialogDescription>
            {keyResult ? "Update the key result details below." : "Add a new key result to track progress toward this objective."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="summary">Summary *</Label>
            <Input
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g., Increase monthly active users to 10,000"
              disabled={!!keyResult}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="metricType">Metric Type</Label>
              <Select 
                value={metricType} 
                onValueChange={(v) => setMetricType(v as MetricType)}
                disabled={!!keyResult}
              >
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

            <div className="space-y-2">
              <Label htmlFor="direction">Direction</Label>
              <Select 
                value={direction} 
                onValueChange={(v) => setDirection(v as Direction)}
                disabled={!!keyResult}
              >
                <SelectTrigger id="direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                onBlur={() => setBaselineValue(String(parseValue(baselineValue)))}
                disabled={!!keyResult}
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
                onBlur={() => setCurrentValue(String(parseValue(currentValue)))}
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
                onBlur={() => setGoalValue(String(parseValue(goalValue)))}
                disabled={!!keyResult}
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
                  style={{ width: `${calculateProgress()}%` }}
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
            disabled={createMutation.isPending || updateMutation.isPending || !summary.trim()}
          >
            {keyResult ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
