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
  const hasBreach = breached && breached > 0;

  return (
    <div 
      className={cn(
        "p-2.5 rounded-lg transition-all cursor-pointer group",
        "border",
        // Champagne gray surface with gold border - no red backgrounds
        "bg-[var(--surface-champagne)] border-[var(--border-gold)]",
        "hover:border-[var(--brand-gold)] hover:bg-[var(--surface-2)]"
      )}
      onClick={() => route && navigate(route)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div 
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center",
              // Gold background for icon container
              "bg-[var(--brand-gold)]/10"
            )}
          >
            {/* Icon: red only for confirmed breach, gold otherwise */}
            <Icon 
              className={cn(
                "w-3.5 h-3.5",
                hasBreach ? "text-[hsl(var(--destructive))]" : "text-[var(--brand-gold)]"
              )} 
            />
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--text-1)]">{title}</div>
            {(breached !== undefined || atRisk !== undefined) && (
              <div className="flex items-center gap-2 mt-0.5">
                {/* Breached count in red - this is true severity */}
                {breached !== undefined && breached > 0 && (
                  <span className="text-[10px] font-medium text-[hsl(var(--destructive))]">
                    {breached} breached
                  </span>
                )}
                {/* At risk count in gold */}
                {atRisk !== undefined && atRisk > 0 && (
                  <span className="text-[10px] font-medium text-[var(--brand-gold)]">
                    {atRisk} at risk
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Count: red only for breach, olive otherwise */}
        <div 
          className={cn(
            "text-lg font-bold tabular-nums",
            hasBreach ? "text-[hsl(var(--destructive))]" : "text-[var(--brand-primary)]"
          )}
        >
          {count}
        </div>
      </div>
    </div>
  );
}
