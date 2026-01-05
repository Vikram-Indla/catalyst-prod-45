/**
 * Preconditions Bar - Displays and verifies test preconditions
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Shield, Check } from 'lucide-react';

interface PreconditionsBarProps {
  preconditions: string;
  verified: boolean;
  onVerify: () => void;
}

export function PreconditionsBar({ preconditions, verified, onVerify }: PreconditionsBarProps) {
  // Parse preconditions - split by common delimiters
  const items = preconditions.split(/[•\n,;]/).map(s => s.trim()).filter(Boolean);
  const displayText = items.length > 1 ? items.join(' • ') : preconditions;

  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
      <Shield className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
        Preconditions
      </span>
      <span className="text-xs text-muted-foreground flex-1">
        {displayText}
      </span>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "h-7 px-2.5 text-[11px] font-medium gap-1 transition-colors",
          verified
            ? "bg-teal-100 border-teal-300 text-teal-700 hover:bg-teal-200"
            : "bg-background border-primary/20 text-primary hover:bg-primary/10"
        )}
        onClick={onVerify}
        disabled={verified}
      >
        <Check className="h-3 w-3" />
        {verified ? 'Verified' : 'Verify'}
      </Button>
    </div>
  );
}
