/**
 * ProgressWithTooltip - Reusable progress bar with calculation explanation
 * 
 * Shows an overall progress bar that displays a tooltip on hover
 * explaining how the progress was calculated.
 */

import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, TrendingUp, Layers, Target, FileText } from 'lucide-react';
import { useProgressCalculation, ProgressEntityType, ProgressData } from '@/hooks/useProgressCalculation';
import { cn } from '@/lib/utils';

interface ProgressWithTooltipProps {
  entityType: ProgressEntityType;
  entityId: string | null;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Override with custom progress data instead of fetching */
  customData?: ProgressData;
}

const ENTITY_ICONS: Record<ProgressEntityType, React.ElementType> = {
  snapshot: Layers,
  theme: Target,
  objective: TrendingUp,
  epic: FileText,
  'key-result': TrendingUp,
};

const ENTITY_LABELS: Record<ProgressEntityType, string> = {
  snapshot: 'Snapshot',
  theme: 'Theme',
  objective: 'Objective',
  epic: 'Epic',
  'key-result': 'Key Result',
};

function getProgressColor(progress: number): string {
  if (progress >= 70) return '#0d9488'; // Teal
  if (progress >= 40) return '#2563eb'; // Blue
  return '#b45353'; // Red
}

export function ProgressWithTooltip({
  entityType,
  entityId,
  className,
  showLabel = true,
  size = 'md',
  customData,
}: ProgressWithTooltipProps) {
  const { data: fetchedData, isLoading } = useProgressCalculation(
    entityType,
    customData ? null : entityId // Don't fetch if custom data provided
  );

  const data = customData || fetchedData;
  const progress = data?.progress ?? 0;
  const progressColor = getProgressColor(progress);
  const Icon = ENTITY_ICONS[entityType];

  const sizeClasses = {
    sm: { bar: 'h-1.5', text: 'text-[10px]', label: 'text-[10px]' },
    md: { bar: 'h-2', text: 'text-[11px]', label: 'text-[11px]' },
    lg: { bar: 'h-3', text: 'text-xs', label: 'text-xs' },
  };

  const sizes = sizeClasses[size];

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className={cn('flex flex-col gap-1.5 cursor-help', className)}>
            {showLabel && (
              <div className="flex items-center justify-between">
                <span 
                  className={cn('font-medium uppercase tracking-wider', sizes.label)}
                  style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                >
                  Overall Progress
                </span>
                <div className="flex items-center gap-1">
                  <span 
                    className={cn('font-semibold tabular-nums', sizes.text)}
                    style={{ color: progressColor }}
                  >
                    {isLoading ? '...' : `${progress}%`}
                  </span>
                  <HelpCircle 
                    size={12} 
                    style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                  />
                </div>
              </div>
            )}
            <div 
              className={cn('w-full rounded-full overflow-hidden', sizes.bar)}
              style={{ backgroundColor: '#333333' }}
            >
              <div 
                className={cn('h-full rounded-full transition-all duration-500', sizes.bar)}
                style={{ 
                  width: `${progress}%`, 
                  backgroundColor: progressColor 
                }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="start"
          sideOffset={8}
          className="max-w-[280px] p-0 z-[9999] bg-popover border-border"
          style={{ 
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
          }}
        >
          <div className="p-3 space-y-2.5">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Icon 
                size={14} 
                style={{ color: progressColor }}
              />
              <span 
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}
              >
                {ENTITY_LABELS[entityType]} Progress
              </span>
            </div>

            {/* Progress Value */}
            <div className="flex items-baseline gap-2">
              <span 
                className="text-2xl font-bold tabular-nums"
                style={{ color: progressColor }}
              >
                {progress}%
              </span>
              <span 
                className="text-[10px]"
                style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
              >
                complete
              </span>
            </div>

            {/* Calculation Method */}
            <div 
              className="pt-2 border-t"
              style={{ borderColor: 'var(--border-subtle, hsl(var(--border)/0.5))' }}
            >
              <p 
                className="text-[10px] leading-relaxed"
                style={{ color: 'var(--text-secondary, hsl(var(--muted-foreground)))' }}
              >
                {data?.calculationMethod || 'Calculating...'}
              </p>
            </div>

            {/* Breakdown */}
            {data?.breakdown && data.breakdown.length > 0 && (
              <div className="space-y-1.5">
                {data.breakdown.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between text-[10px]"
                  >
                    <span style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>
                      {item.label}
                      {item.count !== undefined && (
                        <span className="ml-1 opacity-60">({item.count})</span>
                      )}
                    </span>
                    <span 
                      className="font-medium tabular-nums"
                      style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}
                    >
                      {typeof item.value === 'number' && item.label.includes('%') 
                        ? `${item.value}%` 
                        : item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
