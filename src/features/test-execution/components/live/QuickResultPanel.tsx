/**
 * Module 4C-2: Quick Result Panel
 * Fast result recording panel with keyboard shortcuts
 */

import React, { useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { StepResult } from '../../types/step-execution';

interface QuickResultPanelProps {
  onResult: (result: StepResult) => void;
  currentResult?: StepResult | null;
  isLoading?: boolean;
  disabled?: boolean;
  showKeyboardHints?: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

const resultConfig: Record<
  StepResult,
  {
    label: string;
    icon: React.ElementType;
    key: string;
    className: string;
    activeClassName: string;
  }
> = {
  passed: {
    label: 'Pass',
    icon: CheckCircle2,
    key: 'P',
    className:
      'border-green-300 hover:bg-green-50 hover:border-green-400 dark:border-green-700 dark:hover:bg-green-900/20',
    activeClassName:
      'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  failed: {
    label: 'Fail',
    icon: XCircle,
    key: 'F',
    className:
      'border-red-300 hover:bg-red-50 hover:border-red-400 dark:border-red-700 dark:hover:bg-red-900/20',
    activeClassName:
      'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
  blocked: {
    label: 'Block',
    icon: AlertTriangle,
    key: 'B',
    className:
      'border-orange-300 hover:bg-orange-50 hover:border-orange-400 dark:border-orange-700 dark:hover:bg-orange-900/20',
    activeClassName:
      'bg-orange-100 border-orange-500 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  skipped: {
    label: 'Skip',
    icon: SkipForward,
    key: 'S',
    className:
      'border-slate-300 hover:bg-slate-50 hover:border-slate-400 dark:border-slate-600 dark:hover:bg-slate-800',
    activeClassName:
      'bg-slate-100 border-slate-500 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
};

const sizeConfig = {
  sm: {
    button: 'h-9 px-3 text-sm',
    icon: 'h-4 w-4',
    gap: 'gap-2',
  },
  md: {
    button: 'h-11 px-4',
    icon: 'h-5 w-5',
    gap: 'gap-3',
  },
  lg: {
    button: 'h-14 px-6 text-lg',
    icon: 'h-6 w-6',
    gap: 'gap-4',
  },
};

export function QuickResultPanel({
  onResult,
  currentResult,
  isLoading = false,
  disabled = false,
  showKeyboardHints = true,
  size = 'md',
  layout = 'horizontal',
  className,
}: QuickResultPanelProps) {
  const sizes = sizeConfig[size];
  const results: StepResult[] = ['passed', 'failed', 'blocked', 'skipped'];

  // Keyboard shortcuts
  useEffect(() => {
    if (disabled || isLoading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      switch (key) {
        case 'P':
          e.preventDefault();
          onResult('passed');
          break;
        case 'F':
          e.preventDefault();
          onResult('failed');
          break;
        case 'B':
          e.preventDefault();
          onResult('blocked');
          break;
        case 'S':
          e.preventDefault();
          onResult('skipped');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onResult, disabled, isLoading]);

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex',
          layout === 'vertical' ? 'flex-col' : 'flex-row flex-wrap justify-center',
          sizes.gap,
          className
        )}
      >
        {results.map((result) => {
          const config = resultConfig[result];
          const Icon = config.icon;
          const isActive = currentResult === result;

          return (
            <Tooltip key={result}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => onResult(result)}
                  disabled={disabled || isLoading}
                  className={cn(
                    'flex items-center gap-2 font-medium transition-all',
                    sizes.button,
                    isActive ? config.activeClassName : config.className,
                    isLoading && 'opacity-50 cursor-wait'
                  )}
                >
                  <Icon className={sizes.icon} />
                  <span>{config.label}</span>
                  {showKeyboardHints && (
                    <kbd className="ml-1 hidden sm:inline-flex h-5 w-5 items-center justify-center rounded border bg-muted text-xs font-mono">
                      {config.key}
                    </kbd>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {config.label} this step (Press{' '}
                  <kbd className="font-mono">{config.key}</kbd>)
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
