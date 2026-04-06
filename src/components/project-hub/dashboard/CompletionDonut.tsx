import { useEffect, useState } from 'react';

interface CompletionDonutProps {
  percent: number;
  done: number;
  total: number;
}

export function CompletionDonut({ percent, done, total }: CompletionDonutProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPercent / 100) * circumference;

  useEffect(() => {
    const t = setTimeout(() => setAnimatedPercent(percent), 100);
    return () => clearTimeout(t);
  }, [percent]);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--bd-default, #E2E8F0)" strokeWidth={12} />
        <circle
          cx="60" cy="60" r={radius} fill="none" stroke="#0D9488" strokeWidth={12}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 800ms ease' }}
        />
        <text x="60" y="54" textAnchor="middle" style={{ fontSize: 24, fontWeight: 700, fill: 'var(--fg-1)', fontFamily: "'Sora', sans-serif" }}>
          {percent}%
        </text>
        <text x="60" y="72" textAnchor="middle" style={{ fontSize: 12, fill: 'var(--fg-3)', fontFamily: "'Inter', sans-serif" }}>
          complete
        </text>
      </svg>
      <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{done} of {total} items done</span>
    </div>
  );
}
