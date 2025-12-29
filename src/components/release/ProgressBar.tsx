import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

function getProgressClasses(value: number): string {
  // Catalyst V5: ≥70% teal, 40-69% orange, <40% red
  if (value >= 70) return 'bg-[#0d9488]';
  if (value >= 40) return 'bg-[#d97706]';
  return 'bg-[#ef4444]';
}

export function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const barClass = getProgressClasses(value);
  
  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel && (
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-semibold text-foreground">{value}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--progress-track)' }}>
        <div 
          className={cn("h-full rounded-full transition-all duration-300", barClass)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
