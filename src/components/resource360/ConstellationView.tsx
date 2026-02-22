import React, { useState, useMemo } from 'react';
import { useConstellation } from '@/hooks/useResource360';

interface ConstellationViewProps {
  currentResourceId: string;
}

const ConstellationView: React.FC<ConstellationViewProps> = ({ currentResourceId }) => {
  const { data: members } = useConstellation();
  const [selected, setSelected] = useState<any>(null);

  const W = 800;
  const H = 600;
  const CX = W / 2;
  const CY = H / 2;

  const current = useMemo(() => members?.find((m: any) => m.resource_id === currentResourceId), [members, currentResourceId]);
  const others = useMemo(() => (members || []).filter((m: any) => m.resource_id !== currentResourceId), [members, currentResourceId]);

  const maxItems = Math.max(...(members || []).map((m: any) => m.total_items || 1), 1);
  const getSize = (totalItems: number) => 36 + (totalItems / maxItems) * 28;

  const truncateName = (name: string, max = 30) =>
    name && name.length > max ? name.slice(0, max) + '…' : name;

  return (
    <div style={{ padding: '20px', fontFamily: "'Inter', sans-serif", display: 'flex', gap: 20 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }} role="img" aria-label="Team constellation graph">
        {/* Connection lines */}
        {others.map((m: any, i: number) => {
          const angle = (2 * Math.PI * i) / others.length;
          const x = CX + Math.cos(angle) * 200;
          const y = CY + Math.sin(angle) * 200;
          return (
            <line key={m.resource_id} x1={CX} y1={CY} x2={x} y2={y}
              stroke="#E2E8F0" strokeWidth={1.5} strokeDasharray="4 3" />
          );
        })}

        {/* Other nodes */}
        {others.map((m: any, i: number) => {
          const angle = (2 * Math.PI * i) / others.length;
          const x = CX + Math.cos(angle) * 200;
          const y = CY + Math.sin(angle) * 200;
          const size = getSize(m.total_items);
          return (
            <g key={m.resource_id} onClick={() => setSelected(m)} style={{ cursor: 'pointer' }} tabIndex={0} role="button" aria-label={`Team member ${m.full_name}, ${m.total_items} items`}>
              <circle cx={x} cy={y} r={size / 2} fill="#2563EB" opacity={0.15} />
              <circle cx={x} cy={y} r={size / 2 - 2} fill="#FFFFFF" stroke="#2563EB" strokeWidth={1.5} />
              <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central"
                style={{ fontSize: 11, fontWeight: 700, fill: '#2563EB' }}>
                {m.initials}
              </text>
              <text x={x} y={y + size / 2 + 14} textAnchor="middle"
                style={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}>
                {truncateName(m.full_name?.split(' ')[0] || '', 12)}
              </text>
            </g>
          );
        })}

        {/* Center node */}
        {current && (
          <g tabIndex={0} aria-label={`Current resource: ${current.full_name}, ${current.total_items} items`}>
            <circle cx={CX} cy={CY} r={35} fill="#2563EB" opacity={0.1} />
            <circle cx={CX} cy={CY} r={32} fill="#2563EB" stroke="#2563EB" strokeWidth={3} />
            <circle cx={CX} cy={CY} r={35} fill="none" stroke="#FFFFFF" strokeWidth={3} />
            <circle cx={CX} cy={CY} r={38} fill="none" stroke="#2563EB" strokeWidth={2} />
            <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="central"
              style={{ fontSize: 16, fontWeight: 700, fill: '#FFFFFF' }}>
              {current.initials}
            </text>
          </g>
        )}
      </svg>

      {/* Info panel */}
      {selected && (
        <div style={{
          width: 260, background: '#FFFFFF', borderRadius: 8,
          border: '1px solid #E2E8F0', padding: 16, alignSelf: 'flex-start',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{selected.full_name}</div>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>{selected.job_role || '—'}</div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
            Vendor: <span style={{ fontWeight: 600 }}>{selected.vendor_name || '—'}</span>
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
            Total Items: <span style={{ fontWeight: 600 }}>{selected.total_items ?? 0}</span>
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
            Done: <span style={{ fontWeight: 600 }}>{selected.done_items ?? 0}</span>
          </div>
          <div style={{ fontSize: 12, color: '#475569' }}>
            Projects: <span style={{ fontWeight: 600 }}>{selected.project_count ?? 0}</span>
          </div>
          <button
            onClick={() => setSelected(null)}
            aria-label="Close info panel"
            style={{
              marginTop: 12, fontSize: 11, color: '#64748B', background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline',
            }}
          >Close</button>
        </div>
      )}
    </div>
  );
};

export default ConstellationView;
