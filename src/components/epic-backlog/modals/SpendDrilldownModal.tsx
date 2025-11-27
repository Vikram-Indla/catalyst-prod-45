import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface Story {
  id: string;
  numericId: number;
  title: string;
  team: string;
  teamSprintName: string | null;
  teamSpendPerPoint: number;
  storyEstimate: number;
  spend: number;
}

interface SpendDrilldownModalProps {
  open: boolean;
  onClose: () => void;
  epicTitle: string;
  spendType: "accepted" | "forecasted" | "estimated";
  stories: Story[];
  totalSpend: number;
  programIncrements?: { id: string; name: string }[];
}

export function SpendDrilldownModal({
  open,
  onClose,
  epicTitle,
  spendType,
  stories,
  totalSpend,
  programIncrements = [],
}: SpendDrilldownModalProps) {
  const [selectedPI, setSelectedPI] = useState<string>("all");

  const getSpendTypeLabel = () => {
    switch (spendType) {
      case "accepted":
        return "Accepted Spend";
      case "forecasted":
        return "Forecasted Spend";
      case "estimated":
        return "Estimated Spend";
      default:
        return "Spend";
    }
  };

  const getSpendTypeDescription = () => {
    switch (spendType) {
      case "accepted":
        return "Actual spend from accepted stories based on team velocity and story points completed.";
      case "forecasted":
        return "Projected spend based on planned work and estimated team capacity.";
      case "estimated":
        return "Initial budget estimate for this epic based on preliminary story points.";
      default:
        return "";
    }
  };

  const filteredStories = selectedPI === "all"
    ? stories
    : stories.filter((s) => s.teamSprintName?.includes(selectedPI));

  const filteredTotalSpend = filteredStories.reduce((sum, story) => sum + story.spend, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div>
            <DialogTitle>{getSpendTypeLabel()} - {epicTitle}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {getSpendTypeDescription()}
            </p>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filter by Program Increment:</span>
            <Select value={selectedPI} onValueChange={setSelectedPI}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PIs</SelectItem>
                {programIncrements.map((pi) => (
                  <SelectItem key={pi.id} value={pi.name}>
                    {pi.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Spend</div>
            <div className="text-2xl font-bold">
              ${filteredTotalSpend.toLocaleString()}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 p-3 bg-muted font-semibold text-sm sticky top-0">
              <div className="col-span-1">ID</div>
              <div className="col-span-3">Story Title</div>
              <div className="col-span-2">Team</div>
              <div className="col-span-2">Sprint</div>
              <div className="col-span-1 text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-end gap-1 cursor-help">
                        $/Point
                        <Info className="h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Team's spend per story point</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="col-span-1 text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-end gap-1 cursor-help">
                        Estimate
                        <Info className="h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Story point estimate</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="col-span-2 text-right">Total Spend</div>
            </div>

            {/* Story Rows */}
            {filteredStories.map((story) => (
              <div
                key={story.id}
                className="grid grid-cols-12 gap-4 p-3 border-b hover:bg-accent/50 text-sm items-center"
              >
                <div className="col-span-1 text-muted-foreground">
                  #{story.numericId}
                </div>
                <div className="col-span-3 font-medium">
                  {story.title}
                </div>
                <div className="col-span-2">
                  <Badge variant="secondary" className="text-xs">
                    {story.team || "None"}
                  </Badge>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground truncate">
                  {story.teamSprintName || "-"}
                </div>
                <div className="col-span-1 text-right">
                  ${story.teamSpendPerPoint.toLocaleString()}
                </div>
                <div className="col-span-1 text-right font-medium">
                  {story.storyEstimate}
                </div>
                <div className="col-span-2 text-right font-semibold">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">
                          ${story.spend.toLocaleString()}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {story.storyEstimate} pts × ${story.teamSpendPerPoint}/pt = ${story.spend}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}

            {filteredStories.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No stories found for the selected filter.
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
