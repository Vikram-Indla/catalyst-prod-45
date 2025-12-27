/**
 * StatusDropdown - Enterprise Status Control with Clickable Dropdown
 * Catalyst Design System - Brand-Aligned Colors (Olive, Bronze, Gold, Champagne)
 */

import { ChevronDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Process steps with Catalyst brand colors
// Uses: Olive (#5c7c5c), Bronze (#8b7355), Gold (#c69c6d), Champagne (#d4b896), Gray (#737373)
export const DRAWER_PROCESS_STEPS = [
  { value: 'new_request', label: 'New Demand', colorType: 'olive' as const },
  { value: 'in_review', label: 'Under Review', colorType: 'gold' as const },
  { value: 'analyse', label: 'Analysis', colorType: 'gold' as const },
  { value: 'approved', label: 'Approved', colorType: 'oliveDark' as const },
  { value: 'ready_to_implement', label: 'Ready to Implement', colorType: 'olive' as const },
  { value: 'implement', label: 'In Progress', colorType: 'oliveDark' as const },
  { value: 'on_hold', label: 'On Hold', colorType: 'champagne' as const },
  { value: 'closed', label: 'Completed', colorType: 'oliveLight' as const },
  { value: 'rejected', label: 'Rejected', colorType: 'gray' as const },
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
  const color = CATALYST_COLORS[colorType];
  
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
      bg: `rgba(37, 99, 235, 0.12)`,
      text: '#2563eb',
      dot: '#2563eb',
      border: `rgba(37, 99, 235, 0.25)`,
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

// Get process step info
export const getProcessStepConfig = (value: string | null | undefined) => {
  if (!value) return DRAWER_PROCESS_STEPS[0];
  const step = DRAWER_PROCESS_STEPS.find(s => s.value === value.toLowerCase());
  return step || { value, label: value.replace(/_/g, ' '), colorType: 'olive' as const };
};

interface StatusDropdownProps {
  currentStep: string | null | undefined;
  onChange: (step: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function StatusDropdown({ currentStep, onChange, disabled = false, isLoading = false }: StatusDropdownProps) {
  const currentConfig = getProcessStepConfig(currentStep);
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
        className="w-48 z-[500]"
        style={{
          background: 'var(--surface-bg, hsl(var(--background)))',
          borderColor: 'var(--border-default, hsl(var(--border)))',
        }}
      >
        {DRAWER_PROCESS_STEPS.map((step) => {
          const stepStyles = getStatusStyles(step.colorType);
          const isActive = step.value === currentStep?.toLowerCase();

          return (
            <DropdownMenuItem
              key={step.value}
              onSelect={() => onChange(step.value)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isActive && "bg-muted"
              )}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: stepStyles.dot }}
              />
              <span className="text-[13px]">{step.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
