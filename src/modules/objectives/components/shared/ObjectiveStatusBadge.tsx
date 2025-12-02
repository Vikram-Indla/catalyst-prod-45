import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ObjectiveStatus } from "../../types/objective.types";

const STATUS_CONFIG: Record<ObjectiveStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", className: "bg-brand-gold/20 text-brand-gold border-brand-gold/30" },
  on_track: { label: "On Track", className: "bg-success/20 text-success border-success/30" },
  at_risk: { label: "At Risk", className: "bg-warning/20 text-warning border-warning/30" },
  off_track: { label: "Off Track", className: "bg-destructive/20 text-destructive border-destructive/30" },
  paused: { label: "Paused", className: "bg-muted text-muted-foreground" },
  completed: { label: "Completed", className: "bg-success text-success-foreground" },
  canceled: { label: "Canceled", className: "bg-muted text-muted-foreground line-through" },
  missed: { label: "Missed", className: "bg-destructive/80 text-destructive-foreground" },
};

interface ObjectiveStatusBadgeProps {
  status: ObjectiveStatus;
  size?: "sm" | "default";
  className?: string;
}

export function ObjectiveStatusBadge({ status, size = "default", className }: ObjectiveStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.className,
        size === "sm" && "text-xs px-2 py-0.5",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
