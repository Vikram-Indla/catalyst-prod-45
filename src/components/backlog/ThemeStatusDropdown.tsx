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

interface ThemeStatusDropdownProps {
  currentStatus: string | null | undefined;
  onChange: (status: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

function colorTokenForBrandName(color: string | null | undefined): string {
  switch ((color || '').toLowerCase()) {
    case 'teal':
    case 'teal-light':
    case 'teal-dark':
      return 'hsl(var(--success))';
    case 'warning':
      return 'hsl(var(--warning))';
    case 'danger':
      return 'hsl(var(--danger))';
    case 'gray':
    case 'gray-dark':
    case 'neutral':
      return 'hsl(var(--text-secondary))';
    case 'blue':
    case 'blue-light':
    case 'blue-dark':
    default:
      return 'hsl(var(--brand-primary))';
  }
}

function isDraftLike(statusValue: string | null | undefined) {
  const v = (statusValue || '').toLowerCase();
  return v === 'draft' || v === 'proposed';
}

export function ThemeStatusDropdown({
  currentStatus,
  onChange,
  disabled = false,
  isLoading = false,
}: ThemeStatusDropdownProps) {
  const { data: statuses = [], isLoading: statusesLoading } = useActiveThemeStatuses();

  const currentConfig =
    statuses.find((s) => s.value.toLowerCase() === (currentStatus?.toLowerCase() || 'draft')) ||
    statuses[0] ||
    ({ value: 'draft', label: 'Draft', color: 'neutral' } as any);

  const baseColor = colorTokenForBrandName(currentConfig.color);

  const triggerStyle: React.CSSProperties = isDraftLike(currentConfig.value)
    ? {
        background: 'hsl(var(--surface-2))',
        border: '1px solid hsl(var(--border-default))',
        color: 'hsl(var(--text-secondary))',
      }
    : {
        background: `${baseColor.slice(0, -1)} / 0.12)`,
        border: `${baseColor.slice(0, -1)} / 0.30) 1px solid`,
        color: baseColor,
      };

  if (statusesLoading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 text-text-muted">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">Loading…</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5',
          'rounded-lg border',
          'text-[11px] font-bold uppercase tracking-[0.3px]',
          'transition-opacity cursor-pointer',
          'hover:opacity-90',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        style={triggerStyle}
        aria-label={`Status: ${currentConfig.label}. Click to change.`}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className="truncate max-w-28">{currentConfig.label}</span>
        )}
        <ChevronDown className="h-3 w-3 opacity-70 shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52 z-[500] bg-surface-0 border-border-default rounded-xl">
        {statuses.map((status) => {
          const isActive = status.value.toLowerCase() === currentStatus?.toLowerCase();
          const dotColor = colorTokenForBrandName(status.color);

          return (
            <DropdownMenuItem
              key={status.value}
              onSelect={() => onChange(status.value)}
              className={cn('flex items-center gap-2 cursor-pointer', isActive && 'bg-surface-2')}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
              <span className="text-[13px] text-text-primary">{status.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
