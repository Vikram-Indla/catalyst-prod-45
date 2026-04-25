/**
 * WikiAdminPagesTab — Page management table with filters, pagination & actions
 * Cycle 1: edge cases (empty, stale highlight, low confidence, null handling)
 * Cycle 2: V12 tokens, 36px rows, 3-color lozenges, focus rings
 * Cycle 3: pagination, optimistic status updates
 */
import React, { useState } from 'react';
import { useWikiPageAdminList, useUpdatePageStatus, useRegeneratePage } from '@/hooks/useWikiAdminData';
import { SkeletonBlock } from '@/components/wiki/WikiTokens';
import { EmptyState } from './WikiAdminSyncTab';
import { Search, RefreshCw, ExternalLink, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_OPTIONS = ['All', 'published', 'draft', 'review', 'archived'];

export function WikiAdminPagesTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useWikiPageAdminList({
    search: search || undefined,
    status: statusFilter !== 'All' ? statusFilter : undefined,
    page,
    pageSize,
  });
  const updateStatus = useUpdatePageStatus();
  const regenerate = useRegeneratePage();

  const pages = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {Array.from({ length: 8 }).map((_, i) => <SkeletonBlock key={i} height={36} />)}
    </div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 10px', height: 32, borderRadius: 4,
          border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
          background: 'var(--cp-bg-page, #fff)', flex: 1, maxWidth: 300,
        }}>
          <Search style={{ width: 14, height: 14, color: 'var(--cp-text-tertiary, #64748B)' }} />
          <input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'var(--ds-font-family-body)', fontSize: 12, width: '100%',
              color: 'var(--cp-text-primary, #0F172A)',
            }}
          />
        </div>
        {STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
            style={{
              padding: '4px 12px', borderRadius: 4,
              border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
              background: statusFilter === s ? 'var(--cp-primary-60, #2563EB)' : 'transparent',
              color: statusFilter === s ? '#fff' : 'var(--cp-text-secondary, #334155)',
              fontFamily: 'var(--ds-font-family-body)', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', textTransform: 'capitalize', outline: 'none',
            }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          >{s}</button>
        ))}
      </div>

      {/* Empty state */}
      {pages.length === 0 ? (
        <EmptyState
          icon={<FileText style={{ width: 28, height: 28, color: 'var(--cp-text-tertiary, #64748B)' }} />}
          message="No wiki pages generated yet"
          sub="Run a sync to generate pages from Jira data."
        />
      ) : (
        <>
          {/* Table */}
          <div style={{ border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', borderRadius: 4, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--ds-font-family-body)', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--cp-bg-sunken, #F8FAFC)' }}>
                  {['Title', 'Domain', 'Status', 'Confidence', 'Coverage', 'Ver', 'Reads', 'Updated', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'start', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pages.map(p => {
                  const isStale = (p.days_since_update ?? 0) > 7;
                  const isLowConf = (p.ai_confidence ?? 0) < 0.8;
                  return (
                    <tr key={p.id} style={{
                      borderTop: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.08))',
                      height: 50,
                      background: isStale ? 'rgba(217,119,6,0.04)' : 'transparent',
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = isStale ? 'rgba(217,119,6,0.06)' : 'rgba(15,23,42,0.04)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isStale ? 'rgba(217,119,6,0.04)' : 'transparent'; }}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 500, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.title}>
                        {p.title ?? '—'}
                        {isStale && <span style={{ marginInlineStart: 6, fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(217,119,6,0.1)', color: '#9A5402', fontWeight: 700 }}>⚠ STALE</span>}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontFamily: 'var(--ds-font-family-monospaced)', fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--cp-bg-sunken, #F1F5F9)', color: 'var(--cp-text-secondary, #334155)' }}>{p.domain_code ?? '—'}</span>
                      </td>
                      <td style={{ padding: '8px 12px' }}><PageStatusLoz status={p.status} /></td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--ds-font-family-monospaced)', fontSize: 11, color: isLowConf ? 'var(--sem-danger)' : 'var(--cp-text-primary, #0F172A)', fontWeight: isLowConf ? 700 : 400 }}>
                        {p.ai_confidence != null ? `${Math.round(p.ai_confidence * 100)}%` : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--ds-font-family-monospaced)', fontSize: 11 }}>
                        {p.source_coverage != null ? `${Math.round(p.source_coverage * 100)}%` : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--ds-font-family-monospaced)', fontSize: 11 }}>{p.version ?? '—'}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--ds-font-family-monospaced)', fontSize: 11 }}>{p.read_count ?? 0}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--ds-font-family-monospaced)', fontSize: 11 }}>{(p.days_since_update ?? 0) > 0 ? `${p.days_since_update}d` : '—'}</td>
                      <td style={{ padding: '8px 12px', display: 'flex', gap: 4, alignItems: 'center' }}>
                        <ActionBtn icon={<RefreshCw style={{ width: 12, height: 12 }} />} title="Regenerate" onClick={() => regenerate.mutate(p.id)} />
                        <ActionBtn icon={<ExternalLink style={{ width: 12, height: 12 }} />} title="View in Wiki" onClick={() => window.open(`/wiki/${p.slug}`, '_blank')} />
                        <select
                          value={p.status}
                          onChange={(e) => updateStatus.mutate({ pageId: p.id, status: e.target.value })}
                          aria-label="Change status"
                          style={{
                            padding: '2px 4px', borderRadius: 4, fontSize: 10,
                            border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
                            background: 'transparent', cursor: 'pointer',
                            fontFamily: 'var(--ds-font-family-body)', color: 'var(--cp-text-secondary, #334155)',
                            outline: 'none',
                          }}
                          onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
                          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          {['published', 'draft', 'review', 'archived'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', fontFamily: 'var(--ds-font-family-body)', fontSize: 12 }}>
              <span style={{ color: 'var(--cp-text-tertiary, #64748B)', marginInlineEnd: 8 }}>{total} pages</span>
              <PagBtn disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft style={{ width: 14, height: 14 }} /></PagBtn>
              <span style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>Page {page + 1} of {totalPages}</span>
              <PagBtn disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight style={{ width: 14, height: 14 }} /></PagBtn>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActionBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} style={{
      padding: 4, borderRadius: 4,
      border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
      background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
      color: 'var(--cp-text-tertiary, #64748B)', outline: 'none',
    }}
      onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {icon}
    </button>
  );
}

function PagBtn({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{
      padding: '4px 8px', borderRadius: 4,
      border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
      background: 'transparent', cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.4 : 1, display: 'flex', alignItems: 'center',
      color: 'var(--cp-text-primary, #0F172A)', outline: 'none',
    }}
      onFocus={(e) => { if (!disabled) e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >{children}</button>
  );
}

function PageStatusLoz({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    published: { bg: '#1B7F37', color: '#0D7331' },
    draft: { bg: '#DFE1E6', color: '#44546F' },
    review: { bg: '#0C66E4', color: '#FFFFFF' },
    archived: { bg: '#DFE1E6', color: '#44546F' },
  };
  const s = map[status] ?? map.draft;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>{status ?? '—'}</span>
  );
}
