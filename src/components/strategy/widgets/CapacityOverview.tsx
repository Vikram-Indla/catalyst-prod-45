/**
 * CapacityOverview — Widget 6: Capacity snapshot with gauge and status grid
 * Row 3 (snapshot), span 6
 */

import { useNavigate } from 'react-router-dom';
import { CircularGauge } from '../shared/CircularGauge';

const STATUS_CARDS = [
  { label: 'Available', value: 18, color: 'var(--catalyst-text-tertiary, #94A3B8)' },
  { label: 'Healthy', value: 142, color: '#0D9488' },
  { label: 'At Capacity', value: 64, color: '#D97706' },
  { label: 'Over-allocated', value: 23, color: '#EF4444' },
];

const CAPACITY_BAR = [
  { pct: 7.3, color: '#CBD5E1', label: 'Available' },
  { pct: 57.5, color: '#0D9488', label: 'Healthy' },
  { pct: 25.9, color: '#D97706', label: 'At Capacity' },
  { pct: 9.3, color: '#EF4444', label: 'Over' },
];

export function CapacityOverview() {
  const navigate = useNavigate();

  return (
    <div onClick={() => navigate('/planhub/capacity')} style={{ cursor: 'pointer' }}>
      {/* Gauge + Meta */}
      <div className="flex items-center gap-5 mb-4">
        <CircularGauge value={68} size={100} strokeWidth={10} color="#0D9488" label="Avg Util." animated />
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--catalyst-text-primary)' }}>247</div>
          <div style={{ fontSize: 11, color: 'var(--catalyst-text-tertiary)' }}>Team Members</div>
          <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>Current month · Feb 2026</div>
        </div>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {STATUS_CARDS.map(card => (
          <div key={card.label} className="text-center" style={{ border: '1px solid var(--catalyst-border-default, #E2E8F0)', borderRadius: 6, padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Capacity bar */}
      <div className="flex overflow-hidden mb-2" style={{ height: 20, borderRadius: 9999 }}>
        {CAPACITY_BAR.map((seg, i) => (
          <div key={i} style={{ width: `${seg.pct}%`, background: seg.color, transition: 'width 800ms ease-out' }} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3" style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>
        <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#CBD5E1' }} /> Available (0%)</span>
        <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0D9488' }} /> Healthy (1–80%)</span>
        <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706' }} /> At Capacity (81–100%)</span>
        <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} /> Over (&gt;100%)</span>
      </div>

      {/* Alerts */}
      <div className="flex flex-wrap gap-3" style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>
        <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} /> 7 Contracts ending ≤30d</span>
        <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0D9488' }} /> 12 Freeing up soon</span>
        <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} /> 23 Over-allocated</span>
      </div>
    </div>
  );
}
