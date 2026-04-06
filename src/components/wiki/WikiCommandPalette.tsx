import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Folder, ArrowRight } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useWikiDomains, useWikiTitleSearch, useDebouncedValue } from '@/hooks/useWikiData';

interface Props { open: boolean; onClose: () => void; }

const DOMAIN_SLUGS: Record<string, string> = {
  D1: 'industrial-licensing', D2: 'customs-trade', D3: 'chemical-permits',
  D4: 'environmental-compliance', D5: 'industrial-incentives',
  D6: 'fourth-industrial-revolution', D7: 'workforce-support',
  D8: 'senaei-platform', D9: 'mining-minerals',
};

export function WikiCommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data: domains } = useWikiDomains();
  const { data: titleResults } = useWikiTitleSearch(debouncedQuery);
  const { isDark } = useTheme();

  useEffect(() => {
    if (open) { setQuery(''); setSelectedIdx(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const items = React.useMemo(() => {
    const result: { type: string; label: string; path: string; meta?: string }[] = [];

    if (debouncedQuery.length >= 2 && titleResults) {
      for (const p of titleResults) {
        result.push({
          type: 'page',
          label: p.title,
          path: `/wiki/${p.slug}`,
          meta: p.domain_code,
        });
      }
    }

    result.push({ type: 'page', label: 'Wiki Home', path: '/wiki', meta: 'Home' });
    result.push({ type: 'page', label: "What's New", path: '/wiki/whats-new', meta: 'Changelog' });

    (domains || []).forEach((d: any) => {
      result.push({
        type: 'category',
        label: `${d.domain_code} ${d.name}`,
        path: `/wiki/category/${DOMAIN_SLUGS[d.domain_code] || d.domain_code.toLowerCase()}`,
        meta: `${d.article_count ?? 0} articles`,
      });
    });

    if (!query) return result;
    const q = query.toLowerCase();

    if (titleResults && titleResults.length > 0) {
      const titleSlugs = new Set(titleResults.map(p => p.slug));
      return result.filter(i =>
        titleSlugs.has(i.path.replace('/wiki/', '')) ||
        i.label.toLowerCase().includes(q) ||
        (i.meta || '').toLowerCase().includes(q)
      );
    }

    return result.filter(i => i.label.toLowerCase().includes(q) || (i.meta || '').toLowerCase().includes(q));
  }, [query, debouncedQuery, domains, titleResults]);

  const handleSelect = useCallback((path: string) => {
    navigate(path); onClose();
  }, [navigate, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      if (items[selectedIdx]) {
        handleSelect(items[selectedIdx].path);
      } else if (query.length >= 2) {
        navigate(`/wiki/search?q=${encodeURIComponent(query)}`);
        onClose();
      }
    }
  };

  if (!open) return null;

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Wiki search" style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120,
      opacity: 1, transition: 'opacity 150ms ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, maxHeight: 420, background: isDark ? '#1A1A1A' : 'var(--cp-bg-elevated)',
        borderRadius: 12, boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : 'var(--cp-shadow-overlay)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)',
        transform: 'translateY(0)', opacity: 1,
        transition: 'transform 150ms ease, opacity 150ms ease',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderBottom: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)',
        }}>
          <Search size={16} style={{ color: isDark ? '#878787' : 'var(--cp-text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search wiki pages, categories, documents..."
            aria-label="Search wiki"
            style={{
              flex: 1, fontSize: 15, fontFamily: 'var(--cp-font-body)',
              background: 'transparent', border: 'none', outline: 'none',
              color: isDark ? '#EDEDED' : 'var(--cp-text-primary)',
            }}
          />
        </div>
        {/* Results */}
        <div role="listbox" style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {items.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: isDark ? '#878787' : 'var(--cp-text-muted)', fontSize: 13 }}>
              {query.length >= 2 ? (
                <span>No results for &lsquo;{query}&rsquo;. <span onClick={() => { navigate(`/wiki/search?q=${encodeURIComponent(query)}`); onClose(); }} style={{ color: 'var(--cp-text-link)', cursor: 'pointer' }}>Search full wiki →</span></span>
              ) : 'Type to search...'}
            </div>
          )}
          {items.map((item, idx) => (
            <div
              key={`${item.path}-${idx}`}
              role="option"
              aria-selected={idx === selectedIdx}
              onClick={() => handleSelect(item.path)}
              onMouseEnter={() => setSelectedIdx(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                background: idx === selectedIdx ? (isDark ? 'rgba(37,99,235,0.12)' : 'var(--cp-interact-selected)') : 'transparent',
                transition: 'background 80ms',
              }}
            >
              {item.type === 'category' ? <Folder size={14} style={{ color: isDark ? '#878787' : 'var(--cp-text-muted)' }} /> : <FileText size={14} style={{ color: isDark ? '#878787' : 'var(--cp-text-muted)' }} />}
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: isDark ? '#EDEDED' : 'var(--cp-text-primary)' }}>{item.label}</span>
              <span dir="ltr" style={{ fontSize: 11, color: isDark ? '#878787' : 'var(--cp-text-muted)' }}>{item.meta}</span>
              {idx === selectedIdx && <ArrowRight size={12} style={{ color: isDark ? '#878787' : 'var(--cp-text-muted)' }} />}
            </div>
          ))}
        </div>
        {/* Footer */}
        <div style={{
          padding: '8px 16px', borderTop: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)',
          display: 'flex', gap: 16, fontSize: 11, color: isDark ? '#878787' : 'var(--cp-text-muted)',
        }}>
          <span><kbd style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 10, padding: '1px 4px', borderRadius: 4, border: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)', background: isDark ? '#0A0A0A' : 'var(--cp-bg-sunken)' }}>↑↓</kbd> Navigate</span>
          <span><kbd style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 10, padding: '1px 4px', borderRadius: 4, border: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)', background: isDark ? '#0A0A0A' : 'var(--cp-bg-sunken)' }}>↵</kbd> Open</span>
          <span><kbd style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 10, padding: '1px 4px', borderRadius: 4, border: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)', background: isDark ? '#0A0A0A' : 'var(--cp-bg-sunken)' }}>ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
