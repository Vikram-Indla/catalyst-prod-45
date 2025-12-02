/**
 * CATALYST TESTS - Scope Lock Indicator
 * Shows lock status and provides lock/unlock actions
 */

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Lock, Unlock, ShieldAlert } from 'lucide-react';
import { lockCycleScope, unlockCycleScope } from '@/services/cycleManagementService';

interface ScopeLockIndicatorProps {
  cycleId: string;
  isLocked: boolean;
  lockedAt?: string | null;
  hasExecutions?: boolean;
  compact?: boolean;
}

export function ScopeLockIndicator({
  cycleId,
  isLocked,
  lockedAt,
  hasExecutions = false,
  compact = false,
}: ScopeLockIndicatorProps) {
  const queryClient = useQueryClient();

  const lockMutation = useMutation({
    mutationFn: () => lockCycleScope(cycleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['cycle', cycleId] });
      toast.success('Cycle scope locked');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const unlockMutation = useMutation({
    mutationFn: () => unlockCycleScope(cycleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['cycle', cycleId] });
      toast.success('Cycle scope unlocked');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (compact) {
    return (
      <Badge
        variant={isLocked ? 'default' : 'outline'}
        className={`gap-1 ${isLocked ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : ''}`}
      >
        {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        {isLocked ? 'Locked' : 'Unlocked'}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isLocked ? (
        <>
          <Badge className="gap-1 bg-orange-500/10 text-orange-500 border-orange-500/20">
            <Lock className="h-3 w-3" />
            Scope Locked
          </Badge>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Unlock className="h-3 w-3 mr-1" />
                Unlock
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-orange-500" />
                  Unlock Cycle Scope?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {hasExecutions ? (
                    <>
                      <span className="text-destructive font-medium">Warning:</span> This cycle has existing
                      executions. Unlocking will allow adding or removing test cases, which may affect
                      execution tracking and reporting.
                    </>
                  ) : (
                    'Unlocking will allow test cases to be added or removed from this cycle.'
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => unlockMutation.mutate()}
                  className="bg-brand-gold hover:bg-brand-gold/90"
                >
                  Unlock Scope
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <>
          <Badge variant="outline" className="gap-1">
            <Unlock className="h-3 w-3" />
            Scope Open
          </Badge>
          
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => lockMutation.mutate()}
            disabled={lockMutation.isPending}
          >
            <Lock className="h-3 w-3 mr-1" />
            Lock Scope
          </Button>
        </>
      )}
    </div>
  );
}
