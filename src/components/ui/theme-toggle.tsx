import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
              "relative w-14 h-7 rounded-full p-0.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2",
              isDark 
                ? "bg-brand-gold" 
                : "bg-[#E5E7EB]",
              isAdminRoute && "opacity-40 cursor-not-allowed"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center",
                "transition-transform duration-200 ease-out",
                isDark ? "translate-x-7" : "translate-x-0"
              )}
            >
              {isDark ? (
                <Moon className="w-3.5 h-3.5 text-brand-gold" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-brand-gold" />
              )}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
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
