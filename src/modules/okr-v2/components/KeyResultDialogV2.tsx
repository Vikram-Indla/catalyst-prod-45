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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useCreateKeyResultV2, useUpdateKeyResultV2, MetricType, Direction } from "@/hooks/useKeyResultsV2";
import { getCurrencyLabel } from "@/lib/currencyConfig";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [dateError, setDateError] = useState<string | null>(null);

  const createMutation = useCreateKeyResultV2();
  const updateMutation = useUpdateKeyResultV2();

  // Fetch parent objective to get default dates
  const { data: parentObjective } = useQuery({
    queryKey: ['objective-for-kr', objectiveId],
    queryFn: async () => {
      if (!objectiveId) return null;
      const { data, error } = await supabase
        .from('objectives')
        .select('start_date, due_date')
        .eq('id', objectiveId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!objectiveId && open && !keyResult,
  });

  useEffect(() => {
    if (keyResult) {
      setSummary(keyResult.summary || "");
      setMetricType(keyResult.metric_type || "percentage");
      setDirection(keyResult.direction || "increase");
      setBaselineValue(String(keyResult.baseline_value ?? 0));
      setGoalValue(String(keyResult.goal_value ?? 100));
      setCurrentValue(String(keyResult.current_value ?? 0));
      setStartDate(keyResult.start_date ? new Date(keyResult.start_date) : undefined);
      setEndDate(keyResult.end_date ? new Date(keyResult.end_date) : undefined);
      setDateError(null);
    } else {
      setSummary("");
      setMetricType("percentage");
      setDirection("increase");
      setBaselineValue("0");
      setGoalValue("100");
      setCurrentValue("0");
      // Default to parent objective dates if available
      setStartDate(parentObjective?.start_date ? new Date(parentObjective.start_date) : undefined);
      setEndDate(parentObjective?.due_date ? new Date(parentObjective.due_date) : undefined);
      setDateError(null);
    }
  }, [keyResult, open, parentObjective]);

  // Validate dates
  useEffect(() => {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      setDateError("Both start and end dates are required if either is set");
    } else if (startDate && endDate && endDate < startDate) {
      setDateError("End date must be on or after start date");
    } else {
      setDateError(null);
    }
  }, [startDate, endDate]);

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

    if (dateError) {
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
      // Create new KR - include dates
      await createMutation.mutateAsync({
        objective_id: objectiveId,
        summary: summary.trim(),
        metric_type: metricType,
        baseline_value: baselineNum,
        current_value: currentNum,
        goal_value: goalNum,
        direction,
        start_date: startDate ? startDate.toISOString().split('T')[0] : null,
        end_date: endDate ? endDate.toISOString().split('T')[0] : null,
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

  const isSubmitDisabled = createMutation.isPending || updateMutation.isPending || !summary.trim() || !!dateError;

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

          {/* Timeframe Section */}
          <div className="space-y-2">
            <Label>Timeframe</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Start Date</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                      disabled={!!keyResult}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[500]" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">End Date</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                      disabled={!!keyResult}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[500]" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {dateError && (
              <p className="text-xs text-destructive mt-1">{dateError}</p>
            )}
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
            disabled={isSubmitDisabled}
          >
            {keyResult ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
