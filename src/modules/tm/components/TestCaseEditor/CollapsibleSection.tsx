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
      className="rounded-lg border bg-[var(--bg-0)]"
      style={{ borderColor: 'var(--stroke-1)', borderRadius: '8px', boxShadow: 'var(--shadow-1)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4"
        style={{ height: '48px' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="font-semibold text-[var(--text-2)] uppercase tracking-wide"
            style={{ fontSize: '11px', letterSpacing: '0.5px' }}
          >
            {title}
          </span>
          <Badge
            className="px-1.5 py-0 font-medium rounded-full bg-brand-teal/10 text-brand-teal"
            style={{ minWidth: '20px', textAlign: 'center', fontSize: '10px' }}
          >
            {count}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAction}
            className="text-brand-primary hover:text-brand-primary-hover text-sm font-medium transition-colors"
            style={{ transitionDuration: '150ms' }}
          >
            {actionLabel}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'p-1 rounded hover:bg-[var(--row-hover)] text-[var(--text-4)] transition-all',
              !expanded && 'rotate-180'
            )}
            style={{ transitionDuration: '150ms' }}
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
