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
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#F1F5F9', minWidth: 50 }} />
        {showNumbers && <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>—</span>}
      </div>
    );
  }
  const doneP = (done / total) * 100;
  const ipP = (inProgress / total) * 100;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 120 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#F1F5F9', overflow: 'hidden', display: 'flex', minWidth: 50 }}>
        {doneP > 0 && <div style={{ width: `${doneP}%`, background: '#22C55E' }} />}
        {ipP > 0 && <div style={{ width: `${ipP}%`, background: '#3B82F6' }} />}
      </div>
      {showNumbers && (
        <span style={{ fontSize: 10, color: '#64748B', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
          {done}/{inProgress}/{todo}
        </span>
      )}
    </div>
  );
}
