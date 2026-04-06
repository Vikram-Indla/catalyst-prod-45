import { useState, useCallback } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';
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
    const t = setTimeout(() => onSearchChange(val), 200);
    return () => clearTimeout(t);
  }, [onSearchChange]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 28px',
      background: 'var(--bg-app)',
      borderBottom: '0.75px solid rgba(15,23,42,0.08)',
    }}>
      {/* Search Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: 280, height: 50, borderRadius: 6,
        border: `0.75px solid ${focused ? 'var(--cp-blue)' : 'rgba(15,23,42,0.15)'}`,
        boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none',
        padding: '8px 12px', background: 'var(--bg-app)',
        transition: 'border-color 150ms, box-shadow 150ms',
      }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <Search size={14} color="var(--fg-4)" strokeWidth={2} style={{ flexShrink: 0 }} />
        <input
          type="text" value={local} onChange={e => handleChange(e.target.value)}
          placeholder="Search by title, Jira ticket, domain..."
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: 'var(--fg-1)', fontFamily: "'Inter', sans-serif",
            appearance: 'none' as any,
          }}
        />
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        background: var(--bg-2, '#F1F5F9'), borderRadius: 8, padding: 3,
      }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                height: 28, padding: '8px 12px', borderRadius: 6,
                fontSize: 12, fontWeight: active ? 600 : 500,
                border: 'none', cursor: 'pointer',
                background: active ? 'var(--bg-app)' : 'transparent',
                color: active ? 'var(--fg-1)' : 'var(--fg-3)',
                boxShadow: active ? '0 1px 3px rgba(15,23,42,0.10)' : 'none',
                fontFamily: "'Inter', sans-serif",
                transition: 'all 120ms ease',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.color = active ? 'var(--fg-1)' : 'var(--fg-2)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = active ? 'var(--fg-1)' : 'var(--fg-3)'; }}
            >
              {t.label}
              {t.key === 'all' && totalCount != null && (
                <span style={{ fontSize: 12, color: 'var(--fg-4)', fontWeight: 400 }}>({totalCount})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* D04: Renamed from "Sync All to AI" → "Index to Knowledge Assistant" */}
      {/* D05: Disabled state while syncing */}
      {onSyncAll && (
        <button
          onClick={onSyncAll}
          disabled={syncingAll}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0 14px', height: 50, fontSize: 13, fontWeight: 600,
            border: 'none', borderRadius: 6,
            background: syncingAll
              ? 'var(--fg-4)'
              : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            boxShadow: syncingAll ? 'none' : '0 1px 3px rgba(37,99,235,0.35)',
            color: '#FFFFFF',
            cursor: syncingAll ? 'not-allowed' : 'pointer',
            fontFamily: "'Inter', sans-serif",
            whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'box-shadow 150ms ease',
          }}
          onMouseEnter={e => { if (!syncingAll) { e.currentTarget.style.background = 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(37,99,235,0.45)'; } }}
          onMouseLeave={e => { if (!syncingAll) { e.currentTarget.style.background = 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(37,99,235,0.35)'; } }}
        >
          {syncingAll ? (
            <>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Indexing...
            </>
          ) : (
            <>
              <Sparkles size={14} /> Index to Knowledge Assistant
            </>
          )}
        </button>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
