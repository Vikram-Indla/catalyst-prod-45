/**
 * AuditTrailPage — Governance Audit Trail
 * Read-only log of all AI Cleanup force close and restore events.
 * Light mode only. Page bg var(--ds-surface-sunken, #F8FAFC), cards #ffffff.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditTrail, useAuditTrailAll, type AuditEntry } from '@/hooks/useAuditTrail';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

const CATEGORY_MAP: Record<number, string> = {
  1: 'Ghost',
  2: 'No Breakdown',
  3: 'Inactive Assignee',
  4: 'Epic-Linked',
  5: 'Long Stale',
  6: 'AI Duplicate',
  7: 'Active Defect',
};

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  { value: '1', label: 'Ghost Tickets' },
  { value: '2', label: 'No Work Breakdown' },
  { value: '3', label: 'Inactive Assignee' },
  { value: '4', label: 'Epic-Linked Stale' },
  { value: '5', label: 'Blocker Forgotten' },
  { value: '6', label: 'AI Duplicate' },
  { value: '7', label: 'Active Defect' },
];

function relativeTime(iso: string): string {
  if (!iso) return '\u2014';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function formatDate(iso: string): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function restoreStatus(entry: AuditEntry): { label: string; bg: string; color: string; border: string } {
  if (entry.restored_at) {
    return { label: 'RESTORED', bg: '#E3FCEF', color: '#006644', border: '#6EE7B7' };
  }
  const deadline = new Date(entry.restore_deadline);
  if (deadline < new Date()) {
    return { label: 'EXPIRED', bg: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', border: 'var(--ds-border, var(--ds-border, #E2E8F0))' };
  }
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400_000));
  return { label: `RESTORABLE \u00B7 ${daysLeft}d left`, bg: '#FFFBEB', color: '#92400E', border: '#FCD34D' };
}

export default function AuditTrailPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'closed' | 'restored'>('all');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const filterOpts = {
    statusFilter,
    categoryFilter,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
  };

  const { data, isLoading } = useAuditTrail({ page, ...filterOpts });
  const { data: allEntries = [] } = useAuditTrailAll(filterOpts);

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== null || dateFrom || dateTo;

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setCategoryFilter(null);
    setDateFrom('');
    setDateTo('');
    setPage(0);
  }, []);

  // Stats from allEntries
  const stats = useMemo(() => {
    const totalClosed = allEntries.length;
    const restored = allEntries.filter(e => e.restored_at).length;
    const pendingRestore = allEntries.filter(e =>
      !e.restored_at && new Date(e.restore_deadline) >= new Date()
    ).length;
    const expired = allEntries.filter(e =>
      !e.restored_at && new Date(e.restore_deadline) < new Date()
    ).length;
    return { totalClosed, restored, pendingRestore, expired };
  }, [allEntries]);

  // CSV export
  const handleExport = useCallback(() => {
    const headers = ['Item Key', 'Title', 'Category', 'Closed By', 'Closed At', 'Closure Reason', 'Stale Days', 'Reporter Notified', 'Restore Deadline', 'Restore Status', 'Restored At', 'Restored By'];
    const rows = allEntries.map(e => {
      const rs = restoreStatus(e);
      return [
        e.item_key,
        `"${(e.title || '').replace(/"/g, '""')}"`,
        CATEGORY_MAP[e.governance_category] ?? 'Unknown',
        e.closed_by_name,
        e.closed_at ? new Date(e.closed_at).toISOString() : '',
        `"${(e.closure_reason || '').replace(/"/g, '""')}"`,
        e.stale_days ?? '',
        e.reporter_notified ? 'Yes' : 'No',
        e.restore_deadline ? new Date(e.restore_deadline).toISOString().split('T')[0] : '',
        rs.label,
        e.restored_at ? new Date(e.restored_at).toISOString() : '',
        e.restored_by_name ?? '',
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalyst-audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [allEntries]);

  const fromRow = page * pageSize + 1;
  const toRow = Math.min((page + 1) * pageSize, total);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F8FAFC))', fontFamily: 'var(--cp-font-body)',
    }}>
      {/* PAGE HEADER */}
      <div style={{
        background: 'var(--ds-surface, var(--ds-surface, #ffffff))', borderBottom: '1px solid #E2E8F0',
        padding: '16px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <button
            onClick={() => navigate('/cleanup')}
            style={{
              display: 'flex', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--ds-text-subtle, var(--ds-text-subtle, #475569))', fontFamily: 'var(--cp-font-body)',
              marginBottom: 4,
            }}
          >
            <ChevronLeft size={14} color="var(--ds-text-subtle, var(--ds-text-subtle, #475569))" />
            Back to Cleanup
          </button>
          <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--ds-text, var(--ds-text, #0F172A))' }}>
            Audit Trail
          </div>
          <div style={{ fontSize: 13, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', marginTop: 2 }}>
            AI Cleanup governance log
          </div>
        </div>
        <Button
          variant="outline"
          style={{ height: 36, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={handleExport}
        >
          <Download size={14} />
          Export CSV
        </Button>
      </div>

      {/* FILTER BAR */}
      <div style={{
        background: 'var(--ds-surface, var(--ds-surface, #ffffff))', borderBottom: '1px solid #E2E8F0',
        padding: '12px 24px', display: 'flex', gap: 12, alignItems: 'center',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as any); setPage(0); }}
        >
          <SelectTrigger style={{ width: 160, height: 36, fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 6, background: 'var(--ds-surface, var(--ds-surface, #ffffff))' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: 'var(--ds-surface, var(--ds-surface, #ffffff))' }}>
            <SelectItem value="all" style={{ fontSize: 13 }}>All events</SelectItem>
            <SelectItem value="closed" style={{ fontSize: 13 }}>Force closed</SelectItem>
            <SelectItem value="restored" style={{ fontSize: 13 }}>Restored</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter !== null ? String(categoryFilter) : 'all'}
          onValueChange={(v) => { setCategoryFilter(v === 'all' ? null : Number(v)); setPage(0); }}
        >
          <SelectTrigger style={{ width: 180, height: 36, fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 6, background: 'var(--ds-surface, var(--ds-surface, #ffffff))' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: 'var(--ds-surface, var(--ds-surface, #ffffff))' }}>
            {CATEGORY_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value} style={{ fontSize: 13 }}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))' }}>From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(0); }}
            style={{
              height: 36, fontSize: 13, border: '1px solid #E2E8F0',
              borderRadius: 6, padding: '0 10px', background: 'var(--ds-surface, var(--ds-surface, #ffffff))',
              color: 'var(--ds-text, var(--ds-text, #0F172A))', fontFamily: 'var(--cp-font-body)',
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))' }}>To</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(0); }}
            style={{
              height: 36, fontSize: 13, border: '1px solid #E2E8F0',
              borderRadius: 6, padding: '0 10px', background: 'var(--ds-surface, var(--ds-surface, #ffffff))',
              color: 'var(--ds-text, var(--ds-text, #0F172A))', fontFamily: 'var(--cp-font-body)',
            }}
          />
        </div>

        {hasActiveFilters && (
          <span
            onClick={clearFilters}
            style={{ fontSize: 13, color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear filters
          </span>
        )}
      </div>

      {/* STATS STRIP */}
      <div style={{
        display: 'flex', gap: 32, padding: '12px 24px',
        borderBottom: '1px solid #E2E8F0', background: 'var(--ds-surface, var(--ds-surface, #ffffff))', flexShrink: 0,
      }}>
        {[
          { label: 'TOTAL CLOSED', value: stats.totalClosed },
          { label: 'RESTORED', value: stats.restored },
          { label: 'PENDING RESTORE', value: stats.pendingRestore },
          { label: 'EXPIRED', value: stats.expired },
        ].map(cell => (
          <div key={cell.label}>
            <div style={{
              fontFamily: 'var(--cp-font-mono)', fontSize: 20,
              fontWeight: 600, color: 'var(--ds-text, var(--ds-text, #0F172A))',
            }}>
              {cell.value}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 500, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2,
            }}>
              {cell.label}
            </div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 0' }}>
        <div style={{
          background: 'var(--ds-surface, var(--ds-surface, #ffffff))', border: '1px solid #E2E8F0',
          borderRadius: 6, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F8FAFC))', borderBottom: '1px solid #E2E8F0' }}>
                {['ITEM', 'CATEGORY', 'CLOSED BY', 'CLOSED', 'REASON', 'RESTORE STATUS', 'RESTORED BY'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', fontSize: 11, fontWeight: 500,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))', textAlign: 'left', fontFamily: 'var(--cp-font-body)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' }}>
                    Loading audit trail...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' }}>
                    No audit events found
                  </td>
                </tr>
              ) : entries.map(entry => {
                const rs = restoreStatus(entry);
                return (
                  <tr
                    key={entry.id}
                    style={{ borderBottom: '0.75px solid #F1F5F9', height: 52 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F8FAFC))')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--ds-surface, var(--ds-surface, #ffffff))')}
                  >
                    {/* ITEM */}
                    <td style={{ padding: '8px 12px', minWidth: 200, verticalAlign: 'top' }}>
                      <div style={{
                        fontFamily: 'var(--cp-font-mono)',
                        fontSize: 12, fontWeight: 500, color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))',
                      }}>
                        {entry.item_key}
                      </div>
                      <div style={{
                        fontSize: 13, color: 'var(--ds-text, var(--ds-text, #0F172A))', marginTop: 2,
                        maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {entry.title}
                      </div>
                    </td>

                    {/* CATEGORY */}
                    <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', verticalAlign: 'top' }}>
                      {CATEGORY_MAP[entry.governance_category] ?? 'Unknown'}
                    </td>

                    {/* CLOSED BY */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: 'var(--ds-border, var(--ds-border, #E2E8F0))', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ds-text-subtle, var(--ds-text-subtle, #475569))' }}>
                            {initials(entry.closed_by_name)}
                          </span>
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--ds-text, var(--ds-text, #0F172A))' }}>
                          {entry.closed_by_name}
                        </span>
                      </div>
                    </td>

                    {/* CLOSED */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                      <div style={{
                        fontFamily: 'var(--cp-font-mono)',
                        fontSize: 13, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))',
                      }}>
                        {relativeTime(entry.closed_at)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))', marginTop: 2 }}>
                        {formatDate(entry.closed_at)}
                      </div>
                    </td>

                    {/* REASON */}
                    <td style={{
                      padding: '8px 12px', fontSize: 13, color: 'var(--ds-text-subtle, var(--ds-text-subtle, #475569))',
                      maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', verticalAlign: 'top',
                    }}
                    title={entry.closure_reason}
                    >
                      {entry.closure_reason || '\u2014'}
                    </td>

                    {/* RESTORE STATUS */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                      <span style={{
                        display: 'inline-block', fontSize: 11, fontWeight: 500,
                        textTransform: 'uppercase', borderRadius: 3,
                        padding: '2px 8px', background: rs.bg, color: rs.color,
                        border: `1px solid ${rs.border}`, whiteSpace: 'nowrap',
                      }}>
                        {rs.label}
                      </span>
                    </td>

                    {/* RESTORED BY */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                      {entry.restored_by_name ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: 'var(--ds-border, var(--ds-border, #E2E8F0))', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ds-text-subtle, var(--ds-text-subtle, #475569))' }}>
                                {initials(entry.restored_by_name)}
                              </span>
                            </div>
                            <span style={{ fontSize: 13, color: 'var(--ds-text, var(--ds-text, #0F172A))' }}>
                              {entry.restored_by_name}
                            </span>
                          </div>
                          {entry.restored_at && (
                            <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))', marginTop: 2, paddingLeft: 30 }}>
                              {formatDate(entry.restored_at)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ds-text-disabled, var(--ds-text-disabled, #CBD5E1))' }}>{'\u2014'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px', background: 'var(--ds-surface, var(--ds-surface, #ffffff))', borderTop: '1px solid #E2E8F0',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))' }}>
          {total > 0 ? `Showing ${fromRow}\u2013${toRow} of ${total} events` : 'No events'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            variant="outline"
            size="sm"
            style={{ height: 32, fontSize: 13, opacity: page === 0 ? 0.4 : 1, pointerEvents: page === 0 ? 'none' : 'auto' }}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft size={14} />
            Previous
          </Button>
          <span style={{ fontSize: 13, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))' }}>
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            style={{ height: 32, fontSize: 13, opacity: page + 1 >= totalPages ? 0.4 : 1, pointerEvents: page + 1 >= totalPages ? 'none' : 'auto' }}
            onClick={() => setPage(p => p + 1)}
            disabled={page + 1 >= totalPages}
          >
            Next
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
