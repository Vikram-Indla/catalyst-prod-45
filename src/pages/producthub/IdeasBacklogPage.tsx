/**
 * Ideas Backlog Page — /product/ideas/backlog
 * V12 Hybrid Precision — 36px rows, 3-color lozenges, high-contrast quarters
 * ALL data from useIdeasHub() — ZERO hardcoded.
 * + New Idea wired to useCreateIdea(). Row click opens drawer.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import { Search, Plus, Sparkles, ArrowUpRight } from 'lucide-react';
import { useIdeasHub, useIdeaStats, useUpdateIdea, useCreateIdea, type IdeaRow } from '@/hooks/useIdeasHub';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import IdeaDrawer from './ideation/IdeaDrawer';
import IdeationTriagePanel from './ideation/IdeationTriagePanel';
import IdeationIntelligenceHub from './ideation/IdeationIntelligenceHub';
import { CreateRequestDrawer, type ConversionSource } from '@/components/producthub/shared/CreateRequestDrawer';
import { QUARTER_BADGE, STATUS_LOZENGE_COLORS } from './ideation/ideation-data';
import type { Idea } from './ideation/ideation-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Map IdeaRow → Idea for Triage/Intelligence panels */
function toIdea(r: IdeaRow): Idea {
  return {
    key: r.idea_key,
    title: r.title,
    subtitle: r.description || '',
    status: (r.status?.toLowerCase().replace(/ /g, '_') || 'draft') as any,
    type: (r.idea_type?.toLowerCase().replace(/ /g, '_') || 'feature_request') as any,
    priority: r.priority || 'P2',
    impact: r.impact_total,
    votes: r.vote_count,
    request: r.linked_initiative_key || null,
    dept: r.assigned_team || '',
    assignee: r.assigned_to_name ? { name: r.assigned_to_name, initials: r.assigned_to_name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2), color: '#2563EB' } : null,
    ai: r.ai_enrichment_status === 'completed' ? 'ready' : 'pending',
    theme: r.theme,
    assigned_team: r.assigned_team,
    target_release_date: r.target_release_date,
    created_at: r.created_at,
    updated_at: r.updated_at,
    roadmap_quarter: r.roadmap_quarter,
  };
}

