/**
 * Collapsible Section - Matches design exactly
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CollapsibleSectionProps {
  title: string;
  count: number;
  actionLabel?: string;
  onAction?: () => void;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  count,
  actionLabel = '+ Add',
  onAction,
  defaultExpanded = true,
  children,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className="rounded-lg border bg-white"
      style={{ borderColor: '#e5e5e5' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4"
        style={{ height: '48px' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="font-semibold text-neutral-700 uppercase tracking-wide"
            style={{ fontSize: '11px', letterSpacing: '0.5px' }}
          >
            {title}
          </span>
          <Badge
            className="px-1.5 py-0 text-[10px] font-medium rounded-full bg-[#0d9488]/10 text-[#0d9488]"
            style={{ minWidth: '20px', textAlign: 'center' }}
          >
            {count}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAction}
            className="text-[#2563eb] hover:text-[#1d4ed8] text-sm font-medium"
          >
            {actionLabel}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'p-1 rounded hover:bg-neutral-100 text-neutral-400 transition-transform',
              !expanded && 'rotate-180'
            )}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default CollapsibleSection;
