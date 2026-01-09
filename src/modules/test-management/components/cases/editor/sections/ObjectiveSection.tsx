/**
 * Objective Section Component - Pixel Perfect Match
 */

import React, { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ObjectiveSectionProps {
  objective: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ObjectiveSection({ objective, onChange, className }: ObjectiveSectionProps) {
  return (
    <div
      className={cn('rounded-lg border bg-white', className)}
      style={{ borderColor: '#e5e5e5' }}
    >
      <Textarea
        value={objective}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe the purpose of this test case. What functionality does it verify? What is the expected behavior?"
        className="min-h-[120px] border-0 resize-none focus-visible:ring-0 text-sm"
        style={{ padding: '16px' }}
      />
      <div
        className="flex items-center justify-between px-4 py-2 border-t text-xs text-neutral-400"
        style={{ borderColor: '#e5e5e5' }}
      >
        <span>{objective.length} characters</span>
        <span>Tip: Be specific about expected behavior</span>
      </div>
    </div>
  );
}
