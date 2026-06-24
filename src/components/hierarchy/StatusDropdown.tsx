/**
 * StatusDropdown — 3-color status change dropdown
 */

import { useRef, useEffect } from 'react';
import { Check } from '@/lib/atlaskit-icons';
import { useTheme } from '@/hooks/useTheme';
import { getStatusStyle } from './StatusBadge';

interface StatusDropdownProps {
  currentStatus: string;
  availableStatuses: string[];
  onSelect: (status: string) => void;
  onClose: () => void;
}

export function StatusDropdown({ currentStatus, availableStatuses, onSelect, onClose }: StatusDropdownProps) {
  const { isDark } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 4,
        width: 200,
        background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
        border: isDark ? '1px solid var(--ds-background-neutral, #F1F2F4)' : '1px solid var(--cp-border, var(--cp-bg-sunken, #E2E8F0))',
        borderRadius: 6,
        boxShadow: isDark ? '0 4px 16px var(--ds-shadow-raised, rgba(0,0,0,0.30))' : '0 4px 16px var(--ds-shadow-raised, rgba(0,0,0,0.10))',
        maxHeight: 300,
        overflowY: 'auto',
        zIndex: 9999,
      }}
    >
      {availableStatuses.map((status) => {
        const style = getStatusStyle(status, isDark);
        const isCurrent = status === currentStatus;
        return (
          <div
            key={status}
            onClick={() => { onSelect(status); onClose(); }}
            style={{
              height: 50,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              background: isCurrent ? ('var(--cp-bg-page, #F8FAFC)') : undefined,
              fontFamily: 'var(--cp-font-body)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cp-bg-page, #F8FAFC)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = isCurrent ? ('var(--cp-bg-page, #F8FAFC)') : '')}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: style.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1, #0F172A)))', flex: 1 }}>{status}</span>
            {isCurrent && <Check size={14} color="var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))" />}
          </div>
        );
      })}
    </div>
  );
}
