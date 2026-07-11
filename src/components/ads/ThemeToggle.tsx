/**
 * ThemeToggle — 2-state light ↔ dark switcher.
 *
 * Mounted in the CatalystHeader right cluster, left of NotificationsPanel.
 * Shares state with ProfileMenu's Theme submenu via useThemeMode() — both
 * call setTheme on the same context, so they stay in sync.
 *
 * Colours come from the bridge tokens (token('color.text.subtle', 'var(--ds-text-subtlest)') etc.) —
 * no hex literals (CLAUDE.md ADS wrapper contract rule 5).
 *
 * Apr 28, 2026 — moved here from src/components/ui/ThemeToggle.tsx to
 * comply with the ADS-only import rule (CLAUDE.md §20.2). Public name
 * unchanged; consumers update the import path only.
 */

import React from 'react';
import { Sun, Moon } from '@/lib/atlaskit-icons';
import { useThemeMode } from '@/providers/ThemeProvider';
import { Tooltip } from '@/components/ads/Tooltip';
import { token } from '@atlaskit/tokens';

interface ThemeToggleProps {
  /** Optional testId forwarded to the toggle button for Playwright. */
  testId?: string;
}

export function ThemeToggle({ testId }: ThemeToggleProps = {}) {
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
        type="button"
        onClick={handleClick}
        aria-label={label}
        aria-pressed={isDark}
        data-testid={testId ?? 'catalyst-theme-toggle'}
        className="flex items-center justify-center transition-colors duration-150"
        style={{
          width: 36,
          height: 36,
          color: token('color.text.subtle', 'var(--ds-icon-subtle)'),
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 6,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = token('color.text', 'var(--cp-ink-1, var(--cp-ink-1))');
          e.currentTarget.style.background = token('color.background.neutral.hovered', 'var(--ds-shadow-raised)');
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = token('color.text.subtle', 'var(--ds-icon-subtle)');
          e.currentTarget.style.background = 'transparent';
        }}
        onFocus={(e) => {
          e.currentTarget.style.color = token('color.text', 'var(--cp-ink-1, var(--cp-ink-1))');
        }}
        onBlur={(e) => {
          e.currentTarget.style.color = token('color.text.subtle', 'var(--ds-icon-subtle)');
        }}
        title={label}
      >
        <Icon className="w-[18px] h-[18px]" />
      </button>
    </Tooltip>
  );
}
