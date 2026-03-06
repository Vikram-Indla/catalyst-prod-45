import { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import type { RAFilterTab } from '@/types/reqAssistV2';

const TABS: { key: RAFilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ready', label: 'Ready' },
  { key: 'processing', label: 'Processing' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
];

interface Props {
  tab: RAFilterTab;
  onTabChange: (tab: RAFilterTab) => void;
  search: string;
  onSearchChange: (s: string) => void;
  resultCount?: number;
}

export default function RASearchToolbar({ tab, onTabChange, search, onSearchChange, resultCount }: Props) {
  const [local, setLocal] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback((val: string) => {
    setLocal(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearchChange(val), 200);
  }, [onSearchChange]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 12px', borderBottom: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, maxWidth: 400, flex: 1,
        height: 34, borderRadius: 'var(--ra-radius-card)',
        border: '1px solid rgba(15,23,42,0.12)', padding: '0 10px', background: '#FFFFFF',
      }}>
        <Search size={14} color="#94A3B8" strokeWidth={2} />
        <input
          type="text" value={local} onChange={e => handleChange(e.target.value)}
          placeholder="Search by title, Jira ticket, domain..."
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}
        />
        {resultCount !== undefined && (
          <span style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>{resultCount}</span>
        )}
      </div>
      <div style={{ width: 1, height: 22, background: 'rgba(15,23,42,0.12)' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => onTabChange(t.key)} style={{
              padding: '4px 12px', fontSize: 12, fontWeight: active ? 600 : 400,
              borderRadius: 'var(--ra-radius-card)',
              border: `1px solid ${active ? '#BFDBFE' : 'rgba(15,23,42,0.12)'}`,
              background: active ? '#EFF6FF' : '#FFFFFF', color: active ? '#2563EB' : '#64748B',
              cursor: 'pointer', transition: 'all 120ms ease', fontFamily: "'Inter', sans-serif",
            }}>
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
