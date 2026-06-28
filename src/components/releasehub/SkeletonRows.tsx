import React from 'react';

interface Props {
  count?: number;
  variant?: 'table' | 'card' | 'stat';
}

export function SkeletonRows({ count = 3, variant = 'table' }: Props) {
  if (variant === 'stat') {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] rounded-lg border border-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:border-[var(--ds-border,var(--cp-ink-1))] p-5 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] animate-pulse" />
            <div className="h-3 w-20 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse mb-3" />
            <div className="h-8 w-12 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse mb-2" />
            <div className="h-2.5 w-16 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] rounded-lg border border-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:border-[var(--ds-border,var(--cp-ink-1))] overflow-hidden">
            <div className="p-4 pl-5 space-y-3">
              <div className="flex gap-2">
                <div className="h-4 w-14 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse" />
                <div className="h-4 w-10 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse" />
              </div>
              <div className="h-5 w-3/4 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse" />
                <div className="h-5 w-16 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse" />
                <div className="h-5 w-16 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-5 w-14 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse" />
                <div className="h-5 w-14 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] rounded-lg border border-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:border-[var(--ds-border,var(--cp-ink-1))] overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 h-9 border-b border-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] dark:border-[var(--ds-border,var(--cp-ink-1))] last:border-0">
          <div className="h-3 w-20 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse" />
          <div className="h-3 w-32 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse flex-1" />
          <div className="h-4 w-16 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse" />
          <div className="h-3 w-14 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse" />
          <div className="h-3 w-10 bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
