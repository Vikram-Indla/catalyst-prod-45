/**
 * ThemeToggle — 2-state: light ↔ dark
 * Position: Nav bar right cluster, after Settings, before avatar
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeMode } from '@/providers/ThemeProvider';
import { Tooltip } from '@/components/ads';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeMode();
  const isDark = theme === 'dark';

  const handleClick = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const Icon = isDark ? Sun : Moon;
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Tooltip content={label}>
      <button
        onClick={handleClick}
        aria-label={label}
        className="flex items-center justify-center transition-colors duration-150"
        style={{
          width: 36,
          height: 36,
          color: 'var(--cp-t3, #64748B)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 6,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--cp-t1, #0F172A)';
          e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--cp-t3, #64748B)';
          e.currentTarget.style.background = 'transparent';
        }}
        title={label}
      >
        <Icon className="w-[18px] h-[18px]" />
      </button>
    </Tooltip>
  );
}
