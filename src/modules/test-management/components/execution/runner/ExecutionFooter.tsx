/**
 * Execution Footer - Status bar with shortcuts and stats
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import type { TestRun, StepResult } from '../../../api/types';
import { KEYBOARD_SHORTCUTS } from '../hooks/useExecutionKeyboard';

interface ExecutionFooterProps {
  run?: TestRun | null;
  steps: StepResult[];
}

export function ExecutionFooter({ run, steps }: ExecutionFooterProps) {
  // Calculate stats
  const passedCount = steps.filter(s => s.status === 'passed').length;
  const failedCount = steps.filter(s => s.status === 'failed').length;
  const blockedCount = steps.filter(s => s.status === 'blocked').length;

  return (
    <footer className="flex items-center justify-between px-5 py-2.5 bg-background border-t flex-shrink-0">
      {/* Left - Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
          Auto-save enabled
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Run #{run?.run_number || 1}
        </div>
      </div>

      {/* Center - Shortcuts */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Shortcuts:</span>
        {KEYBOARD_SHORTCUTS.slice(0, 5).map((shortcut) => (
          <span key={shortcut.key} className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted border rounded text-[10px] font-mono">
              {shortcut.key}
            </kbd>
            <span>{shortcut.action}</span>
          </span>
        ))}
      </div>

      {/* Right - Stats */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 px-2.5 py-1 bg-muted/50 rounded-md text-xs text-teal-600">
          <CheckCircle2 className="h-3 w-3" />
          {passedCount}
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 bg-muted/50 rounded-md text-xs text-destructive">
          <XCircle className="h-3 w-3" />
          {failedCount}
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 bg-muted/50 rounded-md text-xs text-orange-600">
          <AlertTriangle className="h-3 w-3" />
          {blockedCount}
        </div>
      </div>
    </footer>
  );
}
