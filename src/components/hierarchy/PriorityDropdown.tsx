/**
 * PriorityDropdown — Inline priority change with bar visualization
 */
import { useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

const PRIORITIES = [
  { name: 'Critical', level: 4 },
  { name: 'High', level: 3 },
  { name: 'Medium', level: 2 },
  { name: 'Low', level: 1 },
  { name: 'None', level: 0 },
];

function PriorityBarsInline({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ width: 10, height: 4, borderRadius: 1, background: i <= level ? '#64748B' : '#E2E8F0' }} />
      ))}
    </div>
  );
}

interface PriorityDropdownProps {
  currentPriority: string | undefined;
  onSelect: (priority: string) => void;
  onClose: () => void;
}

export function PriorityDropdown({ currentPriority, onSelect, onClose }: PriorityDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler); };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 180,
        background: 'var(--bg-app, #FFFFFF)', border: '1px solid var(--divider, #E2E8F0)', borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 9999, overflow: 'hidden',
      }}
    >
      {PRIORITIES.map((p) => {
        const isCurrent = currentPriority?.toLowerCase() === p.name.toLowerCase();
        return (
          <div
            key={p.name}
            onClick={() => { onSelect(p.name); onClose(); }}
            style={{
              height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', background: isCurrent ? '#F8FAFC' : undefined,
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
            onMouseLeave={(e) => (e.currentTarget.style.background = isCurrent ? '#F8FAFC' : '')}
          >
            <PriorityBarsInline level={p.level} />
            <span style={{ fontSize: 12, color: 'var(--fg-1, #0F172A)', flex: 1 }}>{p.name}</span>
            {isCurrent && <Check size={14} color="#2563EB" />}
          </div>
        );
      })}
    </div>
  );
}
