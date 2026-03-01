import React, { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { useWikiSearch, useDebouncedValue } from '@/hooks/useWikiData';
import { ConfidenceBadge, JiraPill, sectionHeaderStyle, SkeletonBlock, SkeletonRow, truncateStyle } from '@/components/wiki/WikiTokens';

export default function WikiSearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query, 300);
  const { data: results, isLoading } = useWikiSearch(debouncedQuery);

  const filterOptions = ['All', 'Wiki Pages', 'Jira Items'];
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-primary)', background: 'var(--cp-bg-page)', minHeight: '100%' }}>
      <div style={{ maxWidth: 840, marginInline: 'auto', padding: '24px 28px 48px' }}>
        {/* Breadcrumb */}
        <nav role="navigation" aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
          <span onClick={() => navigate('/wiki')} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') navigate('/wiki'); }} style={{ fontSize: 12, color: 'var(--cp-text-link)', cursor: 'pointer' }}>Wiki</span>
          <ChevronRight size={12} style={{ color: 'var(--cp-text-muted)' }} />
          <span style={{ fontSize: 12, color: 'var(--cp-text-secondary)', fontWeight: 600 }}>Search</span>
        </nav>

        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: 12,
          borderRadius: 4, border: '1.5px solid var(--cp-border-default)',
          marginBottom: 16, background: 'var(--cp-bg-elevated)',
        }}>
          <Search size={16} style={{ color: 'var(--cp-text-muted)' }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search wiki..."
            aria-label="Search wiki"
            style={{
              flex: 1, fontSize: 14, fontFamily: 'var(--cp-font-body)',
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--cp-text-primary)',
            }}
          />
        </div>

        {query && (
          <h2 style={{ fontSize: 16, fontWeight: 650, margin: '0 0 8px', color: 'var(--cp-text-primary)' }}>
            Search results for &lsquo;{query}&rsquo;
          </h2>
        )}

        {/* Filter chips */}
        <div role="tablist" aria-label="Result filters" style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {filterOptions.map(f => (
            <button key={f} role="tab" aria-selected={activeFilter === f} onClick={() => setActiveFilter(f)} style={{
              fontSize: 11, fontWeight: activeFilter === f ? 650 : 500, padding: '5px 12px',
              borderRadius: 4, cursor: 'pointer',
              border: activeFilter === f ? '1.5px solid var(--cp-primary-60)' : '1px solid var(--cp-border-default)',
              background: activeFilter === f ? 'var(--cp-primary-5)' : 'transparent',
              color: activeFilter === f ? 'var(--cp-primary-60)' : 'var(--cp-text-secondary)',
            }}>{f}</button>
          ))}
        </div>

        {/* Results */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: '0.75px solid var(--cp-border-subtle)' }}>
                <SkeletonBlock width="60%" height={16} style={{ marginBottom: 6 }} />
                <SkeletonBlock width="30%" height={10} style={{ marginBottom: 6 }} />
                <SkeletonBlock width="90%" height={12} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && debouncedQuery.length >= 2 && (
          <div>
            {results?.sources?.length > 0 ? (
              results.sources.map((r: any, i: number) => (
                <div key={i} style={{
                  padding: '12px 0', borderBottom: '0.75px solid var(--cp-border-subtle)',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cp-text-link)', cursor: 'pointer', marginBottom: 4, ...truncateStyle(2) }}>{r.title || r.source_key || 'Result'}</div>
                  <div style={{ fontSize: 11, color: 'var(--cp-text-muted)', marginBottom: 4 }}>{r.entity_type || 'wiki'} · {r.source_table || ''}</div>
                  <div style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', lineHeight: 1.5, ...truncateStyle(3) }}>{r.content?.substring(0, 200)}{r.content?.length > 200 ? '…' : ''}</div>
                </div>
              ))
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--cp-text-muted)', fontSize: 12 }}>
                {results?.answer ? (
                  <div style={{ textAlign: 'start', fontSize: 13, color: 'var(--cp-text-secondary)', lineHeight: 1.7 }}>{results.answer}</div>
                ) : `No results for '${debouncedQuery}'. Try a different search term or browse by domain.`}
              </div>
            )}
          </div>
        )}

        {query.length < 2 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--cp-text-muted)', fontSize: 12 }}>
            Enter at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
}
