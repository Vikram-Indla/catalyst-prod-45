/**
 * PriorityDropdown — Inline priority change with bar visualization
 */
import { useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const PRIORITIES = [
  { name: 'Critical', level: 4 },
  { name: 'High', level: 3 },
  { name: 'Medium', level: 2 },
  { name: 'Low', level: 1 },
  { name: 'None', level: 0 },
];

function PriorityBarsInline({ level }: { level: number }) {
  const { isDark } = useTheme();
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ width: 10, height: 4, borderRadius: 1, background: i <= level ? (isDark ? '#A1A1A1' : '#64748B') : (isDark ? '#292929' : '#E2E8F0') }} />
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
  const { isDark } = useTheme();
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
        background: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', borderRadius: 6,
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.30)' : '0 4px 16px rgba(0,0,0,0.10)', zIndex: 9999, overflow: 'hidden',
      }}
    >
      {PRIORITIES.map((p) => {
        const isCurrent = currentPriority?.toLowerCase() === p.name.toLowerCase();
        return (
          <div
            key={p.name}
            onClick={() => { onSelect(p.name); onClose(); }}
            style={{
              height: 50, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', background: isCurrent ? (isDark ? '#1A1A1A' : '#F8FAFC') : undefined,
              fontFamily: 'var(--ds-font-family-body)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? '#1A1A1A' : '#F8FAFC')}
            onMouseLeave={(e) => (e.currentTarget.style.background = isCurrent ? (isDark ? '#1A1A1A' : '#F8FAFC') : '')}
          >
            <PriorityBarsInline level={p.level} />
            <span style={{ fontSize: 12, color: isDark ? '#EDEDED' : '#0F172A', flex: 1 }}>{p.name}</span>
            {isCurrent && <Check size={14} color="#2563EB" />}
          </div>
        );
      })}
    </div>
  );
}