const FILTER_PILLS = [
  { key: 'all', label: 'All' },
  { key: 'Submitted', label: 'Submitted' },
  { key: 'Under Review', label: 'Under Review' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Converted to Request', label: 'Converted' },
  { key: 'Draft', label: 'Draft' },
];

const THEMES = [
  'Provide Services for SBC', 'Digital Maturity 2026', 'Marketplace', 'UX',
  'اتاحة خدمات', 'استعلام تحققي', 'المسح الصناعي', 'تحسين إجراء قائم',
  'تحسين خدمة الشركاء', 'تضمين خدمة قطاعية', 'تقارير ومؤشرات', 'رقمنة إجراء جديد',
  'كفاءة الموقع', 'مهام داخلية',
];

export default function IdeasBacklogPage() {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;
  const [searchParams] = useSearchParams();
  const themeFilter = searchParams.get('theme') || undefined;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [drawerKey, setDrawerKey] = useState<string | null>(null);
  const [convertDrawerOpen, setConvertDrawerOpen] = useState(false);
  const [conversionSource, setConversionSource] = useState<ConversionSource | null>(null);
  const [triageOpen, setTriageOpen] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

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

  const convertedCount = stats?.byStatus.find(s => s.status === 'Converted to Request')?.count || 0;
  const conversionRate = stats && stats.total > 0 ? ((convertedCount / stats.total) * 100).toFixed(1) : '0.0';

  const ideasData = useMemo(() => ideas.map(toIdea), [ideas]);

  const handleMergeIdeas = useCallback((primaryKey: string, mergeKey: string) => {
    toast.info(`Merging ${mergeKey} into ${primaryKey}`);
  }, []);

  const handleConvertIdea = (idea: IdeaRow) => {
    setConversionSource({
      type: 'single',
      primaryIdea: {
        key: idea.idea_key, title: idea.title, description: idea.description || idea.title,
        impact: idea.impact_total || 0, votes: idea.vote_count || 0, dept: idea.assigned_team || '', priority: idea.priority || 'P3',
      },
    });
    setConvertDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: dk.pageBg }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: `1px solid ${dk.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: dk.t1, margin: 0, fontFamily: 'var(--cp-font-heading)' }}>Ideas Backlog</h1>
            <p style={{ fontSize: '13px', color: dk.t3, margin: '4px 0 0' }}>Capture, evaluate, and promote ideas into requests — powered by IMPACT scoring & AI Intelligence</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setIntelligenceOpen(true)} style={{ background: 'var(--cp-bg-elevated, #FFFFFF)', color: '#2563EB', border: '1px solid #2563EB', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={14} /> Intelligence
            </button>
            <button onClick={() => setCreateOpen(true)} style={{ background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={14} /> New Idea
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ background: dk.pageBg, borderBottom: `1px solid ${dk.border}`, display: 'flex', alignItems: 'stretch' }}>
        <div style={{ padding: '14px 24px', borderRight: `1px solid ${dk.divider}` }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '4px' }}>TOTAL IDEAS</div>
          <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--cp-font-heading)', color: dk.t1 }}>{stats?.total ?? ideas.length}</span>
        </div>
        <div style={{ padding: '14px 16px', borderRight: `1px solid ${dk.divider}` }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '4px' }}>BY STATUS</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {stats?.byStatus.map(s => (
              <span key={s.status} style={{ fontSize: '12px', color: s.status === 'Converted to Request' ? dk.greenText : dk.t2, fontWeight: 500 }}>
                {s.count} {s.status === 'Converted to Request' ? 'Converted' : s.status}
              </span>
            ))}
          </div>
        </div>
        <div style={{ padding: '14px 16px', borderRight: `1px solid ${dk.divider}` }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '8px' }}>BY QUARTER</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => (
              <div key={q} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '20px', minWidth: '26px', padding: '0 4px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: QUARTER_BADGE[q].bg, color: QUARTER_BADGE[q].text }}>{q}</span>
                <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: '16px', fontWeight: 700, color: dk.t1 }}>{qCounts[q] || 0}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, padding: '14px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '4px' }}>CONVERSION RATE</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--cp-font-heading)', color: dk.greenText }}>{conversionRate}%</span>
            <span style={{ fontSize: '11px', color: dk.t3 }}>{convertedCount} of {stats?.total ?? 0} converted</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: dk.pageBg, borderBottom: `1px solid ${dk.border}`, padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: dk.t3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas..."
            style={{ width: '100%', height: '32px', paddingLeft: '32px', paddingRight: '10px', background: 'var(--cp-bg-elevated, #FFFFFF)', border: `1px solid ${dk.border}`, borderRadius: '6px', fontSize: '13px', color: dk.t1, outline: 'none' }}
          />
        </div>
        {FILTER_PILLS.map(pill => {
          const isActive = statusFilter === pill.key;
          return (
            <button key={pill.key} onClick={() => setStatusFilter(pill.key)} style={{
              background: isActive ? '#2563EB' : ('var(--cp-bg-elevated, #FFFFFF)'), color: isActive ? '#FFFFFF' : dk.t2,
              border: `1px solid ${isActive ? '#2563EB' : dk.border}`,
              borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms',
            }}>{pill.label}</button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button onClick={() => setTriageOpen(true)} style={{ background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={12} /> AI Triage ({ideas.length})
        </button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', background: dk.pageBg, padding: '16px 28px 24px' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: dk.t3 }}>Loading ideas...</div>
        ) : ideas.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💡</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: dk.t1, marginBottom: '4px' }}>No ideas yet</div>
            <div style={{ fontSize: '13px', color: dk.t3 }}>Create your first idea to get started.</div>
          </div>
        ) : (
          <div style={{ background: 'var(--cp-bg-elevated, #FFFFFF)', borderRadius: '6px', border: `1px solid ${dk.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ height: '50px', background: 'var(--cp-bg-page, #F1F5F9)' }}>
                  <th style={{ width: '40px', padding: '0 8px', textAlign: 'center' }}>
                    <input type="checkbox" checked={selectedRows.size === ideas.length && ideas.length > 0} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
                  </th>
                  {[
                    { label: 'KEY', width: '90px' }, { label: 'TITLE' }, { label: 'STATUS', width: '140px' },
                    { label: 'TYPE', width: '70px' }, { label: 'PRI', width: '40px' }, { label: 'IMPACT', width: '60px' },
                    { label: 'THEME', width: '140px' }, { label: 'QTR', width: '60px' },
                    { label: 'ASSIGNEE', width: '140px' }, { label: 'UPDATED', width: '80px' },
                  ].map(col => (
                    <th key={col.label} style={{
                      textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: 'var(--cp-text-tertiary, #64748B)', padding: '10px 12px',
                      borderBottom: `0.75px solid ${dk.divider}`, whiteSpace: 'nowrap', width: col.width,
                    }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ideas.map(idea => {
                  const isConverted = idea.status === 'Converted to Request' || idea.status === 'Converted';
                  return (
                    <tr key={idea.idea_key} onClick={() => setDrawerKey(idea.idea_key)}
                      style={{ height: '50px', maxHeight: '50px', cursor: 'pointer', borderBottom: `0.75px solid ${dk.divider}`, background: selectedRows.has(idea.idea_key) ? dk.selectedBg : 'transparent', transition: 'background 150ms' }}
                      onMouseEnter={e => { if (!selectedRows.has(idea.idea_key)) e.currentTarget.style.background = dk.hoverBg; }}
                      onMouseLeave={e => { if (!selectedRows.has(idea.idea_key)) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '0 8px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedRows.has(idea.idea_key)} onChange={() => toggleRow(idea.idea_key)} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: '13px', fontWeight: 600, color: dk.blueKey, cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                        >{idea.idea_key}</span>
                      </td>
                      <td style={{ padding: '8px 12px', maxWidth: '400px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: dk.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idea.title}</div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <StatusBadge status={idea.status} />
                          {isConverted && idea.linked_initiative_key && (
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#11853D', fontFamily: 'var(--cp-font-mono)' }}>
                              → {idea.linked_initiative_key}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4, fontSize: '11px', fontWeight: 500, background: 'var(--cp-bg-sunken, #F1F5F9)', color: dk.t2, border: `1px solid ${dk.border}` }}>
                          {(idea.idea_type || 'Feature').substring(0, 7)}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 20, minWidth: 26, padding: '0 4px', borderRadius: 4, fontSize: '11px', fontWeight: 650, background: 'var(--cp-bg-sunken, #F1F5F9)', color: dk.t2, border: `1px solid ${dk.border}` }}>
                          {idea.priority || 'P2'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: '13px', fontWeight: 500, color: idea.impact_total > 0 ? dk.green : dk.t3 }}>
                          {idea.impact_total.toFixed(2)}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }} title={idea.theme || undefined}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: idea.theme ? dk.t2 : dk.t3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '140px' }}>
                          {idea.theme || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {idea.roadmap_quarter ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 18, padding: '0 4px', borderRadius: 4, fontSize: '11px', fontWeight: 700, background: QUARTER_BADGE[idea.roadmap_quarter]?.bg || '#E2E8F0', color: QUARTER_BADGE[idea.roadmap_quarter]?.text || '#94A3B8' }}>{idea.roadmap_quarter}</span>
                        ) : <span style={{ fontSize: '11px', color: dk.t3 }}>—</span>}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {idea.assigned_to_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '9px', fontWeight: 700, flexShrink: 0 }}>
                              {idea.assigned_to_name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <span style={{ fontSize: '13px', color: dk.t2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idea.assigned_to_name}</span>
                          </div>
                        ) : <span style={{ fontSize: '13px', color: dk.t3, fontStyle: 'italic' }}>Unassigned</span>}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: '12px', color: dk.t3 }}>
                          {idea.updated_at ? new Date(idea.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '10px 16px', borderTop: `0.75px solid ${dk.divider}` }}>
              <span style={{ fontSize: '12px', color: dk.t3 }}>Showing 1–{ideas.length} of {ideas.length} ideas</span>
            </div>
          </div>
        )}
      </div>

      {drawerKey && <IdeaDrawer ideaKey={drawerKey} onClose={() => setDrawerKey(null)} onConvert={handleConvertIdea} />}
      <CreateRequestDrawer
        open={convertDrawerOpen}
        onClose={() => { setConvertDrawerOpen(false); setConversionSource(null); }}
        conversionSource={conversionSource}
        onCreated={async (initiativeKey: string) => {
          if (conversionSource) {
            const ideaToConvert = ideas.find(i => i.idea_key === conversionSource.primaryIdea.key);
            if (ideaToConvert) {
              await supabase.from('ph_ideas').update({
                status: 'Converted to Request',
                converted_at: new Date().toISOString(),
              } as any).eq('id', ideaToConvert.id);
              queryClient.invalidateQueries({ queryKey: ['ideas-hub'] });
              queryClient.invalidateQueries({ queryKey: ['ideas'] });
              toast.success(`${conversionSource.primaryIdea.key} converted to ${initiativeKey}`);
            }
          }
        }}
      />
      <IdeationTriagePanel open={triageOpen} onClose={() => setTriageOpen(false)} onMerge={handleMergeIdeas} ideas={ideasData} />
      <IdeationIntelligenceHub open={intelligenceOpen} onClose={() => setIntelligenceOpen(false)} onMerge={handleMergeIdeas} ideas={ideasData} />
      <CreateIdeaDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { isDark } = useTheme();
  const darkColors: Record<string, { bg: string; text: string }> = {
    'Draft':                    { bg: '#2E2E2E', text: 'rgba(255,255,255,0.72)' },
    'Submitted':                { bg: '#2E2E2E', text: 'rgba(255,255,255,0.72)' },
    'Under Review':             { bg: 'rgba(59,130,246,0.15)', text: '#93C5FD' },
    'Approved':                 { bg: 'rgba(59,130,246,0.15)', text: '#93C5FD' },
    'Rejected':                 { bg: '#2E2E2E', text: 'rgba(255,255,255,0.72)' },
    'Converted':                { bg: 'rgba(22,163,74,0.15)', text: '#86EFAC' },
    'Converted to Request':  { bg: 'rgba(22,163,74,0.15)', text: '#86EFAC' },
  };
  const s = isDark
    ? (darkColors[status] ?? { bg: '#2E2E2E', text: '#A1A1A1' })
    : (STATUS_LOZENGE_COLORS[status] ?? { bg: '#DFE1E6', text: '#42526E' });
  const label = status === 'Converted to Request' ? 'CONVERTED' : status.toUpperCase();
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', background: s.bg, color: s.text,
      height: 20, padding: '0 8px', borderRadius: 4,
      fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'uppercase',
    }}>{label}</span>
  );
}

