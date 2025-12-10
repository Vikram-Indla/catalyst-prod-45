import { Building2, Briefcase, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ObjectiveTier } from "../../types/objective.types";

// Only Portfolio and Program tiers are supported
const TIER_CONFIG: Record<ObjectiveTier, { icon: typeof Building2; color: string; label: string }> = {
  portfolio: { icon: Building2, color: "text-brand-gold", label: "Portfolio" },
  program: { icon: Briefcase, color: "text-primary", label: "Program" },
};

interface ObjectiveTierIconProps {
  tier: ObjectiveTier;
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ObjectiveTierIcon({ tier, size = "default", showLabel = false, className }: ObjectiveTierIconProps) {
  // Fallback for any legacy tiers
  const safeTier: ObjectiveTier = tier === 'portfolio' || tier === 'program' ? tier : 'program';
  const config = TIER_CONFIG[safeTier];
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
