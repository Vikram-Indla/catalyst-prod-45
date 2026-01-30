/**
 * Styled Priority Select - TaskBoardModal Style
 * Uses Radix Select with position="popper" for proper anchoring
 */

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskPriority } from '../../../types';

// Colors from TaskBoardModal
const COLORS = {
  textPrimary: '#0f172a',
  textLight: '#94a3b8',
  surfaceCard: '#ffffff',
  surfaceHover: '#f1f5f9',
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',
  borderFocus: '#3b82f6',
  accentLight: '#dbeafe'
};

// Priority colors - Medium is Yellow per spec
const PRIORITY_COLORS: Record<string, string> = {
  'critical': '#dc2626',
  'high': '#f97316',
  'medium': '#eab308',
  'low': '#94a3b8'
};

const PRIORITIES: Array<{ value: TaskPriority; label: string }> = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

interface StyledPrioritySelectProps {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
}

export function StyledPrioritySelect({ value, onChange }: StyledPrioritySelectProps) {
  const selected = PRIORITIES.find(p => p.value === value);
  const currentColor = PRIORITY_COLORS[value] || COLORS.textLight;

  return (
    <div className="flex flex-col gap-1.5">
      {/* LABEL */}
      <span 
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: COLORS.textLight }}
      >
        Priority
      </span>

      {/* RADIX SELECT */}
      <SelectPrimitive.Root value={value} onValueChange={(val) => onChange(val as TaskPriority)}>
        <SelectPrimitive.Trigger
          className={cn(
            "flex items-center gap-2.5 px-3.5 py-2.5 w-full",
            "bg-white border rounded-[10px] cursor-pointer",
            "transition-all duration-150 outline-none",
            "hover:border-slate-300",
            "focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15",
            "data-[state=open]:border-blue-500 data-[state=open]:ring-[3px] data-[state=open]:ring-blue-500/15"
          )}
          style={{ borderColor: COLORS.borderLight }}
        >
          {/* Color dot */}
          <span 
            className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
            style={{ backgroundColor: currentColor }}
          />
          
          {/* Value */}
          <SelectPrimitive.Value>
            <span className="flex-1 text-sm font-medium text-slate-900">
              {selected?.label || 'Medium'}
            </span>
          </SelectPrimitive.Value>
          
          {/* Icon */}
          <SelectPrimitive.Icon asChild>
            <ChevronDown 
              size={16} 
              className="text-slate-400 transition-transform duration-200 data-[state=open]:rotate-180" 
            />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        {/* PORTAL + CONTENT with position="popper" */}
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            side="bottom"
            align="start"
            sideOffset={4}
            avoidCollisions={true}
            collisionPadding={{ top: 8, right: 8, bottom: 68, left: 8 }}
            className={cn(
              "bg-white border rounded-xl shadow-xl overflow-hidden",
              "min-w-[var(--radix-select-trigger-width)]",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            )}
            style={{ 
              borderColor: COLORS.borderDefault,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
              zIndex: 'var(--z-modal-popover, 500)'
            }}
          >
            <SelectPrimitive.Viewport className="p-1.5">
              {PRIORITIES.map((p) => (
                <SelectPrimitive.Item
                  key={p.value}
                  value={p.value}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer outline-none",
                    "transition-colors duration-100",
                    "data-[highlighted]:bg-slate-100",
                    "data-[state=checked]:bg-blue-50"
                  )}
                >
                  {/* Color dot */}
                  <span 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: PRIORITY_COLORS[p.value] }}
                  />
                  
                  {/* Label */}
                  <SelectPrimitive.ItemText>
                    <span className="flex-1 text-sm text-slate-900">{p.label}</span>
                  </SelectPrimitive.ItemText>
                  
                  {/* Check */}
                  <SelectPrimitive.ItemIndicator>
                    <Check size={16} className="text-blue-600" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