/** Create Idea Dialog — wired to useCreateIdea() */
function CreateIdeaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;
  const createIdea = useCreateIdea();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('P3');
  const [type, setType] = useState('Feature Request');
  const [theme, setTheme] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    await createIdea.mutateAsync({
      title: title.trim(),
      status: 'Draft',
      priority,
      idea_type: type,
      source: 'Internal',
      theme: theme || undefined,
      description: description || undefined,
    });
    setTitle(''); setPriority('P3'); setType('Feature Request'); setTheme(''); setDescription('');
    onClose();
  };

  const selectBg = isDark ? 'bg-transparent' : 'bg-white';
  const selectDropdown = isDark ? 'bg-[#1A1A1A] border-gray-700 text-white' : 'bg-white';

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-white dark:bg-[#1A1A1A] sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--cp-font-heading)', fontWeight: 650, fontSize: '18px', color: dk.t1 }}>New Idea</DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, display: 'block', marginBottom: '6px' }}>TITLE *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter idea title..."
              style={{ width: '100%', height: '50px', border: `1px solid ${dk.border}`, borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none', color: dk.t1, background: 'var(--cp-bg-elevated, #FFFFFF)' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, display: 'block', marginBottom: '6px' }}>PRIORITY</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className={`h-9 ${selectBg} dark:border-gray-700 dark:text-white`}><SelectValue /></SelectTrigger>
                <SelectContent className={selectDropdown}>
                  {['P1', 'P2', 'P3', 'P4'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, display: 'block', marginBottom: '6px' }}>TYPE</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className={`h-9 ${selectBg} dark:border-gray-700 dark:text-white`}><SelectValue /></SelectTrigger>
                <SelectContent className={selectDropdown}>
                  {['Feature Request', 'Enhancement', 'Bug Fix', 'Opportunity', 'Solution'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, display: 'block', marginBottom: '6px' }}>IDEAS THEME</label>
            <Select value={theme || '__none__'} onValueChange={v => setTheme(v === '__none__' ? '' : v)}>
              <SelectTrigger className={`h-9 ${selectBg} dark:border-gray-700 dark:text-white`}><SelectValue placeholder="Select theme" /></SelectTrigger>
              <SelectContent className={selectDropdown}>
                <SelectItem value="__none__">— None —</SelectItem>
                {THEMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, display: 'block', marginBottom: '6px' }}>DESCRIPTION</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional description..."
              style={{ width: '100%', border: `1px solid ${dk.border}`, borderRadius: '6px', padding: '8px 12px', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'var(--cp-font-body)', color: dk.t1, background: 'var(--cp-bg-elevated, #FFFFFF)' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button onClick={onClose} style={{ height: '50px', padding: '0 16px', borderRadius: '6px', border: `1px solid ${dk.border}`, background: 'var(--cp-bg-elevated, #FFFFFF)', color: dk.t2, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleCreate} disabled={createIdea.isPending} style={{ height: '50px', padding: '0 16px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: createIdea.isPending ? 0.7 : 1 }}>
              {createIdea.isPending ? 'Creating...' : 'Create Idea'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
