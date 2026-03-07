import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Zap } from 'lucide-react';
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
  totalCount?: number;
  isFiltering?: boolean;
  onSyncAll?: () => void;
  syncingAll?: boolean;
}

export default function RASearchToolbar({ tab, onTabChange, search, onSearchChange, resultCount, totalCount, isFiltering, onSyncAll, syncingAll }: Props) {
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
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 28px 14px', background: '#FFFFFF',
    }}>
      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360, flex: 1,
        height: 34, borderRadius: 4,
        border: '0.75px solid #E2E8F0', padding: '0 10px', background: '#FFFFFF',
        transition: 'border-color 150ms, box-shadow 150ms',
      }}
        onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.10)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <Search size={14} color="#94A3B8" strokeWidth={2} />
        <input
          type="text" value={local} onChange={e => handleChange(e.target.value)}
          placeholder="Search by title, Jira ticket, domain..."
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}
        />
        <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>{countLabel}</span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 22, background: '#E2E8F0', flexShrink: 0 }} />

      {/* Filter chips — D09: V12 flat chip, no dots */}
      <div style={{ display: 'flex', gap: 6 }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
             <button key={t.key} onClick={() => onTabChange(t.key)} style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '4px 12px', height: 28, fontSize: 13, fontWeight: 500,
              borderRadius: 999,
              border: `0.75px solid ${active ? '#BFDBFE' : '#E2E8F0'}`,
              background: active ? '#EFF6FF' : 'transparent',
              color: active ? '#1D4ED8' : '#6B7280',
              cursor: 'pointer', transition: 'all 120ms ease',
              fontFamily: "'Inter', sans-serif",
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* D13: Sync All to KB — pushed right */}
      {onSyncAll && (
        <>
          <div style={{ flex: 1 }} />
          <button
            onClick={onSyncAll}
            disabled={syncingAll}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 12px', height: 32, fontSize: 13, fontWeight: 500,
              border: 'none', borderRadius: 6,
              background: '#7C3AED', color: '#FFFFFF',
              cursor: syncingAll ? 'not-allowed' : 'pointer',
              opacity: syncingAll ? 0.7 : 1,
              fontFamily: "'Inter', sans-serif",
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            <Zap size={14} /> {syncingAll ? 'Syncing…' : 'Sync All to KB'}
          </button>
        </>
      )}
    </div>
  );
}
