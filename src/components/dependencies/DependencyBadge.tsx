// =====================================================
// DEPENDENCY BADGE COMPONENT
// Shows dependency count with color coding
// =====================================================

import React from 'react';
import { Link2, AlertTriangle } from 'lucide-react';
import { useDependencyCounts } from '@/hooks/useDependencies';
import { WorkItemType } from '@/types/views';
import { cn } from '@/lib/utils';

interface DependencyBadgeProps {
  itemType: WorkItemType;
  itemId: string;
  onClick?: () => void;
  showZero?: boolean;
  size?: 'sm' | 'md';
}

export function DependencyBadge({
  itemType,
  itemId,
  onClick,
  showZero = false,
  size = 'md'
}: DependencyBadgeProps) {
  const { data: counts, isLoading } = useDependencyCounts(itemType, itemId);

  if (isLoading) return null;
  
  const total = counts?.total || 0;
  const blockedBy = counts?.blocked_by || 0;
  
  if (total === 0 && !showZero) return null;

  const isBlocked = blockedBy > 0;
  const sizeClasses = size === 'sm' 
    ? 'w-[18px] h-[18px] text-[10px]' 
    : 'w-5 h-5 text-xs';

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute -top-2 -right-2 rounded-full flex items-center justify-center',
        'font-semibold text-white border-2 border-white shadow-sm',
        'transition-transform hover:scale-110',
        sizeClasses,
        isBlocked ? 'bg-destructive' : 'bg-warning'
      )}
      title={isBlocked 
        ? `Blocked by ${blockedBy} item(s)` 
        : `${total} dependency(ies)`}
    >
      {isBlocked ? '!' : total}
    </button>
  );
}

// Inline version for use in cards
export function DependencyIndicator({
  itemType,
  itemId,
  onClick
}: {
  itemType: WorkItemType;
  itemId: string;
  onClick?: () => void;
}) {
  const { data: counts } = useDependencyCounts(itemType, itemId);

  if (!counts || counts.total === 0) return null;

  const isBlocked = counts.blocked_by > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
        isBlocked 
          ? 'bg-destructive/10 text-destructive' 
          : 'bg-warning/10 text-warning'
      )}
    >
      {isBlocked ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Link2 className="w-3 h-3" />
      )}
      <span>{counts.total}</span>
    </button>
  );
}
