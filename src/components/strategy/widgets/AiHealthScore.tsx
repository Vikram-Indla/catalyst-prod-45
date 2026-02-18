/**
 * AiHealthScore — Widget 7: AI health ring + recommendations
 * Row 4, span 3
 */

import { Sparkles } from 'lucide-react';
import { CircularGauge } from '../shared/CircularGauge';

const RECOMMENDATIONS = [
  'Supply Chain Q3 KRs need intervention — 2 goals below 50%',
  'Reallocate 8% budget from Workforce to Supply Chain',
  'Sustainability ESG framework at risk — escalate to sponsor',
];

export function AiHealthScore() {
  return (
    <div className="flex flex-col items-center">
      <CircularGauge value={78} size={100} strokeWidth={10} color="#7C3AED" label="/ 100" animated />

      {/* Status badge */}
      <span className="mt-2 mb-4" style={{
        fontSize: 11, fontWeight: 600, color: '#7C3AED',
        background: 'rgba(124, 58, 237, 0.1)', borderRadius: 9999, padding: '2px 10px',
      }}>
        ● Good
      </span>

      {/* Recommendations */}
      <div className="w-full space-y-2">
        {RECOMMENDATIONS.map((rec, i) => (
          <div key={i} className="flex gap-2" style={{ fontSize: 10, color: 'var(--catalyst-text-secondary)', lineHeight: 1.4 }}>
            <Sparkles size={10} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 2 }} />
            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{rec}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
