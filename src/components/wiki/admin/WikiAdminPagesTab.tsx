/**
 * WikiAdminPagesTab — Page management table with filters & actions
 */
import React, { useState } from 'react';
import { useWikiPageAdminList, useUpdatePageStatus, useRegeneratePage } from '@/hooks/useWikiAdminData';
import { SkeletonBlock } from '@/components/wiki/WikiTokens';
import { Search, RefreshCw, ExternalLink } from 'lucide-react';

const STATUS_OPTIONS = ['All', 'published', 'draft', 'review', 'archived'];

export function WikiAdminPagesTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { data: pages, isLoading } = useWikiPageAdminList({
    search: search || undefined,
    status: statusFilter !== 'All' ? statusFilter : undefined,
  });
  const updateStatus = useUpdatePageStatus();
  const regenerate = useRegeneratePage();

  if (isLoading) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} height={36} />)}
    </div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'Inter, sans-serif', fontSize: 12, width: '100%',
              color: 'var(--cp-text-primary, #0F172A)',
            }}
          />
        </div>
        {STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '4px 12px', borderRadius: 4, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
            background: statusFilter === s ? 'var(--cp-primary-60, #2563EB)' : 'transparent',
            color: statusFilter === s ? '#fff' : 'var(--cp-text-secondary, #334155)',
            fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', textTransform: 'capitalize',
          }}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', borderRadius: 4, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--cp-bg-sunken, #F8FAFC)' }}>
              {['Title', 'Domain', 'Status', 'Confidence', 'Coverage', 'Ver', 'Reads', 'Updated', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'start', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(!pages || pages.length === 0) ? (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--cp-text-tertiary, #64748B)' }}>No pages found</td></tr>
            ) : pages.map(p => (
              <tr key={p.id} style={{ borderTop: '1px solid var(--cp-border-default, rgba(15,23,42,0.08))', height: 36 }}>
                <td style={{ padding: '8px 12px', fontWeight: 500, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.title}
                  {p.days_since_update > 7 && <span style={{ marginInlineStart: 6, fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#FEF3C7', color: '#92400E' }}>STALE</span>}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '2px 6px', borderRadius: 3, background: 'var(--cp-bg-sunken, #F1F5F9)', color: 'var(--cp-text-secondary, #334155)' }}>{p.domain_code}</span>
                </td>
                <td style={{ padding: '8px 12px' }}><StatusLoz status={p.status} /></td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                  <span style={{ color: (p.ai_confidence ?? 0) < 0.8 ? '#DC2626' : 'var(--cp-text-primary, #0F172A)' }}>
                    {p.ai_confidence != null ? `${Math.round(p.ai_confidence * 100)}%` : '—'}
                  </span>
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                  {p.source_coverage != null ? `${Math.round(p.source_coverage * 100)}%` : '—'}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{p.version}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{p.read_count}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{p.days_since_update}d</td>
                <td style={{ padding: '8px 12px', display: 'flex', gap: 4 }}>
                  <ActionBtn icon={<RefreshCw style={{ width: 12, height: 12 }} />} title="Regenerate" onClick={() => regenerate.mutate(p.id)} />
                  <ActionBtn icon={<ExternalLink style={{ width: 12, height: 12 }} />} title="View" onClick={() => window.open(`/wiki/${p.slug}`, '_blank')} />
                  <select
                    value={p.status}
                    onChange={(e) => updateStatus.mutate({ pageId: p.id, status: e.target.value })}
                    style={{
                      padding: '2px 4px', borderRadius: 3, fontSize: 10,
                      border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
                      background: 'transparent', cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif', color: 'var(--cp-text-secondary, #334155)',
                    }}
                  >
                    {['published', 'draft', 'review', 'archived'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} style={{
      padding: 4, borderRadius: 3, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
      background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
      color: 'var(--cp-text-tertiary, #64748B)',
    }}>
      {icon}
    </button>
  );
}

function StatusLoz({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    published: { bg: '#E3FCEF', color: '#006644' },
    draft: { bg: '#DFE1E6', color: '#44546F' },
    review: { bg: '#DEEBFF', color: '#0747A6' },
    archived: { bg: '#DFE1E6', color: '#44546F' },
  };
  const s = map[status] ?? map.draft;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 3,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>{status}</span>
  );
}
