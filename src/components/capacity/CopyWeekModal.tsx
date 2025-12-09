/**
 * Copy Week Modal
 * Following specification exactly
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Resource, CopyWeekOptions } from '@/types/capacity';
import { getWeekDateRange, calculateUtilization } from '@/lib/capacityUtils';
import { ArrowRight } from 'lucide-react';

interface CopyWeekModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromWeek: number;
  fromYear: number;
  resources: Resource[];
  onCopy: (options: CopyWeekOptions) => number;
}

export function CopyWeekModal({
  open,
  onOpenChange,
  fromWeek,
  fromYear,
  resources,
  onCopy,
}: CopyWeekModalProps) {
  const [mode, setMode] = useState<'all' | 'hard' | 'selected'>('all');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);

  // Calculate to week
  let toWeek = fromWeek + 1;
  let toYear = fromYear;
  if (toWeek > 52) {
    toWeek = 1;
    toYear++;
  }

  // Calculate stats
  const weekAllocations = resources.flatMap(r => 
    r.allocations.filter(a => a.weekNumber === fromWeek && a.year === fromYear)
  );
  const resourcesWithAllocations = new Set(weekAllocations.map(a => a.resourceId)).size;
  const totalPercentage = weekAllocations.reduce((sum, a) => sum + a.percentage, 0);

  const handleCopy = () => {
    const count = onCopy({
      mode,
      selectedResources: mode === 'selected' ? selectedResources : undefined,
    });
    onOpenChange(false);
  };

  const toggleResource = (resourceId: string) => {
    setSelectedResources(prev => 
      prev.includes(resourceId) 
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Copy to Next Week</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Week visualization */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">From</div>
              <div className="text-lg font-semibold">W{fromWeek}</div>
              <div className="text-xs text-muted-foreground">{getWeekDateRange(fromWeek, fromYear)}</div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <div className="text-sm text-muted-foreground">To</div>
              <div className="text-lg font-semibold">W{toWeek}</div>
              <div className="text-xs text-muted-foreground">{getWeekDateRange(toWeek, toYear)}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-semibold text-[#c69c6d]">{weekAllocations.length}</div>
              <div className="text-xs text-muted-foreground">Allocations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-[#c69c6d]">{resourcesWithAllocations}</div>
              <div className="text-xs text-muted-foreground">Resources</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-[#c69c6d]">{totalPercentage}%</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Options:</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'all' | 'hard' | 'selected')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">All Allocations</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hard" id="hard" />
                <Label htmlFor="hard" className="font-normal cursor-pointer">Hard Allocations Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="selected" />
                <Label htmlFor="selected" className="font-normal cursor-pointer">Selected Resources Only</Label>
              </div>
            </RadioGroup>

            {/* Resource selection when "selected" mode */}
            {mode === 'selected' && (
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {resources.filter(r => 
                  r.allocations.some(a => a.weekNumber === fromWeek && a.year === fromYear)
                ).map(resource => (
                  <div key={resource.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={resource.id}
                      checked={selectedResources.includes(resource.id)}
                      onCheckedChange={() => toggleResource(resource.id)}
                    />
                    <Label htmlFor={resource.id} className="font-normal cursor-pointer text-sm">
                      {resource.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleCopy}
            className="bg-[#c69c6d] hover:bg-[#8b7355] text-white"
            disabled={mode === 'selected' && selectedResources.length === 0}
          >
            Copy to W{toWeek}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
