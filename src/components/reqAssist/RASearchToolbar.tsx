import { useState, useCallback } from 'react';
import { Search, Sparkles } from 'lucide-react';
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
  const [focused, setFocused] = useState(false);

  const handleChange = useCallback((val: string) => {
    setLocal(val);
    // Debounce
    const t = setTimeout(() => onSearchChange(val), 200);
    return () => clearTimeout(t);
  }, [onSearchChange]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 28px',
      background: '#FFFFFF',
      borderBottom: '0.75px solid rgba(15,23,42,0.08)',
    }}>
      {/* Search Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: 280, height: 36, borderRadius: 6,
        border: `0.75px solid ${focused ? '#2563EB' : 'rgba(15,23,42,0.15)'}`,
        boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none',
        padding: '0 12px', background: '#FFFFFF',
        transition: 'border-color 150ms, box-shadow 150ms',
      }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <Search size={14} color="#94A3B8" strokeWidth={2} style={{ flexShrink: 0 }} />
        <input
          type="text" value={local} onChange={e => handleChange(e.target.value)}
          placeholder="Search by title, Jira ticket, domain..."
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: '#0F172A', fontFamily: "'Inter', sans-serif",
            appearance: 'none' as any,
          }}
        />
      </div>

      {/* Filter Tabs — Pill Group */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        background: '#F1F5F9', borderRadius: 8, padding: 3,
      }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                height: 28, padding: '0 12px', borderRadius: 6,
                fontSize: 12, fontWeight: active ? 600 : 500,
                border: 'none', cursor: 'pointer',
                background: active ? '#FFFFFF' : 'transparent',
                color: active ? '#0F172A' : '#64748B',
                boxShadow: active ? '0 1px 3px rgba(15,23,42,0.10)' : 'none',
                fontFamily: "'Inter', sans-serif",
                transition: 'all 120ms ease',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.color = active ? '#0F172A' : '#374151'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = active ? '#0F172A' : '#64748B'; }}
            >
              {t.label}
              {t.key === 'all' && totalCount != null && (
                <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 400 }}>({totalCount})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Sync All to AI — purple gradient */}
      {onSyncAll && (
        <button
          onClick={onSyncAll}
          disabled={syncingAll}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0 14px', height: 36, fontSize: 13, fontWeight: 600,
            border: 'none', borderRadius: 6,
            background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
            boxShadow: '0 1px 3px rgba(124,58,237,0.35)',
            color: '#FFFFFF',
            cursor: syncingAll ? 'not-allowed' : 'pointer',
            opacity: syncingAll ? 0.7 : 1,
            fontFamily: "'Inter', sans-serif",
            whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'box-shadow 150ms ease',
          }}
          onMouseEnter={e => { if (!syncingAll) e.currentTarget.style.boxShadow = '0 2px 6px rgba(124,58,237,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(124,58,237,0.35)'; }}
        >
          <Sparkles size={14} /> {syncingAll ? 'Syncing…' : 'Sync All to AI'}
        </button>
      )}
    </div>
  );
}
