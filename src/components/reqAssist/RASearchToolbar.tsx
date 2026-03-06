import { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import type { RAFilterTab } from '@/types/reqAssistV2';

const TABS: { key: RAFilterTab; label: string; dot: string }[] = [
  { key: 'all', label: 'All', dot: '#64748B' },
  { key: 'ready', label: 'Ready', dot: '#16A34A' },
  { key: 'processing', label: 'Processing', dot: '#2563EB' },
  { key: 'pending', label: 'Pending', dot: '#94A3B8' },
  { key: 'failed', label: 'Failed', dot: '#DC2626' },
];

interface Props {
  tab: RAFilterTab;
  onTabChange: (tab: RAFilterTab) => void;
  search: string;
  onSearchChange: (s: string) => void;
  resultCount?: number;
  totalCount?: number;
  isFiltering?: boolean;
}

export default function RASearchToolbar({ tab, onTabChange, search, onSearchChange, resultCount, totalCount, isFiltering }: Props) {
  const [local, setLocal] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback((val: string) => {
    setLocal(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearchChange(val), 200);
  }, [onSearchChange]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const countLabel = isFiltering
    ? `${resultCount ?? 0} results`
    : `${totalCount ?? 0} documents`;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 28px 14px', background: '#FFFFFF',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, maxWidth: 400, flex: 1,
        height: 34, borderRadius: 'var(--ra-radius-card)',
        border: '1px solid rgba(15,23,42,0.12)', padding: '0 10px', background: '#FFFFFF',
        transition: 'border-color 150ms, box-shadow 150ms',
      }}
        onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.10)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(15,23,42,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <Search size={14} color="#94A3B8" strokeWidth={2} />
        <input
          type="text" value={local} onChange={e => handleChange(e.target.value)}
          placeholder="Search by title, Jira ticket, domain..."
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}
        />
        <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>{countLabel}</span>
      </div>
      <div style={{ width: 1, height: 22, background: 'rgba(15,23,42,0.12)' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => onTabChange(t.key)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 12px', height: 30, fontSize: 12, fontWeight: active ? 600 : 400,
              borderRadius: 5,
              border: `1px solid ${active ? '#BFDBFE' : 'rgba(15,23,42,0.12)'}`,
              background: active ? '#EFF6FF' : '#FFFFFF', color: active ? '#2563EB' : '#64748B',
              cursor: 'pointer', transition: 'all 120ms ease', fontFamily: "'Inter', sans-serif",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot, flexShrink: 0 }} />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
