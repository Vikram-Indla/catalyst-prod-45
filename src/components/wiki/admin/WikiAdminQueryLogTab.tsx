/**
 * WikiAdminQueryLogTab — Query log table with filters
 */
import React, { useState } from 'react';
import { useWikiQueryLog } from '@/hooks/useWikiAdminData';
import { SkeletonBlock } from '@/components/wiki/WikiTokens';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export function WikiAdminQueryLogTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 30;

  const { data, isLoading } = useWikiQueryLog({ page, pageSize, search: search || undefined });

  if (isLoading) return <div>{Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} height={36} style={{ marginBottom: 4 }} />)}</div>;

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 10px', height: 32, borderRadius: 4,
        border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
        maxWidth: 300,
      }}>
        <Search style={{ width: 14, height: 14, color: 'var(--cp-text-tertiary, #64748B)' }} />
        <input
          placeholder="Search queries..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Inter, sans-serif', fontSize: 12, width: '100%', color: 'var(--cp-text-primary, #0F172A)' }}
        />
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', borderRadius: 4, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--cp-bg-sunken, #F8FAFC)' }}>
              {['Query', 'Language', 'Method', 'Confidence', 'Time (ms)', 'Cache', 'Timestamp'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'start', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--cp-text-tertiary, #64748B)' }}>No queries logged</td></tr>
            ) : rows.map((r: any) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--cp-border-default, rgba(15,23,42,0.08))', height: 36 }}>
                <td style={{ padding: '8px 12px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.query_text}</td>
                <td style={{ padding: '8px 12px', fontSize: 11 }}>{r.language || '—'}</td>
                <td style={{ padding: '8px 12px', fontSize: 11 }}>{r.retrieval_method || '—'}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{r.confidence != null ? `${Math.round(r.confidence * 100)}%` : '—'}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{r.response_time_ms ?? '—'}</td>
                <td style={{ padding: '8px 12px', fontSize: 11 }}>{r.cache_hit ? '✓' : '✕'}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{r.created_at ? format(new Date(r.created_at), 'MMM d HH:mm') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '4px 8px', borderRadius: 3, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', background: 'transparent', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>
            <ChevronLeft style={{ width: 14, height: 14 }} />
          </button>
          <span style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ padding: '4px 8px', borderRadius: 3, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', background: 'transparent', cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}
    </div>
  );
}
