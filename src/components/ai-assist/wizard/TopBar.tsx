import React from 'react';
import { ChevronLeft, FileText, Info, HelpCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface TopBarProps {
  draftKey: string;
  currentStepName: string;
  currentStepNumber: number;
  totalSteps: number;
  isRtl: boolean;
  onRtlChange: (rtl: boolean) => void;
  onBack: () => void;
  onOpenDrawer: () => void;
}

export function TopBar({
  draftKey,
  currentStepName,
  currentStepNumber,
  totalSteps,
  isRtl,
  onRtlChange,
  onBack,
  onOpenDrawer
}: TopBarProps) {
  return (
    <header className="h-14 bg-card border-b border-border/50 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Drafts
        </Button>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">{draftKey}</span>
        </div>

        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">Step {currentStepNumber} of {totalSteps}</strong>: {currentStepName}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border-r border-border pr-3">
          <Label htmlFor="rtl-toggle" className="text-xs text-muted-foreground">RTL</Label>
          <Switch
            id="rtl-toggle"
            checked={isRtl}
            onCheckedChange={onRtlChange}
            className="scale-90"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenDrawer}
          className="h-9 w-9"
          title="Run Details"
        >
          <Info className="h-[18px] w-[18px]" />
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9" title="Help">
          <HelpCircle className="h-[18px] w-[18px]" />
        </Button>
      </div>
    </header>
  );
}
