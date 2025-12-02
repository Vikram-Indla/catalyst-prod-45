import { cn } from "@/lib/utils";

interface ObjectiveScoreBadgeProps {
  score: number | null;
  size?: "sm" | "default";
  className?: string;
}

export function ObjectiveScoreBadge({ score, size = "default", className }: ObjectiveScoreBadgeProps) {
  const getColor = () => {
    if (score === null || score === undefined) return "bg-muted text-muted-foreground";
    if (score >= 0.7) return "bg-success text-success-foreground";
    if (score >= 0.4) return "bg-warning text-warning-foreground";
    return "bg-destructive text-destructive-foreground";
  };

  const display = score === null || score === undefined ? "N/A" : (score * 100).toFixed(0) + "%";

  return (
    <span 
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium",
        getColor(),
        size === "sm" ? "h-5 w-12 text-xs" : "h-6 w-14 text-sm",
        className
      )}
    >
      {display}
    </span>
  );
}
