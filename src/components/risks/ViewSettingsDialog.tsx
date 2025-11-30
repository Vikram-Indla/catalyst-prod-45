// View Settings Dialog for ROAM Report
// Source: Implementation Spec Section 6.2

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChartVisibility } from "@/types/risks";

interface ViewSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chartVisibility: ChartVisibility;
  onChartVisibilityChange: (visibility: ChartVisibility) => void;
}

export function ViewSettingsDialog({
  isOpen,
  onClose,
  chartVisibility,
  onChartVisibilityChange,
}: ViewSettingsDialogProps) {
  const handleToggle = (key: keyof ChartVisibility) => {
    onChartVisibilityChange({
      ...chartVisibility,
      [key]: !chartVisibility[key],
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>View Settings</DialogTitle>
          <DialogDescription>
            Configure which charts to display on the ROAM board
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="open-closed" className="text-sm">
              Open vs. Closed Chart
            </Label>
            <Switch
              id="open-closed"
              checked={chartVisibility.openVsClosed}
              onCheckedChange={() => handleToggle('openVsClosed')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="occurrence" className="text-sm">
              Risk of Occurrence Chart
            </Label>
            <Switch
              id="occurrence"
              checked={chartVisibility.riskOfOccurrence}
              onCheckedChange={() => handleToggle('riskOfOccurrence')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="impact" className="text-sm">
              Impact of Occurrence Chart
            </Label>
            <Switch
              id="impact"
              checked={chartVisibility.impactOfOccurrence}
              onCheckedChange={() => handleToggle('impactOfOccurrence')}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
