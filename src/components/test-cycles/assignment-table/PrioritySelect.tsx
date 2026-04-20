/**
 * Priority Select - Inline priority editor
 */

import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CATALYST_V5, TEST_PRIORITY_COLORS } from '@/lib/catalyst-colors';
import type { TestPriority } from '@/types/assignment-table.types';

interface PrioritySelectProps {
  value: TestPriority;
  onChange: (value: TestPriority) => void;
}

const PRIORITY_ORDER: TestPriority[] = ['critical', 'high', 'medium', 'low'];

const PRIORITY_APPEARANCE: Record<TestPriority, LozengeAppearance> = {
  critical: 'removed',
  high: 'moved',
  medium: 'default',
  low: 'default',
};

export function PrioritySelect({ value, onChange }: PrioritySelectProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 group">
          <Lozenge appearance={PRIORITY_APPEARANCE[value]}>
            {value}
          </Lozenge>
          <ChevronDown
            className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: CATALYST_V5.slate[400] }}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-32">
        {PRIORITY_ORDER.map(priority => {
          const priorityStyle = TEST_PRIORITY_COLORS[priority];
          return (
            <DropdownMenuItem 
              key={priority} 
              onClick={() => onChange(priority)}
              className="gap-2"
            >
              <div 
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: priorityStyle?.text }}
              />
              <span className="flex-1 capitalize">{priority}</span>
              {priority === value && (
                <Check className="h-4 w-4" style={{ color: CATALYST_V5.primary }} />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
