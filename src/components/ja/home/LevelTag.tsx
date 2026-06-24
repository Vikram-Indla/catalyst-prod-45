// src/components/ja/home/LevelTag.tsx
// Styled level tags using Catalyst brand colors

import { cn } from '@/lib/utils';
import type { HomeLevel } from './WorkGridRow';

interface LevelTagProps {
  level: HomeLevel | string;
  className?: string;
}

// Catalyst brand color palette for levels
const LEVEL_STYLES: Record<string, { base: string; dark: string }> = {
  Enterprise: {
    base: 'bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563eb))]/12 text-[var(--ds-background-brand-bold-hovered,#1d4ed8)]',
    dark: 'dark:bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563eb))]/20 dark:text-[var(--ds-text-brand,#60a5fa)]',
  },
  Portfolio: {
    base: 'bg-[var(--ds-chart-teal-bold, #0d9488)]/12 text-[var(--ds-chart-teal-bolder, #0f766e)]',
    dark: 'dark:bg-[var(--ds-chart-teal-bold, #0d9488)]/20 dark:text-[var(--ds-background-success, #DCFFF1)]',
  },
  Product: {
    base: 'bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563eb))]/12 text-[var(--ds-background-brand-bold-hovered,#1d4ed8)]',
    dark: 'dark:bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563eb))]/20 dark:text-[var(--ds-text-brand,#60a5fa)]',
  },
  Release: {
    base: 'bg-[var(--ds-chart-teal-bold, #0d9488)]/12 text-[var(--ds-chart-teal-bolder, #0f766e)]',
    dark: 'dark:bg-[var(--ds-chart-teal-bold, #0d9488)]/20 dark:text-[var(--ds-background-success, #DCFFF1)]',
  },
  Program: {
    base: 'bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563eb))]/12 text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563eb))]',
    dark: 'dark:bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563eb))]/20 dark:text-[var(--ds-text-brand,#60a5fa)]',
  },
  Project: {
    base: 'bg-[var(--ds-chart-teal-bold, #0d9488)]/12 text-[var(--ds-chart-teal-bolder, #0f766e)]',
    dark: 'dark:bg-[var(--ds-chart-teal-bold, #0d9488)]/20 dark:text-[var(--ds-background-success, #DCFFF1)]',
  },
  Planner: {
    base: 'bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563eb))]/12 text-[var(--ds-background-brand-bold-hovered,#1d4ed8)]',
    dark: 'dark:bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563eb))]/20 dark:text-[var(--ds-text-brand,#60a5fa)]',
  },
};

// Default fallback for unknown levels
const DEFAULT_STYLE = {
  base: 'bg-muted/50 text-muted-foreground',
  dark: 'dark:bg-muted/30 dark:text-muted-foreground',
};

export function LevelTag({ level, className }: LevelTagProps) {
  const styles = LEVEL_STYLES[level] || DEFAULT_STYLE;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5",
        "text-xs font-medium rounded",
        "transition-colors",
        styles.base,
        styles.dark,
        className
      )}
    >
      {level}
    </span>
  );
}
