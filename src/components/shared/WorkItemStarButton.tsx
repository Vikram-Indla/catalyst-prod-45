/**
 * WorkItemStarButton - Reusable star/favorite button for all work items
 * Uses user_starred_items table for persistence
 */

import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStarredItemIds, useToggleStar, StarredItemType } from '@/hooks/home/useStarredItems';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface WorkItemStarButtonProps {
  itemId: string;
  itemType: StarredItemType;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline';
  className?: string;
  showTooltip?: boolean;
  /** When true, star is always visible if starred, otherwise follows hover state */
  alwaysVisibleWhenStarred?: boolean;
  /** Parent hover state - used with alwaysVisibleWhenStarred */
  isHovered?: boolean;
}

export function WorkItemStarButton({
  itemId,
  itemType,
  size = 'sm',
  variant = 'ghost',
  className,
  showTooltip = true,
  alwaysVisibleWhenStarred = false,
  isHovered = true,
}: WorkItemStarButtonProps) {
  const { data: starredIds, isLoading } = useStarredItemIds();
  const toggleStar = useToggleStar();

  const isStarred = starredIds?.has(itemId) ?? false;
  const isPending = toggleStar.isPending;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    toggleStar.mutate({
      itemId,
      itemType,
      isCurrentlyStarred: isStarred,
    });
  };

  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-9 w-9',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // Determine visibility: always visible if starred (when alwaysVisibleWhenStarred), otherwise follow hover
  const shouldBeVisible = alwaysVisibleWhenStarred ? (isStarred || isHovered) : true;

  const button = (
    <Button
      variant={variant}
      size="icon"
      className={cn(
        sizeClasses[size],
        'transition-all duration-200',
        isStarred && 'text-[var(--sem-warning)] hover:text-[var(--sem-warning)]',
        !isStarred && 'text-muted-foreground hover:text-[var(--sem-warning)]',
        isPending && 'opacity-50 cursor-wait',
        !shouldBeVisible && 'opacity-0',
        className
      )}
      onClick={handleToggle}
      disabled={isLoading || isPending}
      aria-label={isStarred ? 'Remove from starred' : 'Add to starred'}
    >
      <Star
        className={cn(
          iconSizes[size],
          'transition-all duration-200',
          isStarred && 'fill-current'
        )}
      />
    </Button>
  );

  if (!showTooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {button}
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {isStarred ? 'Remove from starred' : 'Add to starred'}
      </TooltipContent>
    </Tooltip>
  );
}
