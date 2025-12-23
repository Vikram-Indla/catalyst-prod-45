/**
 * StatusDropdown - Enterprise Status Control with Clickable Dropdown
 * Catalyst Design System - Golden Hour Palette
 */

import { ChevronDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Process steps with semantic colors from Catalyst palette
export const DRAWER_PROCESS_STEPS = [
  { value: 'new_request', label: 'New Demand', colorType: 'olive' as const },
  { value: 'new_demand', label: 'New Demand', colorType: 'olive' as const },
  { value: 'in_review', label: 'Under Review', colorType: 'warning' as const },
  { value: 'analyse', label: 'Analysis', colorType: 'warning' as const },
  { value: 'approved', label: 'Approved', colorType: 'info' as const },
  { value: 'ready_to_implement', label: 'Ready to Implement', colorType: 'info' as const },
  { value: 'implement', label: 'In Progress', colorType: 'info' as const },
  { value: 'on_hold', label: 'On Hold', colorType: 'bronze' as const },
  { value: 'closed', label: 'Completed', colorType: 'success' as const },
  { value: 'rejected', label: 'Rejected', colorType: 'danger' as const },
] as const;

type ColorType = 'olive' | 'warning' | 'info' | 'success' | 'danger' | 'bronze';

// Get status styling based on color type
const getStatusStyles = (colorType: ColorType) => {
  const styles: Record<ColorType, { bg: string; text: string; dot: string; border: string }> = {
    olive: {
      bg: 'rgba(92, 124, 92, 0.12)',
      text: 'hsl(var(--secondary-olive))',
      dot: 'hsl(var(--secondary-olive))',
      border: 'rgba(92, 124, 92, 0.25)',
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.1)',
      text: '#b45309',
      dot: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.25)',
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.1)',
      text: '#1d4ed8',
      dot: '#3b82f6',
      border: 'rgba(59, 130, 246, 0.25)',
    },
    success: {
      bg: 'rgba(34, 197, 94, 0.1)',
      text: '#15803d',
      dot: '#22c55e',
      border: 'rgba(34, 197, 94, 0.25)',
    },
    danger: {
      bg: 'rgba(239, 68, 68, 0.1)',
      text: '#b91c1c',
      dot: '#ef4444',
      border: 'rgba(239, 68, 68, 0.25)',
    },
    bronze: {
      bg: 'rgba(139, 115, 85, 0.15)',
      text: 'hsl(var(--secondary-bronze))',
      dot: 'hsl(var(--secondary-bronze))',
      border: 'rgba(139, 115, 85, 0.25)',
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
