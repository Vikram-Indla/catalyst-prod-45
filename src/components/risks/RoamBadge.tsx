// ROAM Status Badge Component
// Source: Screenshot-Risk1, Implementation Spec Section 5.15

import { RoamStatus } from "@/types/risks";
import { ROAM_BADGE_COLORS } from "@/constants/risks";
import { cn } from "@/lib/utils";

interface RoamBadgeProps {
  status: RoamStatus;
  className?: string;
}

export function RoamBadge({ status, className }: RoamBadgeProps) {
  const colors = ROAM_BADGE_COLORS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        colors.bg,
        colors.text,
        className
      )}
    >
      {status}
    </span>
  );
}
