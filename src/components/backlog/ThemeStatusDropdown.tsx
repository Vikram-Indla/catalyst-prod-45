/**
 * ThemeStatusDropdown - Inline Status Control for Themes
 * Pulls statuses from theme_statuses table with real-time updates
 */

import { ChevronDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useActiveThemeStatuses } from '@/hooks/useThemeStatuses';
import { getBrandColorHex } from '@/components/admin/BrandColorPicker';

// Convert hex color to rgba for backgrounds
function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(107, 114, 128, ${alpha})`;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Get contrasting text color (light or dark)
function getContrastColor(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '#ffffff';
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  // Luminance calculation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

interface ThemeStatusDropdownProps {
  currentStatus: string | null | undefined;
  onChange: (status: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ThemeStatusDropdown({ 
  currentStatus, 
  onChange, 
  disabled = false, 
  isLoading = false 
}: ThemeStatusDropdownProps) {
  const { data: statuses = [], isLoading: statusesLoading } = useActiveThemeStatuses();
  
  // Find current status config
  const currentConfig = statuses.find(s => s.value.toLowerCase() === (currentStatus?.toLowerCase() || 'draft')) 
    || statuses[0] 
    || { value: 'draft', label: 'Draft', color: 'neutral' };
  
  const bgColor = getBrandColorHex(currentConfig.color || 'neutral');
  const textColor = getContrastColor(bgColor);
  
  if (statusesLoading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-[11px] text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
          "text-[11px] font-semibold uppercase tracking-wide",
          "transition-all cursor-pointer",
          "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{
          backgroundColor: bgColor,
          color: textColor,
        }}
        aria-label={`Status: ${currentConfig.label}. Click to change.`}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className="truncate max-w-24">{currentConfig.label}</span>
        )}
        <ChevronDown className="h-3 w-3 opacity-70 shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-48 z-[500] bg-background border-border"
      >
        {statuses.map((status) => {
          const statusBg = getBrandColorHex(status.color || 'neutral');
          const isActive = status.value.toLowerCase() === currentStatus?.toLowerCase();

          return (
            <DropdownMenuItem
              key={status.value}
              onSelect={() => onChange(status.value)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isActive && "bg-muted"
              )}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: statusBg }}
              />
              <span className="text-[13px]">{status.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
