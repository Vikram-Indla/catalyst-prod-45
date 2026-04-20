import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ObjectiveStatus } from "../../types/objective.types";

const STATUS_CONFIG: Record<string, { label: string; className: string; style?: React.CSSProperties }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  "in-progress": { 
    label: "In Progress", 
    className: "border",
    style: { background: 'rgba(38, 132, 255, 0.12)', color: 'hsl(var(--brand-primary))', borderColor: 'rgba(38, 132, 255, 0.3)' }
  },
  in_progress: { 
    label: "In Progress", 
    className: "border",
    style: { background: 'rgba(38, 132, 255, 0.12)', color: 'hsl(var(--brand-primary))', borderColor: 'rgba(38, 132, 255, 0.3)' }
  },
  "on-track": { 
    label: "On Track", 
    className: "border",
    style: { background: 'rgba(0, 135, 90, 0.12)', color: 'hsl(var(--success))', borderColor: 'rgba(0, 135, 90, 0.3)' }
  },
  on_track: { 
    label: "On Track", 
    className: "border",
    style: { background: 'rgba(0, 135, 90, 0.12)', color: 'hsl(var(--success))', borderColor: 'rgba(0, 135, 90, 0.3)' }
  },
  "at-risk": { 
    label: "At Risk", 
    className: "border",
    style: { background: 'rgba(255, 153, 31, 0.12)', color: 'hsl(var(--warning))', borderColor: 'rgba(255, 153, 31, 0.3)' }
  },
  at_risk: { 
    label: "At Risk", 
    className: "border",
    style: { background: 'rgba(255, 153, 31, 0.12)', color: 'hsl(var(--warning))', borderColor: 'rgba(255, 153, 31, 0.3)' }
  },
  "off-track": { 
    label: "Off Track", 
    className: "border",
    style: { background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))', borderColor: 'hsl(var(--destructive) / 0.3)' }
  },
  off_track: { 
    label: "Off Track", 
    className: "border",
    style: { background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))', borderColor: 'hsl(var(--destructive) / 0.3)' }
  },
  paused: { label: "Paused", className: "bg-muted text-muted-foreground" },
  completed: { 
    label: "Completed", 
    className: "border",
    style: { background: 'rgba(0, 135, 90, 0.12)', color: 'hsl(var(--success))', borderColor: 'rgba(0, 135, 90, 0.3)' }
  },
  canceled: { label: "Canceled", className: "bg-muted text-muted-foreground line-through" },
  missed: { 
    label: "Missed", 
    className: "border",
    style: { background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))', borderColor: 'hsl(var(--destructive) / 0.3)' }
  },
};

interface ObjectiveStatusBadgeProps {
  status: ObjectiveStatus;
  size?: "sm" | "default";
  className?: string;
}

export function ObjectiveStatusBadge({ status, size = "default", className }: ObjectiveStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['pending'];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.className,
        size === "sm" && "text-xs px-2 py-0.5",
        className
      )}
      style={config.style}
    >
      {config.label}
    </Badge>
  );
}
