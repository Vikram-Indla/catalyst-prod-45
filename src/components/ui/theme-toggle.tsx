import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Unified focus ring class
const focusRingClass = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-1)]";

export function ThemeToggle() {
  const { theme, toggleTheme, isAdminRoute } = useTheme();
  const isDark = theme === 'dark';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleTheme}
            role="switch"
            aria-checked={isDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            disabled={isAdminRoute}
            className={cn(
              "relative inline-flex items-center shrink-0 transition-all rounded-full",
              focusRingClass,
              isAdminRoute && "opacity-40 cursor-not-allowed"
            )}
            style={{
              width: '44px',
              height: '24px',
              padding: '2px',
              border: isDark ? '1px solid hsl(var(--primary)/0.6)' : '1px solid hsl(var(--primary)/0.4)',
              cursor: isAdminRoute ? 'not-allowed' : 'pointer',
              background: isDark ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.15)',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '1px',
                left: isDark ? '21px' : '1px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: isDark ? 'hsl(var(--primary)/0.7)' : 'hsl(var(--primary))',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'left 0.2s ease',
              }}
            >
              {isDark ? (
                <Moon className="w-3 h-3 text-primary-foreground" />
              ) : (
                <Sun className="w-3 h-3 text-primary-foreground" />
              )}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent 
          className="bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-color)]"
        >
          {isAdminRoute 
            ? "Dark mode not available in Admin" 
            : isDark 
              ? "Switch to light mode" 
              : "Switch to dark mode"
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
