import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useUpdateObjective } from "@/hooks/useObjectives";
import { toast } from "sonner";

interface ObjectiveDetailsTabProps {
  objective: any;
}

export function ObjectiveDetailsTab({ objective }: ObjectiveDetailsTabProps) {
  const updateMutation = useUpdateObjective();
  const [startDate, setStartDate] = useState<Date | undefined>(
    objective.start_date ? new Date(objective.start_date) : undefined
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    objective.due_date ? new Date(objective.due_date) : undefined
  );

  const handleFieldUpdate = (field: string, value: any) => {
    updateMutation.mutate(
      { id: objective.id, [field]: value },
      {
        onSuccess: () => {
          toast.success("Objective updated");
        },
        onError: () => {
          toast.error("Failed to update objective");
        },
      }
    );
  };

  const handleDateUpdate = (field: string, date: Date | undefined) => {
    if (field === "start_date") {
      setStartDate(date);
    } else {
      setDueDate(date);
    }
    handleFieldUpdate(field, date ? date.toISOString() : null);
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <Select
                value={objective.tier || undefined}
                onValueChange={(value) => handleFieldUpdate("tier", value)}
              >
                <SelectTrigger id="tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strategic">Strategic</SelectItem>
                  <SelectItem value="portfolio">Portfolio</SelectItem>
                  <SelectItem value="solution">Solution</SelectItem>
                  <SelectItem value="program">Program</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={objective.status || undefined}
                onValueChange={(value) => handleFieldUpdate("status", value)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="off_track">Off Track</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => handleDateUpdate("start_date", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => handleDateUpdate("due_date", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Health & Progress</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Health</div>
            <Badge variant="outline">{objective.health || "N/A"}</Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Score</div>
            <div className="font-medium text-lg">
              {objective.score !== null && objective.score !== undefined
                ? objective.score.toFixed(2)
                : "N/A"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Blocked</div>
            <Badge variant={objective.is_blocked ? "destructive" : "outline"}>
              {objective.is_blocked ? "Yes" : "No"}
            </Badge>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Tracking</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Key Result Progress</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${objective.key_result_progress * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {Math.round(objective.key_result_progress * 100)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Work Progress</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${objective.work_progress * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {Math.round(objective.work_progress * 100)}%
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Context</h3>
        <div className="space-y-2">
          <div>
            <div className="text-sm text-muted-foreground">Program Increments</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {objective.program_increment_ids.length > 0 ? (
                objective.program_increment_ids.map((piId: string) => (
                  <Badge key={piId} variant="outline">
                    {piId.slice(0, 8)}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
