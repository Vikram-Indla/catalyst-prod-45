import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number; // 0-100
  score?: number | null; // 0-1 for color determination
  height?: "sm" | "default" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({ 
  progress, 
  score, 
  height = "default", 
  showLabel = false,
  className 
}: ProgressBarProps) {
  const getColor = () => {
    if (score === null || score === undefined) return "bg-brand-gold";
    if (score >= 0.7) return "bg-success";
    if (score >= 0.4) return "bg-warning";
    return "bg-destructive";
  };

  const heightClass = height === "sm" ? "h-1.5" : height === "lg" ? "h-3" : "h-2";
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex-1 bg-muted rounded-full overflow-hidden", heightClass)}>
        <div 
          className={cn("h-full transition-all duration-300", getColor())}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-right">
          {clampedProgress.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
