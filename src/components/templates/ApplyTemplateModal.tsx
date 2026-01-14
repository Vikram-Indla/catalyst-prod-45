/**
 * ApplyTemplateModal Component
 * Apply template to create new cycle
 * Catalyst V5 Design System
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, 
  TestTube, 
  Clock, 
  Flag, 
  Sparkles,
  Bell,
  Loader2,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useApplyTemplate } from '@/hooks/templates';
import type { CycleTemplate, TemplateConfig, TemplateMilestone } from '@/types/template.types';
import { cn } from '@/lib/utils';

interface ApplyTemplateModalProps {
  template: CycleTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cycleId: string) => void;
}

export function ApplyTemplateModal({
  template,
  isOpen,
  onClose,
  onSuccess,
}: ApplyTemplateModalProps) {
  const config = template.config as TemplateConfig;
  const tomorrow = addDays(new Date(), 1);
  
  const [cycleName, setCycleName] = useState('');
  const [startDate, setStartDate] = useState<Date>(tomorrow);
  const [endDate, setEndDate] = useState<Date>(addDays(tomorrow, config.defaultDurationDays - 1));
  const [runSmartAssignment, setRunSmartAssignment] = useState(config.assignmentRules.method === 'smart');
  const [notifyTeam, setNotifyTeam] = useState(false);
  
  const applyTemplate = useApplyTemplate();
  
  // Initialize cycle name when template changes
  useEffect(() => {
    setCycleName(`${template.name} - ${format(tomorrow, 'MMM dd, yyyy')}`);
    setStartDate(tomorrow);
    setEndDate(addDays(tomorrow, config.defaultDurationDays - 1));
  }, [template, config.defaultDurationDays]);
  
  // Update end date when start date changes
  useEffect(() => {
    setEndDate(addDays(startDate, config.defaultDurationDays - 1));
  }, [startDate, config.defaultDurationDays]);
  
  const handleApply = async () => {
    await applyTemplate.mutateAsync({
      templateId: template.id,
      cycleName,
      startDate,
      endDate,
      options: {
        runSmartAssignment,
        notifyTeam,
      },
    });
    onSuccess(template.id);
    onClose();
  };
  
  const milestones = config.milestones as TemplateMilestone[];
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Apply Template</DialogTitle>
          <DialogDescription>
            Create a new test cycle from "{template.name}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Cycle Name */}
          <div className="space-y-2">
            <Label htmlFor="cycle-name" className="text-sm font-medium">
              Cycle Name
            </Label>
            <Input
              id="cycle-name"
              value={cycleName}
              onChange={(e) => setCycleName(e.target.value)}
              placeholder="Enter cycle name"
            />
          </div>
          
          {/* Date Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'MMM dd, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'MMM dd, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    disabled={(date) => date < startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <Separator />
          
          {/* Preview Section */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-slate-700">Preview</h4>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <TestTube className="w-4 h-4 text-[#0d9488]" />
                <span className="text-slate-600">
                  {template.matching_tests_count || 0} tests
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2563eb]" />
                <span className="text-slate-600">
                  {config.defaultDurationDays} days
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#d97706]" />
                <span className="text-slate-600">
                  {milestones.length} milestones
                </span>
              </div>
            </div>
            
            {/* Milestones preview */}
            {milestones.length > 0 && (
              <div className="pt-2">
                <div className="text-xs text-slate-500 mb-2">Milestones</div>
                <div className="flex flex-wrap gap-2">
                  {milestones.map(milestone => (
                    <Badge key={milestone.id} variant="outline" className="text-xs">
                      Day {milestone.day}: {milestone.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#2563eb]" />
                <div>
                  <div className="text-sm font-medium text-slate-700">
                    Run Smart Assignment
                  </div>
                  <div className="text-xs text-slate-500">
                    Automatically assign tests based on workload and skills
                  </div>
                </div>
              </div>
              <Switch
                checked={runSmartAssignment}
                onCheckedChange={setRunSmartAssignment}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[#d97706]" />
                <div>
                  <div className="text-sm font-medium text-slate-700">
                    Notify Team Members
                  </div>
                  <div className="text-xs text-slate-500">
                    Send notification emails to assigned testers
                  </div>
                </div>
              </div>
              <Switch
                checked={notifyTeam}
                onCheckedChange={setNotifyTeam}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!cycleName.trim() || applyTemplate.isPending}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
          >
            {applyTemplate.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Cycle'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
