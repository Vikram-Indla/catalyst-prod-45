import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncidentFocusWidgetProps {
  title: string;
  count: number;
  breached?: number;
  atRisk?: number;
  variant?: 'major' | 'sla' | 'default';
  route?: string;
}

export function IncidentFocusWidget({ 
  title, 
  count, 
  breached, 
  atRisk, 
  variant = 'default',
  route 
}: IncidentFocusWidgetProps) {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (variant) {
      case 'major':
        return AlertTriangle;
      case 'sla':
        return Clock;
      default:
        return AlertCircle;
    }
  };

  const Icon = getIcon();
  const hasDanger = breached && breached > 0;
  const hasWarning = atRisk && atRisk > 0;

  return (
    <div 
      className={cn(
        "p-3 rounded-lg transition-all cursor-pointer group",
        "border",
        hasDanger 
          ? "bg-[hsl(var(--destructive)/0.08)] border-[hsl(var(--destructive)/0.25)] hover:border-[hsl(var(--destructive)/0.4)]"
          : hasWarning
          ? "bg-[hsl(var(--warning)/0.08)] border-[hsl(var(--warning)/0.25)] hover:border-[hsl(var(--warning)/0.4)]"
          : "bg-[var(--surface-2)] border-[var(--border-color)] hover:border-[var(--border-accent)] hover:bg-[var(--surface-3)]"
      )}
      onClick={() => route && navigate(route)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div 
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center",
              hasDanger 
                ? "bg-[hsl(var(--destructive)/0.15)]"
                : hasWarning
                ? "bg-[hsl(var(--warning)/0.15)]"
                : "bg-[var(--surface-3)]"
            )}
          >
            <Icon 
              className={cn(
                "w-3.5 h-3.5",
                hasDanger 
                  ? "text-[hsl(var(--destructive))]"
                  : hasWarning
                  ? "text-[hsl(var(--warning))]"
                  : "text-[var(--icon-default)]"
              )} 
            />
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--text-1)]">{title}</div>
            {(breached !== undefined || atRisk !== undefined) && (
              <div className="flex items-center gap-2 mt-0.5">
                {breached !== undefined && breached > 0 && (
                  <span className="text-[10px] font-medium text-[hsl(var(--destructive))]">
                    {breached} breached
                  </span>
                )}
                {atRisk !== undefined && atRisk > 0 && (
                  <span className="text-[10px] font-medium text-[hsl(var(--warning))]">
                    {atRisk} at risk
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div 
          className={cn(
            "text-lg font-bold tabular-nums",
            hasDanger 
              ? "text-[hsl(var(--destructive))]"
              : hasWarning
              ? "text-[hsl(var(--warning))]"
              : "text-[var(--text-1)]"
          )}
        >
          {count}
        </div>
      </div>
    </div>
  );
}
