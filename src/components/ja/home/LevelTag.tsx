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
    base: 'bg-[#c69c6d]/12 text-[#8b7355]',
    dark: 'dark:bg-[#c69c6d]/20 dark:text-[#d4b896]',
  },
  Portfolio: {
    base: 'bg-[#d4b896]/20 text-[#8b7355]',
    dark: 'dark:bg-[#d4b896]/15 dark:text-[#d4b896]',
  },
  Product: {
    base: 'bg-[#8b7355]/12 text-[#8b7355]',
    dark: 'dark:bg-[#8b7355]/20 dark:text-[#c4a67a]',
  },
  Release: {
    base: 'bg-[#5c7c5c]/12 text-[#5c7c5c]',
    dark: 'dark:bg-[#5c7c5c]/20 dark:text-[#8aab8a]',
  },
  Program: {
    base: 'bg-[#c69c6d]/12 text-[#c69c6d]',
    dark: 'dark:bg-[#c69c6d]/20 dark:text-[#dbb88a]',
  },
  Project: {
    base: 'bg-[#5c7c5c]/12 text-[#5c7c5c]',
    dark: 'dark:bg-[#5c7c5c]/20 dark:text-[#8aab8a]',
  },
  Planner: {
    base: 'bg-[#d4b896]/15 text-[#8b7355]',
    dark: 'dark:bg-[#d4b896]/20 dark:text-[#d4b896]',
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
