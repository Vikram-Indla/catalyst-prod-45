/**
 * Enterprise Defect Status Badge
 * Supports 16 workflow statuses with Catalyst V5 compliant colors
 */

import { cn } from "@/lib/utils";
import { getStatusById, getStatusColor, WORKFLOW_COLORS, mapLegacyStatus } from "@/config/defectWorkflow";

interface DefectStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export function DefectStatusBadge({ status, size = 'md', showDot = false }: DefectStatusBadgeProps) {
  // Map legacy statuses to new workflow statuses
  const mappedStatus = mapLegacyStatus(status);
  const statusConfig = getStatusById(mappedStatus);
  const colors = getStatusColor(mappedStatus);
  
  // Fallback for unknown statuses
  if (!statusConfig) {
    return (
      <span className={cn(
        "inline-flex items-center rounded font-medium",
        "bg-gray-100 text-gray-600",
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      )}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </span>
    );
  }
  
  const sizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-[10px]' 
    : 'px-2 py-0.5 text-xs';
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded font-medium",
      colors.bg,
      colors.text,
      sizeClasses
    )}>
      {showDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full", colors.solid)} />
      )}
      {statusConfig.name}
    </span>
  );
}
