/**
 * New Allocation Drawer
 * Following specification exactly
 */

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Resource, CapacityProject, Allocation } from '@/types/capacity';
import { X, AlertTriangle } from 'lucide-react';
import { calculateUtilization } from '@/lib/capacityUtils';

interface NewAllocationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resources: Resource[];
  projects: CapacityProject[];
  startWeek: number;
  startYear: number;
  onAdd: (allocation: Omit<Allocation, 'id' | 'createdAt'>) => void;
}

export function NewAllocationDrawer({ 
  open, 
  onOpenChange, 
  resources, 
  projects,
  startWeek,
  startYear,
  onAdd 
}: NewAllocationDrawerProps) {
  const [resourceId, setResourceId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [percentage, setPercentage] = useState(25);
  const [type, setType] = useState<'HARD' | 'SOFT'>('HARD');
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([startWeek]);

  const isValid = resourceId && projectId && percentage > 0 && selectedWeeks.length > 0;

  // Calculate if allocation will exceed 100%
  const selectedResource = resources.find(r => r.id === resourceId);
  const currentUtilization = selectedResource 
    ? calculateUtilization(selectedResource.allocations, startWeek, startYear)
    : 0;
  const willExceed = currentUtilization + percentage > 100;

  // Generate next 4 weeks for checkboxes
  const weeks = Array.from({ length: 4 }, (_, i) => {
    let week = startWeek + i;
    let year = startYear;
    if (week > 52) {
      week = week - 52;
      year++;
    }
    return { week, year };
  });

  const toggleWeek = (week: number) => {
    setSelectedWeeks(prev => 
      prev.includes(week) 
        ? prev.filter(w => w !== week)
        : [...prev, week]
    );
  };

  const handleSubmit = () => {
    if (!isValid) return;

    // Create allocation for each selected week
    selectedWeeks.forEach(weekNum => {
      let week = weekNum;
      let year = startYear;
      if (week > 52) {
        week = week - 52;
        year++;
      }
      
      onAdd({
        resourceId,
        projectId,
        weekNumber: week,
        year,
        percentage,
        type,
      });
    });

    // Reset form
    setResourceId('');
    setProjectId('');
    setPercentage(25);
    setType('HARD');
    setSelectedWeeks([startWeek]);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[400px] bg-card">
        <SheetHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>New Allocation</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <Label>Resource *</Label>
            <Select value={resourceId} onValueChange={setResourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select resource..." />
              </SelectTrigger>
              <SelectContent>
                {resources.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Project *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.filter(p => p.status === 'Active').map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentage">Allocation %</Label>
            <Input
              id="percentage"
              type="number"
              min={1}
              max={100}
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
            />
          </div>

          {willExceed && resourceId && (
            <div className="flex items-center gap-2 p-3 bg-[#c69c6d]/10 border border-[#c69c6d]/20 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-[#c69c6d] flex-shrink-0" />
              <span className="text-[#8b7355]">
                This will exceed 100% allocation ({currentUtilization}% + {percentage}% = {currentUtilization + percentage}%)
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'HARD' | 'SOFT')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HARD">Hard</SelectItem>
                <SelectItem value="SOFT">Soft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Apply to Weeks</Label>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {weeks.map(({ week, year }) => (
                <div key={`${year}-${week}`} className="flex items-center space-x-2">
                  <Checkbox
                    id={`week-${week}`}
                    checked={selectedWeeks.includes(week)}
                    onCheckedChange={() => toggleWeek(week)}
                  />
                  <Label htmlFor={`week-${week}`} className="font-normal cursor-pointer text-sm">
                    Week {week} {week === startWeek ? '(Current)' : ''}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValid}
            className="bg-[#c69c6d] hover:bg-[#8b7355] text-white"
          >
            Create Allocation
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
