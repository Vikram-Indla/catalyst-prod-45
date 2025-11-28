import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface ExtraConfigsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showUnassigned: boolean;
  onShowUnassignedChange: (value: boolean) => void;
}

export function ExtraConfigsDialog({ 
  open, 
  onOpenChange, 
  showUnassigned, 
  onShowUnassignedChange 
}: ExtraConfigsDialogProps) {
  const [showDependencies, setShowDependencies] = useState(true);
  const [showObjectives, setShowObjectives] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);
  const [highlightBlocked, setHighlightBlocked] = useState(true);
  const [showHealth, setShowHealth] = useState(true);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Board Configuration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Display Options</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-unassigned" className="text-sm font-normal">
                Show Unassigned Features
              </Label>
              <Switch
                id="show-unassigned"
                checked={showUnassigned}
                onCheckedChange={onShowUnassignedChange}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-dependencies" className="text-sm font-normal">
                Show Dependencies
              </Label>
              <Switch
                id="show-dependencies"
                checked={showDependencies}
                onCheckedChange={setShowDependencies}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-objectives" className="text-sm font-normal">
                Show Objectives
              </Label>
              <Switch
                id="show-objectives"
                checked={showObjectives}
                onCheckedChange={setShowObjectives}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-milestones" className="text-sm font-normal">
                Show Milestones
              </Label>
              <Switch
                id="show-milestones"
                checked={showMilestones}
                onCheckedChange={setShowMilestones}
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Visual Indicators</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="highlight-blocked" className="text-sm font-normal">
                Highlight Blocked Features
              </Label>
              <Switch
                id="highlight-blocked"
                checked={highlightBlocked}
                onCheckedChange={setHighlightBlocked}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-health" className="text-sm font-normal">
                Show Health Indicators
              </Label>
              <Switch
                id="show-health"
                checked={showHealth}
                onCheckedChange={setShowHealth}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
