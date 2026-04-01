/**
 * StatusDropdown — 3-color status change dropdown
 */

import { useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { getStatusStyle } from './StatusBadge';

interface StatusDropdownProps {
  currentStatus: string;
  availableStatuses: string[];
  onSelect: (status: string) => void;
  onClose: () => void;
}

export function StatusDropdown({ currentStatus, availableStatuses, onSelect, onClose }: StatusDropdownProps) {
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
        background: 'var(--bg-app, #FFFFFF)',
        border: '1px solid var(--divider, #E2E8F0)',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        maxHeight: 300,
        overflowY: 'auto',
        zIndex: 9999,
      }}
    >
      {availableStatuses.map((status) => {
        const style = getStatusStyle(status);
        const isCurrent = status === currentStatus;
        return (
          <div
            key={status}
            onClick={() => { onSelect(status); onClose(); }}
            style={{
              height: 36,
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              background: isCurrent ? '#F8FAFC' : undefined,
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
            onMouseLeave={(e) => (e.currentTarget.style.background = isCurrent ? '#F8FAFC' : '')}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: style.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--fg-1, #0F172A)', flex: 1 }}>{status}</span>
            {isCurrent && <Check size={14} color="#2563EB" />}
          </div>
        );
      })}
    </div>
  );
}
