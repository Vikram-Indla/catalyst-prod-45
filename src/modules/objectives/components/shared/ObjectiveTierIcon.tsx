import { Building2, Briefcase, FolderKanban, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ObjectiveTier } from "../../types/objective.types";

const TIER_CONFIG: Record<ObjectiveTier, { icon: typeof Building2; color: string; label: string }> = {
  portfolio: { icon: Building2, color: "text-brand-gold", label: "Portfolio" },
  program: { icon: Briefcase, color: "text-primary", label: "Program" },
  team: { icon: Users, color: "text-accent", label: "Team" },
};

interface ObjectiveTierIconProps {
  tier: ObjectiveTier;
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ObjectiveTierIcon({ tier, size = "default", showLabel = false, className }: ObjectiveTierIconProps) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;
  
  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  if (showLabel) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Icon className={cn(iconSize, config.color)} />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
    );
  }

  return (
    <Icon 
      className={cn(iconSize, config.color, className)} 
      aria-label={config.label}
    />
  );
}
