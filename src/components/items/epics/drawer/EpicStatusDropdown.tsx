/**
 * EpicStatusDropdown - Epic Status Control with Clickable Dropdown
 * Catalyst Design System - Uses database-driven epic statuses from admin panel
 */

import { ChevronDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useActiveEpicStatuses, EpicStatus } from '@/hooks/useEpicStatuses';
import { getBrandColorHex, BRAND_COLORS } from '@/components/admin/BrandColorPicker';

// Get status styling based on brand color from database
const getStatusStylesFromColor = (colorValue: string | null | undefined) => {
  const hex = getBrandColorHex(colorValue);
  // Convert hex to RGB for rgba backgrounds
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.12)`,
    text: hex,
    dot: hex,
    border: `rgba(${r}, ${g}, ${b}, 0.25)`,
  };
};

// Centralized utility to get epic status config from database statuses
export function getEpicStatusConfigFromList(
  value: string | null | undefined, 
  statuses: EpicStatus[]
): { value: string; label: string; color: string | null } {
  if (!value) {
    const firstStatus = statuses[0];
    return firstStatus 
      ? { value: firstStatus.value, label: firstStatus.label, color: firstStatus.color }
      : { value: 'proposed', label: 'New Epic', color: 'info' };
  }
  
  const normalized = value.toLowerCase();
  const status = statuses.find(s => s.value.toLowerCase() === normalized);
  
  if (status) {
    return { value: status.value, label: status.label, color: status.color };
  }
  
  // Fallback for unknown values - display formatted value
  return { 
    value, 
    label: value.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), 
    color: 'neutral' 
  };
}

// Legacy compatibility: Synchronous getEpicStatusConfig for use without React Query
// This uses a cached fallback - for real-time data, use useEpicStatusConfig hook instead
let cachedStatuses: EpicStatus[] = [];

export const getEpicStatusConfig = (value: string | null | undefined) => {
  return getEpicStatusConfigFromList(value, cachedStatuses);
};

// Hook to get epic status config - preferred method
export function useEpicStatusConfig(value: string | null | undefined) {
  const { data: statuses = [] } = useActiveEpicStatuses();
  
  // Update cache for legacy fallback
  if (statuses.length > 0) {
    cachedStatuses = statuses;
  }
  
  return getEpicStatusConfigFromList(value, statuses);
}

// Get styles for rendering a status badge/pill
export function getEpicStatusStyles(colorValue: string | null | undefined) {
  return getStatusStylesFromColor(colorValue);
}

// For backwards compatibility - EPIC_STATUS_OPTIONS will be deprecated
// Use useActiveEpicStatuses() instead
export const EPIC_STATUS_OPTIONS: { value: string; label: string; colorType: string }[] = [];

interface EpicStatusDropdownProps {
  currentStatus: string | null | undefined;
  onChange: (status: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function EpicStatusDropdown({ currentStatus, onChange, disabled = false, isLoading = false }: EpicStatusDropdownProps) {
  const { data: statuses = [], isLoading: isLoadingStatuses } = useActiveEpicStatuses();
  
  // Update cache for legacy fallback
  if (statuses.length > 0) {
    cachedStatuses = statuses;
  }
  
  const currentConfig = getEpicStatusConfigFromList(currentStatus, statuses);
  const styles = getStatusStylesFromColor(currentConfig.color);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled || isLoading || isLoadingStatuses}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
          "text-[11px] font-semibold uppercase tracking-wide",
          "transition-all cursor-pointer",
          "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{
          background: styles.bg,
          color: styles.text,
          border: `1px solid ${styles.border}`,
        }}
        aria-label={`Status: ${currentConfig.label}. Click to change.`}
      >
        {isLoading || isLoadingStatuses ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: styles.dot }}
          />
        )}
        <span>{currentConfig.label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-52 z-[500]"
        style={{
          background: 'var(--surface-bg, hsl(var(--background)))',
          borderColor: 'var(--border-default, hsl(var(--border)))',
        }}
      >
        {statuses.map((status) => {
          const statusStyles = getStatusStylesFromColor(status.color);
          const isActive = status.value.toLowerCase() === currentStatus?.toLowerCase();

          return (
            <DropdownMenuItem
              key={status.id}
              onSelect={() => onChange(status.value)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isActive && "bg-muted"
              )}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: statusStyles.dot }}
              />
              <span className="text-[13px]">{status.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
