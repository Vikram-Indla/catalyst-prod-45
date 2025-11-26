import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface ForecastFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForecastFiltersDialog({ open, onOpenChange }: ForecastFiltersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply Filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* TODO (needs confirmation): Exact filter options from screenshots */}
          <div className="space-y-2">
            <Label>Process Steps</Label>
            <div className="text-sm text-muted-foreground">
              Coming soon - filter by process step
            </div>
          </div>

          <div className="space-y-2">
            <Label>Themes</Label>
            <div className="text-sm text-muted-foreground">
              Coming soon - filter by strategic theme
            </div>
          </div>

          <div className="space-y-2">
            <Label>Teams</Label>
            <div className="text-sm text-muted-foreground">
              Coming soon - filter by team
            </div>
          </div>

          <div className="space-y-2">
            <Label>Epics</Label>
            <div className="text-sm text-muted-foreground">
              Coming soon - filter by epic
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="hide-empty" />
              <Label htmlFor="hide-empty" className="cursor-pointer">
                Hide empty rows and columns
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="standalone-features" />
              <Label htmlFor="standalone-features" className="cursor-pointer">
                Show stand-alone features
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Reset Filters
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Filter Forecast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
