import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

function getProgressClasses(value: number): string {
  if (value >= 70) return 'bg-green-500';
  if (value >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const barClass = getProgressClasses(value);
  
  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel && (
        <div className="flex justify-between text-[13px]">
          <span className="text-gray-500 dark:text-gray-400">Progress</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{value}%</span>
        </div>
      )}
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-300", barClass)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
