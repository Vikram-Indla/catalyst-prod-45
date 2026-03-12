/**
 * Ideas Backlog Page — /product/ideas/backlog
 * V12 Hybrid Precision — 36px rows, 3-color lozenges, high-contrast quarters
 * ALL data from useIdeasHub() — ZERO hardcoded.
 */
import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Download, Plus, Sparkles } from 'lucide-react';
import { useIdeasHub, useIdeaStats, type IdeaRow } from '@/hooks/useIdeasHub';
import IdeaDrawer from './ideation/IdeaDrawer';
import { QUARTER_BADGE, STATUS_LOZENGE_COLORS } from './ideation/ideation-data';

const FILTER_PILLS = [
  { key: 'all', label: 'All' },
  { key: 'Submitted', label: 'Submitted' },
  { key: 'Under Review', label: 'Under Review' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Draft', label: 'Draft' },
];

export default function IdeasBacklogPage() {
  const [searchParams] = useSearchParams();
  const themeFilter = searchParams.get('theme') || undefined;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [drawerKey, setDrawerKey] = useState<string | null>(null);

  const { data: ideas = [], isLoading } = useIdeasHub({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    theme: themeFilter,
    search: search || undefined,
  });
  const { data: stats } = useIdeaStats();

  const toggleRow = (key: string) => {
    setSelectedRows(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };
  const toggleAll = () => {
    setSelectedRows(ideas.length === selectedRows.size ? new Set() : new Set(ideas.map(i => i.idea_key)));
  };

  const qCounts = useMemo(() => {
    const m: Record<string, number> = {};
    ideas.forEach(i => { if (i.roadmap_quarter) m[i.roadmap_quarter] = (m[i.roadmap_quarter] || 0) + 1; });
    return m;
  }, [ideas]);

  return (
    <div className="flex flex-col h-full" style={{ background: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>Ideas Backlog</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Capture, evaluate, and promote ideas into initiatives</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={14} /> Intelligence
            </button>
            <button style={{ background: '#FFFFFF', color: '#334155', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={14} /> Export
            </button>
            <button style={{ background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={14} /> New Idea
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(15,23,42,0.08)', display: 'flex', alignItems: 'stretch' }}>
        <div style={{ padding: '14px 24px', borderRight: '1px solid rgba(15,23,42,0.06)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '4px' }}>TOTAL IDEAS</div>
          <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: "'Sora', sans-serif", color: '#0F172A' }}>{stats?.total ?? ideas.length}</span>
        </div>
        {stats?.byStatus.map(s => (
          <div key={s.status} style={{ padding: '14px 16px', borderRight: '1px solid rgba(15,23,42,0.06)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '4px' }}>{s.status}</div>
            <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#0F172A' }}>{s.count}</span>
          </div>
        ))}
        <div style={{ flex: 1, padding: '14px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '8px' }}>BY QUARTER</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => (
              <div key={q} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '20px', minWidth: '26px', padding: '0 4px', borderRadius: '3px', fontSize: '11px', fontWeight: 700, background: QUARTER_BADGE[q].bg, color: QUARTER_BADGE[q].text }}>{q}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{qCounts[q] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(15,23,42,0.08)', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas..."
            style={{ width: '100%', height: '32px', paddingLeft: '32px', paddingRight: '10px', background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '6px', fontSize: '13px', color: '#0F172A', outline: 'none' }}
          />
        </div>
        {FILTER_PILLS.map(pill => {
          const isActive = statusFilter === pill.key;
          return (
            <button key={pill.key} onClick={() => setStatusFilter(pill.key)} style={{
              background: isActive ? '#2563EB' : '#FFFFFF', color: isActive ? '#FFFFFF' : '#334155',
              border: `1px solid ${isActive ? '#2563EB' : 'rgba(15,23,42,0.12)'}`,
              borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms',
            }}>{pill.label}</button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button style={{ background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={12} /> AI Triage ({ideas.length})
        </button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', background: '#FFFFFF', padding: '16px 28px 24px' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Loading ideas...</div>
        ) : ideas.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💡</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>No ideas yet</div>
            <div style={{ fontSize: '13px', color: '#94A3B8' }}>Create your first idea to get started.</div>
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: '6px', border: '1px solid rgba(15,23,42,0.12)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ height: '36px', background: '#F1F5F9' }}>
                  <th style={{ width: '40px', padding: '0 8px', textAlign: 'center' }}>
                    <input type="checkbox" checked={selectedRows.size === ideas.length && ideas.length > 0} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
                  </th>
                  {[
                    { label: 'KEY', width: '90px' }, { label: 'TITLE' }, { label: 'STATUS', width: '120px' },
                    { label: 'TYPE', width: '70px' }, { label: 'PRI', width: '40px' }, { label: 'IMPACT', width: '60px' },
                    { label: 'THEME', width: '130px' }, { label: 'QTR', width: '60px' },
                    { label: 'ASSIGNEE', width: '140px' }, { label: 'UPDATED', width: '80px' },
                  ].map(col => (
                    <th key={col.label} style={{
                      textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: '#64748B', padding: '10px 12px',
                      borderBottom: '0.75px solid rgba(15,23,42,0.08)', whiteSpace: 'nowrap', width: col.width,
                    }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ideas.map(idea => (
                  <tr key={idea.idea_key} onClick={() => setDrawerKey(idea.idea_key)}
                    style={{ height: '36px', cursor: 'pointer', borderBottom: '0.75px solid rgba(15,23,42,0.06)', background: selectedRows.has(idea.idea_key) ? '#F0F4FF' : '#FFFFFF', transition: 'background 150ms' }}
                    onMouseEnter={e => { if (!selectedRows.has(idea.idea_key)) e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
                    onMouseLeave={e => { if (!selectedRows.has(idea.idea_key)) e.currentTarget.style.background = '#FFFFFF'; }}
                  >
                    <td style={{ padding: '0 8px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedRows.has(idea.idea_key)} onChange={() => toggleRow(idea.idea_key)} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                      >{idea.idea_key}</span>
                    </td>
                    <td style={{ padding: '8px 12px', maxWidth: '400px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idea.title}</div>
                    </td>
                    <td style={{ padding: '8px 12px' }}><StatusBadge status={idea.status} /></td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: '11px', fontWeight: 500, background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0' }}>
                        {(idea.idea_type || 'Feature').substring(0, 7)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 20, minWidth: 26, padding: '0 4px', borderRadius: 3, fontSize: '11px', fontWeight: 650, background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0' }}>
                        {idea.priority || 'P2'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 500, color: idea.impact_total > 0 ? '#16A34A' : '#94A3B8' }}>
                        {idea.impact_total.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: idea.theme ? '#334155' : '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '130px' }}>
                        {idea.theme || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {idea.roadmap_quarter ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 18, padding: '0 4px', borderRadius: 3, fontSize: '10px', fontWeight: 700, background: QUARTER_BADGE[idea.roadmap_quarter]?.bg || '#E2E8F0', color: QUARTER_BADGE[idea.roadmap_quarter]?.text || '#94A3B8' }}>{idea.roadmap_quarter}</span>
                      ) : <span style={{ fontSize: '11px', color: '#94A3B8' }}>—</span>}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {idea.assigned_to_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                            {idea.assigned_to_name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <span style={{ fontSize: '13px', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idea.assigned_to_name}</span>
                        </div>
                      ) : <span style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                        {idea.updated_at ? new Date(idea.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '10px 16px', borderTop: '0.75px solid rgba(15,23,42,0.06)' }}>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Showing 1–{ideas.length} of {ideas.length} ideas</span>
            </div>
          </div>
        )}
      </div>

      {drawerKey && <IdeaDrawer ideaKey={drawerKey} onClose={() => setDrawerKey(null)} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LOZENGE_COLORS[status] ?? { bg: '#DFE1E6', text: '#253858' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', background: s.bg, color: s.text,
      height: 20, padding: '0 8px', borderRadius: 3,
      fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'uppercase',
    }}>{status.toUpperCase()}</span>
  );
}
