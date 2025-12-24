import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { WorkItemIcon } from '@/components/ja/icons/WorkItemIcon';
import type { IconStyle } from '@/hooks/useWorkItemIconPreferences';
import { cn } from '@/lib/utils';

interface IconStyleSelectorProps {
  workItemType: string;
  selectedStyle: IconStyle;
  onChange: (style: IconStyle) => void;
  disabled?: boolean;
}

const STYLE_OPTIONS: { value: IconStyle; label: string; description: string }[] = [
  { 
    value: 'filled', 
    label: 'Filled', 
    description: 'Bold colored backgrounds with white symbols' 
  },
  { 
    value: 'outline', 
    label: 'Outline', 
    description: 'Clean stroke-based icons, no backgrounds' 
  },
  { 
    value: 'minimal', 
    label: 'Minimal', 
    description: 'Subtle geometric shapes, modern look' 
  },
];

export function IconStyleSelector({ 
  workItemType, 
  selectedStyle, 
  onChange, 
  disabled = false 
}: IconStyleSelectorProps) {
  return (
    <RadioGroup
      value={selectedStyle}
      onValueChange={(value) => onChange(value as IconStyle)}
      className="flex gap-3"
      disabled={disabled}
    >
      {STYLE_OPTIONS.map((option) => (
        <div key={option.value} className="flex-1">
          <Label
            htmlFor={`${workItemType}-${option.value}`}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all",
              "hover:border-primary/50 hover:bg-muted/50",
              selectedStyle === option.value 
                ? "border-primary bg-primary/5" 
                : "border-border bg-card",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <RadioGroupItem
              value={option.value}
              id={`${workItemType}-${option.value}`}
              className="sr-only"
            />
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
              <WorkItemIcon 
                type={workItemType} 
                size={24} 
                forceStyle={option.value}
              />
            </div>
            <span className="text-xs font-medium text-center">
              {option.label}
            </span>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

export default IconStyleSelector;
