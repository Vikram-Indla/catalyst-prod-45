/**
 * PriorityDropdown — Inline priority change with bar visualization
 */
import { useRef, useEffect } from 'react';
import { Check } from '@/lib/atlaskit-icons';
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
        <div key={i} style={{ width: 10, height: 4, borderRadius: 1, background: i <= level ? ('var(--cp-text-tertiary, var(--cp-ink-3, var(--cp-text-secondary)))') : ('var(--cp-bg-sunken, var(--cp-border, var(--cp-bg-sunken)))') }} />
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
        background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: isDark ? '1px solid var(--ds-text)' : '1px solid var(--cp-border, var(--cp-bg-sunken))', borderRadius: 6,
        boxShadow: isDark ? '0 4px 16px var(--ds-shadow-raised, rgba(0,0,0,0.30))' : '0 4px 16px var(--ds-shadow-raised, rgba(0,0,0,0.10))', zIndex: 9999, overflow: 'hidden',
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
              cursor: 'pointer', background: isCurrent ? ('var(--cp-bg-page)') : undefined,
              fontFamily: 'var(--cp-font-body)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cp-bg-page)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = isCurrent ? ('var(--cp-bg-page)') : '')}
          >
            <PriorityBarsInline level={p.level} />
            <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1)))', flex: 1 }}>{p.name}</span>
            {isCurrent && <Check size={14} color="var(--ds-text-brand, var(--cp-workstream-catalyst-primary))" />}
          </div>
        );
      })}
    </div>
  );
}
