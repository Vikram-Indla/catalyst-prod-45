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
  const [baselineValue, setBaselineValue] = useState<number>(0);
  const [goalValue, setGoalValue] = useState<number>(100);
  const [currentValue, setCurrentValue] = useState<number>(0);

  const createMutation = useCreateKeyResult();
  const updateMutation = useUpdateKeyResult();

  useEffect(() => {
    if (keyResult) {
      setSummary(keyResult.summary || "");
      setMetricType(keyResult.metric_type || "percentage");
      setBaselineValue(keyResult.baseline_value || 0);
      setGoalValue(keyResult.goal_value || 100);
      setCurrentValue(keyResult.current_value || 0);
    } else {
      setSummary("");
      setMetricType("percentage");
      setBaselineValue(0);
      setGoalValue(100);
      setCurrentValue(0);
    }
  }, [keyResult, open]);

  const handleSubmit = () => {
    if (!summary.trim()) {
      return;
    }

    const data = {
      objective_id: objectiveId,
      summary,
      metric_type: metricType,
      baseline_value: baselineValue,
      goal_value: goalValue,
      current_value: currentValue,
    };

    if (keyResult) {
      // Update - just call mutation, toast is handled in hook
      updateMutation.mutate(
        { id: keyResult.id, ...data },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      // Create - just call mutation, toast is handled in hook
      createMutation.mutate(data, {
        onSuccess: () => {
          onClose();
        },
      });
    }
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
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="count">Count</SelectItem>
                <SelectItem value="currency">Currency</SelectItem>
                <SelectItem value="decimal_score">Decimal Score</SelectItem>
                <SelectItem value="nps">Net Promoter Score</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baselineValue">Baseline Value</Label>
              <Input
                id="baselineValue"
                type="number"
                value={baselineValue}
                onChange={(e) => setBaselineValue(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentValue">Current Value</Label>
              <Input
                id="currentValue"
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalValue">Goal Value</Label>
              <Input
                id="goalValue"
                type="number"
                value={goalValue}
                onChange={(e) => setGoalValue(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <div className="text-sm font-medium mb-2">Progress</div>
            <div className="text-sm text-muted-foreground">
              {baselineValue} → {currentValue} / {goalValue}
              {metricType === "percentage" && "%"}
              {metricType === "currency" && ` ${getCurrencyLabel()}`}
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
                        ((currentValue - baselineValue) /
                          (goalValue - baselineValue)) *
                          100
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
