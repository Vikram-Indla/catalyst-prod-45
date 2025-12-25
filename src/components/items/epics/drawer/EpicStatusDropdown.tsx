/**
 * EpicStatusDropdown - Epic Status Control with Clickable Dropdown
 * Catalyst Design System - Matches BusinessRequestDrawer StatusDropdown pattern
 */

import { ChevronDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Epic status options with Catalyst brand colors
export const EPIC_STATUS_OPTIONS = [
  { value: 'new', label: 'New', colorType: 'olive' as const },
  { value: 'analysis', label: 'Analysis', colorType: 'gold' as const },
  { value: 'design', label: 'Design', colorType: 'gold' as const },
  { value: 'technical_validation', label: 'Technical Validation', colorType: 'bronze' as const },
  { value: 'ready_for_implementation', label: 'Ready for Implementation', colorType: 'olive' as const },
  { value: 'in_implementation', label: 'In Implementation', colorType: 'oliveDark' as const },
  { value: 'on_hold', label: 'On Hold', colorType: 'champagne' as const },
  { value: 'done', label: 'Done', colorType: 'oliveLight' as const },
] as const;

type ColorType = 'olive' | 'oliveDark' | 'oliveLight' | 'bronze' | 'gold' | 'champagne' | 'gray';

// Catalyst Brand Colors - aligned with CSS variables in index.css
const CATALYST_COLORS = {
  olive: '#5c7c5c',
  oliveDark: '#4a6a4a',
  oliveLight: '#6b8b6b',
  bronze: '#8b7355',
  gold: '#c69c6d',
  champagne: '#d4b896',
  gray: '#737373',
};

// Get status styling based on color type - using Catalyst brand colors
const getStatusStyles = (colorType: ColorType) => {
  const styles: Record<ColorType, { bg: string; text: string; dot: string; border: string }> = {
    olive: {
      bg: `rgba(92, 124, 92, 0.12)`,
      text: CATALYST_COLORS.olive,
      dot: CATALYST_COLORS.olive,
      border: `rgba(92, 124, 92, 0.25)`,
    },
    oliveDark: {
      bg: `rgba(74, 106, 74, 0.12)`,
      text: CATALYST_COLORS.oliveDark,
      dot: CATALYST_COLORS.oliveDark,
      border: `rgba(74, 106, 74, 0.25)`,
    },
    oliveLight: {
      bg: `rgba(107, 139, 107, 0.12)`,
      text: CATALYST_COLORS.oliveLight,
      dot: CATALYST_COLORS.oliveLight,
      border: `rgba(107, 139, 107, 0.25)`,
    },
    bronze: {
      bg: `rgba(139, 115, 85, 0.12)`,
      text: CATALYST_COLORS.bronze,
      dot: CATALYST_COLORS.bronze,
      border: `rgba(139, 115, 85, 0.25)`,
    },
    gold: {
      bg: `rgba(198, 156, 109, 0.12)`,
      text: CATALYST_COLORS.gold,
      dot: CATALYST_COLORS.gold,
      border: `rgba(198, 156, 109, 0.25)`,
    },
    champagne: {
      bg: `rgba(212, 184, 150, 0.15)`,
      text: CATALYST_COLORS.champagne,
      dot: CATALYST_COLORS.champagne,
      border: `rgba(212, 184, 150, 0.3)`,
    },
    gray: {
      bg: `rgba(115, 115, 115, 0.1)`,
      text: CATALYST_COLORS.gray,
      dot: CATALYST_COLORS.gray,
      border: `rgba(115, 115, 115, 0.25)`,
    },
  };
  return styles[colorType];
};

// Get epic status info
export const getEpicStatusConfig = (value: string | null | undefined) => {
  if (!value) return EPIC_STATUS_OPTIONS[0];
  const status = EPIC_STATUS_OPTIONS.find(s => s.value === value.toLowerCase());
  return status || { value, label: value.replace(/_/g, ' '), colorType: 'olive' as const };
};

interface EpicStatusDropdownProps {
  currentStatus: string | null | undefined;
  onChange: (status: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function EpicStatusDropdown({ currentStatus, onChange, disabled = false, isLoading = false }: EpicStatusDropdownProps) {
  const currentConfig = getEpicStatusConfig(currentStatus);
  const styles = getStatusStyles(currentConfig.colorType);

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
          background: styles.bg,
          color: styles.text,
          border: `1px solid ${styles.border}`,
        }}
        aria-label={`Status: ${currentConfig.label}. Click to change.`}
      >
        {isLoading ? (
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
        {EPIC_STATUS_OPTIONS.map((status) => {
          const statusStyles = getStatusStyles(status.colorType);
          const isActive = status.value === currentStatus?.toLowerCase();

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
