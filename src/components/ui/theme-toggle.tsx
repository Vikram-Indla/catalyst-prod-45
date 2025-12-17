import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
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
            className="relative inline-flex items-center justify-center shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              padding: '2px',
              border: '1px solid var(--border-color)',
              cursor: isAdminRoute ? 'not-allowed' : 'pointer',
              opacity: isAdminRoute ? 0.4 : 1,
              background: isDark ? 'var(--accent-color)' : 'var(--surface-3)',
              transition: 'background 0.2s ease, border-color 0.2s ease',
              outline: 'none',
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
                background: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'left 0.2s ease',
              }}
            >
              {isDark ? (
                <Moon style={{ width: '12px', height: '12px', color: 'var(--accent-color)' }} />
              ) : (
                <Sun style={{ width: '12px', height: '12px', color: 'var(--brand-gold)' }} />
              )}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent 
          style={{ 
            background: 'var(--surface-2)', 
            color: 'var(--text-1)', 
            border: '1px solid var(--border-color)' 
          }}
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
