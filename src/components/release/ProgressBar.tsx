import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

function getProgressClasses(value: number): string {
  if (value >= 70) return 'bg-success';
  if (value >= 40) return 'bg-warning';
  return 'bg-danger';
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
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-300", barClass)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
