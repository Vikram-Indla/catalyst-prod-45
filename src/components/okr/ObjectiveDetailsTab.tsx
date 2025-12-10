import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, X, Link2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useUpdateObjective } from "@/hooks/useObjectives";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useObjectiveThemes, useAllThemes, useLinkThemesToObjective, useUnlinkThemesFromObjective } from "@/hooks/useObjectiveThemeLinks";

// OKR Objectives only support Portfolio and Program tiers
const OKR_TIER_OPTIONS = [
  { label: "Portfolio", value: "portfolio" },
  { label: "Program", value: "program" },
] as const;

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "On Track", value: "on_track" },
  { label: "At Risk", value: "at_risk" },
  { label: "Off Track", value: "off_track" },
  { label: "Completed", value: "completed" },
] as const;

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
  const [themePopoverOpen, setThemePopoverOpen] = useState(false);

  // Theme linking hooks (for Portfolio tier objectives)
  const { data: linkedThemes = [] } = useObjectiveThemes(objective.id);
  const { data: allThemes = [] } = useAllThemes();
  const linkThemesMutation = useLinkThemesToObjective();
  const unlinkThemesMutation = useUnlinkThemesFromObjective();

  // Fetch portfolios for Portfolio-tier objectives
  const { data: portfolios = [] } = useQuery({
    queryKey: ["portfolios-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolios")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch programs for Program-tier objectives
  const { data: programs = [] } = useQuery({
    queryKey: ["programs-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const handleFieldUpdate = (field: string, value: any) => {
    updateMutation.mutate({ id: objective.id, [field]: value });
  };

  const handleDateUpdate = (field: string, date: Date | undefined) => {
    if (field === "start_date") {
      setStartDate(date);
    } else {
      setDueDate(date);
    }
    handleFieldUpdate(field, date ? date.toISOString() : null);
  };

  const handleThemeToggle = (themeId: string, isLinked: boolean) => {
    if (isLinked) {
      unlinkThemesMutation.mutate({ objectiveId: objective.id, themeIds: [themeId] });
    } else {
      linkThemesMutation.mutate({ objectiveId: objective.id, themeIds: [themeId] });
    }
  };

  const handleRemoveTheme = (themeId: string) => {
    unlinkThemesMutation.mutate({ objectiveId: objective.id, themeIds: [themeId] });
  };

  // Get display label for tier (handle legacy values gracefully)
  const getTierLabel = (tier: string) => {
    const found = OKR_TIER_OPTIONS.find(o => o.value === tier);
    return found?.label || tier;
  };

  const isPortfolioTier = objective.tier === 'portfolio';
  const isProgramTier = objective.tier === 'program';
  
  // Get linked theme IDs for easy lookup
  const linkedThemeIds = new Set(linkedThemes.map(t => t.id));

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
                  <SelectValue placeholder="Select tier">
                    {getTierLabel(objective.tier)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {OKR_TIER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
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
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Portfolio dropdown - shown for Portfolio tier */}
          {isPortfolioTier && (
            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio *</Label>
              <Select
                value={objective.portfolio_id || undefined}
                onValueChange={(value) => handleFieldUpdate("portfolio_id", value)}
              >
                <SelectTrigger id="portfolio">
                  <SelectValue placeholder="Select portfolio" />
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Program dropdown - shown for Program tier */}
          {isProgramTier && (
            <div className="space-y-2">
              <Label htmlFor="program">Program *</Label>
              <Select
                value={objective.program_id || undefined}
                onValueChange={(value) => handleFieldUpdate("program_id", value)}
              >
                <SelectTrigger id="program">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Strategic Themes - Portfolio tier only */}
          {isPortfolioTier && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Strategic Themes
              </Label>
              
              {/* Linked themes display */}
              {linkedThemes.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {linkedThemes.map((theme) => (
                    <Badge 
                      key={theme.id} 
                      variant="secondary" 
                      className="flex items-center gap-1 pr-1"
                    >
                      {theme.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-destructive/20"
                        onClick={() => handleRemoveTheme(theme.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Theme selector popover */}
              <Popover open={themePopoverOpen} onOpenChange={setThemePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Link2 className="mr-2 h-4 w-4" />
                    {linkedThemes.length === 0 ? "Link themes..." : "Add more themes..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {allThemes.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">No themes available</p>
                    ) : (
                      allThemes.map((theme) => {
                        const isLinked = linkedThemeIds.has(theme.id);
                        return (
                          <div
                            key={theme.id}
                            className="flex items-center gap-2 p-2 hover:bg-muted rounded-sm cursor-pointer"
                            onClick={() => handleThemeToggle(theme.id, isLinked)}
                          >
                            <Checkbox 
                              checked={isLinked}
                              onCheckedChange={() => handleThemeToggle(theme.id, isLinked)}
                            />
                            <span className="text-sm flex-1 truncate">{theme.name}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

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
                  style={{ width: `${(objective.key_result_progress || 0) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {Math.round((objective.key_result_progress || 0) * 100)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Work Progress</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(objective.work_progress || 0) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {Math.round((objective.work_progress || 0) * 100)}%
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
              {objective.program_increment_ids?.length > 0 ? (
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
