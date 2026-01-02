import React, { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { StatusPill } from './StatusPill';
import { useWorkflowEngine } from '../engine/useWorkflowEngine';
import type { AvailableTransition } from '../engine/types';
import { toast } from 'sonner';

interface TransitionControlsProps {
  issue: Record<string, unknown>;
  currentStatusId: string;
  onTransitionComplete?: (newStatusId: string) => void;
  variant?: 'default' | 'compact';
}

export function TransitionControls({
  issue,
  currentStatusId,
  onTransitionComplete,
  variant = 'default',
}: TransitionControlsProps) {
  const { getAvailableTransitions, executeTransition, getStatusById } = useWorkflowEngine();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const currentStatus = getStatusById(currentStatusId);
  const availableTransitions = getAvailableTransitions(currentStatusId, issue);

  // Separate primary transitions (first one) from others
  const primaryTransition = availableTransitions[0];
  const otherTransitions = availableTransitions.slice(1);

  const handleTransition = async (transition: AvailableTransition) => {
    setIsTransitioning(true);
    setIsOpen(false);

    try {
      const result = await executeTransition(transition.id, issue);

      if (result.success && result.newStatusId) {
        toast.success(`Issue transitioned to ${transition.toStatus.name}`);
        onTransitionComplete?.(result.newStatusId);
      } else {
        const errorMessages = result.errors.map(e => e.message).join(', ');
        toast.error(`Transition failed: ${errorMessages}`);
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach(w => toast.warning(w));
      }
    } catch (error) {
      toast.error('Failed to execute transition');
      console.error('Transition error:', error);
    } finally {
      setIsTransitioning(false);
    }
  };

  if (!currentStatus) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 gap-1"
            disabled={isTransitioning || availableTransitions.length === 0}
          >
            <StatusPill
              statusId={currentStatusId}
              statusName={currentStatus.name}
              category={currentStatus.category as 'todo' | 'in_progress' | 'done'}
              color={currentStatus.color}
              size="sm"
            />
            {availableTransitions.length > 0 && (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {availableTransitions.map((transition) => (
            <DropdownMenuItem
              key={transition.id}
              onClick={() => handleTransition(transition)}
              className="flex items-center gap-2"
            >
              <StatusPill
                statusId={transition.toStatus.id}
                statusName={transition.toStatus.name}
                category={transition.toStatus.category}
                color={transition.toStatus.color}
                size="sm"
              />
              <span className="text-muted-foreground text-xs">
                {transition.buttonText}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Current status display */}
      <StatusPill
        statusId={currentStatusId}
        statusName={currentStatus.name}
        category={currentStatus.category as 'todo' | 'in_progress' | 'done'}
        color={currentStatus.color}
        size="md"
      />

      {/* Primary transition button */}
      {primaryTransition && (
        <Button
          size="sm"
          onClick={() => handleTransition(primaryTransition)}
          disabled={isTransitioning}
          className="gap-1"
        >
          {isTransitioning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            primaryTransition.buttonText
          )}
        </Button>
      )}

      {/* Other transitions dropdown */}
      {otherTransitions.length > 0 && (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isTransitioning}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {otherTransitions.map((transition, index) => (
              <React.Fragment key={transition.id}>
                {index > 0 && transition.toStatus.category !== otherTransitions[index - 1].toStatus.category && (
                  <DropdownMenuSeparator />
                )}
                <DropdownMenuItem
                  onClick={() => handleTransition(transition)}
                  className="flex items-center justify-between"
                >
                  <span>{transition.buttonText}</span>
                  <StatusPill
                    statusId={transition.toStatus.id}
                    statusName={transition.toStatus.name}
                    category={transition.toStatus.category}
                    color={transition.toStatus.color}
                    size="sm"
                  />
                </DropdownMenuItem>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
