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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className="bg-[var(--ds-surface-sunken,#F1F5F9)] dark:bg-[var(--ds-border,#2E2E2E)]" style={{ flex: 1, height: 4, borderRadius: 4, minWidth: 50 }} />
        {showNumbers && <span className="text-[var(--ds-text-subtlest,#94A3B8)] dark:text-[var(--ds-text-subtlest,#878787)]" style={{ fontSize: 10, fontFamily: 'var(--cp-font-mono)', whiteSpace: 'nowrap' }}>—</span>}
      </div>
    );
  }
  const doneP = (done / total) * 100;
  const ipP = (inProgress / total) * 100;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 120 }}>
      <div className="bg-[var(--ds-surface-sunken,#F1F5F9)] dark:bg-[var(--ds-border,#2E2E2E)]" style={{ flex: 1, height: 4, borderRadius: 4, overflow: 'hidden', display: 'flex', minWidth: 50 }}>
        {doneP > 0 && <div style={{ width: `${doneP}%`, background: 'var(--ds-text-success, #22C55E)' }} />}
        {ipP > 0 && <div style={{ width: `${ipP}%`, background: 'var(--cp-blue)' }} />}
      </div>
      {showNumbers && (
        <span className="text-[var(--ds-text-subtlest,#64748B)] dark:text-[var(--ds-text-subtlest,#A1A1A1)]" style={{ fontSize: 10, fontFamily: 'var(--cp-font-mono)', whiteSpace: 'nowrap' }}>
          {done}/{inProgress}/{todo}
        </span>
      )}
    </div>
  );
}