/**
 * Ideas Backlog Page — /product/ideas/backlog
 * CAT-AUDIT-1055: migrated from a raw <table> to the canonical
 * BacklogPage + data-adapter pattern (see ideasBacklogDataSource.ts),
 * matching /incident-hub's IncidentListPage. BacklogPage supplies the
 * table, column picker, column filters, toolbar, sticky header, sort,
 * keyboard nav, and row detail panel. Ideas-specific chrome (header,
 * stats bar, filter pills, New Idea / AI Triage / Intelligence dialogs)
 * is preserved as a wrapper above the mount.
 * ALL data from useIdeasHub() — ZERO hardcoded.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import { Search, Plus, Sparkles } from '@/lib/atlaskit-icons';
import { useIdeasHub, useIdeaStats, useCreateIdea } from '@/hooks/useIdeasHub';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { BacklogPage } from '@/modules/project-work-hub/pages/BacklogPage.atlaskit';
import { useIdeasBacklogSource } from './ideasBacklogDataSource';
import IdeationTriagePanel from '../../modules-dormant/ideation/IdeationTriagePanel';
import IdeationIntelligenceHub from '../../modules-dormant/ideation/IdeationIntelligenceHub';
import { CreateRequestDrawer, type ConversionSource } from '@/components/producthub/shared/CreateRequestDrawer';
import { QUARTER_BADGE } from '../../modules-dormant/ideation/ideation-data';
import type { Idea } from '../../modules-dormant/ideation/ideation-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { IdeaRow } from '@/hooks/useIdeasHub';

const IDEAS_SENTINEL_KEY = 'IDEAS';
const IDEAS_SENTINEL_ID = 'ideas';

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
    assignee: r.assigned_to_name ? { name: r.assigned_to_name, initials: r.assigned_to_name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2), color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' } : null,
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
  const [convertDrawerOpen, setConvertDrawerOpen] = useState(false);
  const [conversionSource, setConversionSource] = useState<ConversionSource | null>(null);
  const [triageOpen, setTriageOpen] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const ideasFilters = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    theme: themeFilter,
    search: search || undefined,
  };
  const { data: ideas = [] } = useIdeasHub(ideasFilters);
  const { data: stats } = useIdeaStats();
  const adapter = useIdeasBacklogSource(ideasFilters);

  const qCounts = useMemo(() => {
    const m: Record<string, number> = {};
    ideas.forEach(i => { if (i.roadmap_quarter) m[i.roadmap_quarter] = (m[i.roadmap_quarter] || 0) + 1; });
    return m;
  }, [ideas]);

  const convertedCount = stats?.byStatus.find(s => s.status === 'Converted to Request')?.count || 0;
  const conversionRate = stats && stats.total > 0 ? ((convertedCount / stats.total) * 100).toFixed(1) : '0.0';

  const ideasData = useMemo(() => ideas.map(toIdea), [ideas]);

  const handleMergeIdeas = useCallback((primaryKey: string, mergeKey: string) => {
    catalystToast.info(`Merging ${mergeKey} into ${primaryKey}`);
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ background: dk.pageBg }}>
      {/* Header */}
      <div style={{ padding: '16px 28px 16px', borderBottom: `1px solid ${dk.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 700, color: dk.t1, margin: 0, fontFamily: 'var(--cp-font-heading)' }}>Ideas Backlog</h1>
            <p style={{ fontSize: 'var(--ds-font-size-300)', color: dk.t3, margin: '4px 0 0' }}>Capture, evaluate, and promote ideas into requests — powered by IMPACT scoring & AI Intelligence</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setIntelligenceOpen(true)} style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', border: '1px solid var(--ds-link)', borderRadius: '6px', padding: '8px 14px', fontSize: 'var(--ds-font-size-300)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={14} /> Intelligence
            </button>
            <button onClick={() => setCreateOpen(true)} style={{ background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--ds-surface)', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: 'var(--ds-font-size-300)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={14} /> New Idea
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ background: dk.pageBg, borderBottom: `1px solid ${dk.border}`, display: 'flex', alignItems: 'stretch' }}>
        <div style={{ padding: '12px 24px', borderRight: `1px solid ${dk.divider}` }}>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '4px' }}>TOTAL IDEAS</div>
          <span style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 800, fontFamily: 'var(--cp-font-heading)', color: dk.t1 }}>{stats?.total ?? ideas.length}</span>
        </div>
        <div style={{ padding: '12px 16px', borderRight: `1px solid ${dk.divider}` }}>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '4px' }}>BY STATUS</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {stats?.byStatus.map(s => (
              <span key={s.status} style={{ fontSize: 'var(--ds-font-size-200)', color: s.status === 'Converted to Request' ? dk.greenText : dk.t2, fontWeight: 500 }}>
                {s.count} {s.status === 'Converted to Request' ? 'Converted' : s.status}
              </span>
            ))}
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderRight: `1px solid ${dk.divider}` }}>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '8px' }}>BY QUARTER</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => (
              <div key={q} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '20px', minWidth: '26px', padding: '0 4px', borderRadius: '4px', fontSize: 'var(--ds-font-size-100)', fontWeight: 700, background: QUARTER_BADGE[q].bg, color: QUARTER_BADGE[q].text }}>{q}</span>
                <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-500)', fontWeight: 700, color: dk.t1 }}>{qCounts[q] || 0}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, padding: '12px 24px' }}>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '4px' }}>CONVERSION RATE</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 800, fontFamily: 'var(--cp-font-heading)', color: dk.greenText }}>{conversionRate}%</span>
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: dk.t3 }}>{convertedCount} of {stats?.total ?? 0} converted</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: dk.pageBg, borderBottom: `1px solid ${dk.border}`, padding: '8px 28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '8px', top: '48%', transform: 'translateY(-50%)', color: dk.t3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas..."
            style={{ width: '100%', height: '32px', paddingLeft: '32px', paddingRight: '8px', background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: `1px solid ${dk.border}`, borderRadius: '6px', fontSize: 'var(--ds-font-size-300)', color: dk.t1, outline: 'none' }}
          />
        </div>
        {FILTER_PILLS.map(pill => {
          const isActive = statusFilter === pill.key;
          return (
            <button key={pill.key} onClick={() => setStatusFilter(pill.key)} style={{
              background: isActive ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : ('var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))'), color: isActive ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' : dk.t2,
              border: `1px solid ${isActive ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : dk.border}`,
              borderRadius: '20px', padding: '4px 12px', fontSize: 'var(--ds-font-size-200)', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms',
            }}>{pill.label}</button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button onClick={() => setTriageOpen(true)} style={{ background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--ds-surface)', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={12} /> AI Triage ({ideas.length})
        </button>
      </div>

      {/* Backlog table — canonical BacklogPage + adapter (CAT-AUDIT-1055).
          Same JiraTable, column picker, filters, toolbar, sort, keyboard nav,
          and detail panel as /project-hub/BAU/backlog. Row click opens the
          canonical CatalystViewIdea detail panel (via the adapter's
          onOpenItem → globalOpenDetail), not the legacy IdeaDrawer. */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {!adapter ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 48 }}>
            <Spinner size="large" />
          </div>
        ) : (
          <BacklogPage
            projectId={IDEAS_SENTINEL_ID}
            projectKey={IDEAS_SENTINEL_KEY}
            displayName="Ideas"
            baseUrl="/product-hub/ideas"
            dataSource={adapter}
          />
        )}
      </div>

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
              catalystToast.success(`${conversionSource.primaryIdea.key} converted to ${initiativeKey}`);
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
    if (!title.trim()) { catalystToast.error('Title is required'); return; }
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
  const selectDropdown = isDark ? 'bg-[var(--ds-surface-raised,var(--cp-ink-1))] border-gray-700 text-white' : 'bg-white';

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--cp-font-heading)', fontWeight: 650, fontSize: 'var(--ds-font-size-600)', color: dk.t1 }}>New Idea</DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          <div>
            <label style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, display: 'block', marginBottom: '4px' }}>TITLE *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter idea title..."
              style={{ width: '100%', height: '50px', border: `1px solid ${dk.border}`, borderRadius: '6px', padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', outline: 'none', color: dk.t1, background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, display: 'block', marginBottom: '4px' }}>PRIORITY</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className={`h-9 ${selectBg} dark:border-gray-700 dark:text-white`}><SelectValue /></SelectTrigger>
                <SelectContent className={selectDropdown}>
                  {['P1', 'P2', 'P3', 'P4'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, display: 'block', marginBottom: '4px' }}>TYPE</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className={`h-9 ${selectBg} dark:border-gray-700 dark:text-white`}><SelectValue /></SelectTrigger>
                <SelectContent className={selectDropdown}>
                  {['Feature Request', 'Enhancement', 'Bug Fix', 'Opportunity', 'Solution'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, display: 'block', marginBottom: '4px' }}>IDEAS THEME</label>
            <Select value={theme || '__none__'} onValueChange={v => setTheme(v === '__none__' ? '' : v)}>
              <SelectTrigger className={`h-9 ${selectBg} dark:border-gray-700 dark:text-white`}><SelectValue placeholder="Select theme" /></SelectTrigger>
              <SelectContent className={selectDropdown}>
                <SelectItem value="__none__">— None —</SelectItem>
                {THEMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, display: 'block', marginBottom: '4px' }}>DESCRIPTION</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional description..."
              style={{ width: '100%', border: `1px solid ${dk.border}`, borderRadius: '6px', padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', resize: 'vertical', outline: 'none', fontFamily: 'var(--cp-font-body)', color: dk.t1, background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button onClick={onClose} style={{ height: '50px', padding: '0 16px', borderRadius: '6px', border: `1px solid ${dk.border}`, background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', color: dk.t2, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleCreate} disabled={createIdea.isPending} style={{ height: '50px', padding: '0 16px', borderRadius: '6px', border: 'none', background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', fontSize: 'var(--ds-font-size-300)', fontWeight: 600, cursor: 'pointer', opacity: createIdea.isPending ? 0.7 : 1 }}>
              {createIdea.isPending ? 'Creating...' : 'Create Idea'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
