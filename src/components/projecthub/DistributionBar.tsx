interface DistributionBarProps {
  todo: number;
  inProgress: number;
  done: number;
  showNumbers?: boolean;
}

export function DistributionBar({ todo, inProgress, done, showNumbers = false }: DistributionBarProps) {
  const total = todo + inProgress + done;
  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div className="bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))]" style={{ flex: 1, height: 4, borderRadius: 4, minWidth: 50 }} />
        {showNumbers && <span className="text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light)))] dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary))]" style={{ fontSize: 'var(--ds-font-size-50)', fontFamily: 'var(--cp-font-mono)', whiteSpace: 'nowrap' }}>—</span>}
      </div>
    );
  }
  const doneP = (done / total) * 100;
  const ipP = (inProgress / total) * 100;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 120 }}>
      <div className="bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] dark:bg-[var(--ds-border,var(--cp-ink-1))]" style={{ flex: 1, height: 4, borderRadius: 4, overflow: 'hidden', display: 'flex', minWidth: 50 }}>
        {doneP > 0 && <div style={{ width: `${doneP}%`, background: 'var(--ds-text-success)' }} />}
        {ipP > 0 && <div style={{ width: `${ipP}%`, background: 'var(--cp-blue)' }} />}
      </div>
      {showNumbers && (
        <span className="text-[var(--ds-text-subtlest,var(--cp-ink-3, var(--cp-text-secondary)))] dark:text-[var(--ds-text-subtlest)]" style={{ fontSize: 'var(--ds-font-size-50)', fontFamily: 'var(--cp-font-mono)', whiteSpace: 'nowrap' }}>
          {done}/{inProgress}/{todo}
        </span>
      )}
    </div>
  );
}