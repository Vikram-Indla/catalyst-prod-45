import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

function getProgressColor(value: number): string {
  if (value >= 70) return '#43A047';
  if (value >= 40) return '#FDD835';
  return '#E53935';
}

export function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const color = getProgressColor(value);
  
  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel && (
        <div className="flex justify-between text-[13px]">
          <span className="text-[#8C8C8C]">Progress</span>
          <span className="font-semibold">{value}%</span>
        </div>
      )}
      <div className="h-1.5 bg-[#E8E8E8] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
