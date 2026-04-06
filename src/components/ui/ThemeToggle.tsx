/**
 * ThemeToggle — Cycles: light → dark → system → light
 * Position: Nav bar right cluster, after Settings, before avatar
 */

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeMode, type ThemeMode } from '@/providers/ThemeProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const CYCLE: ThemeMode[] = ['light', 'dark', 'system'];

const ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<ThemeMode, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System (auto)',
};

export function ThemeToggle() {
  const { theme, setTheme } = useThemeMode();

  const handleClick = () => {
    const currentIndex = CYCLE.indexOf(theme);
    const nextIndex = (currentIndex + 1) % CYCLE.length;
    setTheme(CYCLE[nextIndex]);
  };

  const Icon = ICONS[theme];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          aria-label={LABELS[theme]}
          className="relative flex items-center justify-center rounded-lg transition-all"
          style={{
            width: '36px',
            height: '50px',
            color: 'var(--cp-t2)',
            background: 'transparent',
            border: '1px solid var(--cp-bd)',
            cursor: 'pointer',
            borderRadius: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--cp-t1)';
            e.currentTarget.style.background = 'var(--cp-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--cp-t3)';
            e.currentTarget.style.background = 'transparent';
          }}
          title={LABELS[theme]}
        >
          <Icon className="w-5 h-5 transition-transform duration-200" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{LABELS[theme]}</p>
      </TooltipContent>
    </Tooltip>
  );
}
