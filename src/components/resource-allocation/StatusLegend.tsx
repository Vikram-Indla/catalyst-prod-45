/**
 * Status Legend Component
 * Shows the legend for Committed and Forecast statuses
 * Catalyst V5 Enterprise Design System
 */

import { cn } from '@/lib/utils';

export function StatusLegend() {
  return (
    <div className="flex items-center gap-4">
      <LegendItem 
        label="Committed" 
        color="var(--ds-text-brand, var(--ds-text-brand, #2563eb))" 
        variant="solid"
      />
      <LegendItem 
        label="Forecast" 
        color="var(--ds-text-brand, var(--ds-text-brand, #2563eb))" 
        variant="striped"
      />
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-[#0d9488]" />
        <span className="text-[11px] font-medium text-muted-foreground">Available</span>
      </div>
    </div>
  );
}

interface LegendItemProps {
  label: string;
  color: string;
  variant: 'solid' | 'striped';
}

function LegendItem({ label, color, variant }: LegendItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div 
        className={cn(
          "w-6 h-3 rounded",
          variant === 'striped' && "border-2 border-dashed"
        )}
        style={{
          backgroundColor: variant === 'solid' ? color : 'transparent',
          background: variant === 'solid' 
            ? color 
            : `repeating-linear-gradient(
                45deg,
                ${color}30,
                ${color}30 2px,
                ${color}50 2px,
                ${color}50 4px
              )`,
          borderColor: variant === 'striped' ? color : undefined,
        }}
      />
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
