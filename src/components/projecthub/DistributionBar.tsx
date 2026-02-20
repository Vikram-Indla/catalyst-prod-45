interface DistributionBarProps {
  todo: number;
  inProgress: number;
  done: number;
  showNumbers?: boolean;
}

export function DistributionBar({ todo, inProgress, done, showNumbers = true }: DistributionBarProps) {
  const total = todo + inProgress + done;
  if (total === 0) {
    return (
      <div className="flex items-center gap-2">
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#E2E8F0' }} />
        {showNumbers && <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>0</span>}
      </div>
    );
  }
  const doneP = (done / total) * 100;
  const ipP = (inProgress / total) * 100;
  const todoP = (todo / total) * 100;

  return (
    <div className="flex items-center gap-2">
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#E2E8F0', overflow: 'hidden', display: 'flex' }}>
        {doneP > 0 && <div style={{ width: `${doneP}%`, background: '#16A34A', borderRadius: doneP === 100 ? 3 : '3px 0 0 3px' }} />}
        {ipP > 0 && <div style={{ width: `${ipP}%`, background: '#2563EB' }} />}
        {todoP > 0 && <div style={{ width: `${todoP}%`, background: '#CBD5E1' }} />}
      </div>
      {showNumbers && (
        <span style={{ fontSize: 10, color: '#64748B', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', minWidth: 60, textAlign: 'right' }}>
          {done}/{inProgress}/{todo}
        </span>
      )}
    </div>
  );
}
