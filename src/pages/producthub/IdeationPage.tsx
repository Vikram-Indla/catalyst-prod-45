/**
 * IdeationPage — /producthub/ideation
 * NUCLEAR REDESIGN — V12 Hybrid Precision
 * Pure white backgrounds, no dots, proper contrast, quarter stats
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import { Search, Download, Plus } from 'lucide-react';
import { ProductHubPageHeader } from '@/components/producthub/shared/ProductHubPageHeader';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';
import {
  Idea, IdeationView, IdeaStatus, StatusFilter, VIEW_TITLES,
  STATUS_CONFIG, TYPE_CONFIG, PRIORITY_CONFIG, FILTER_PILLS, QUARTER_BADGE, getImpactColor,
} from './ideation/ideation-data';
import { useIdeas } from '@/hooks/useIdeation';
import IdeationBoardView from './ideation/IdeationBoardView';
import IdeationMatrixView from './ideation/IdeationMatrixView';
import IdeationAnalyticsView from './ideation/IdeationAnalyticsView';
import IdeationDrivesView from './ideation/IdeationDrivesView';
import IdeationDetailPanel from './ideation/IdeationDetailPanel';
import IdeationCreateWizard from './ideation/IdeationCreateWizard';
import IdeationTriagePanel from './ideation/IdeationTriagePanel';
import IdeationIntelligenceHub from './ideation/IdeationIntelligenceHub';
import { CreateInitiativeDrawer, type ConversionSource } from '@/components/producthub/shared/CreateInitiativeDrawer';

export default function IdeationPage() {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as string | null;
  const activeView: IdeationView = (viewParam && ['board', 'matrix', 'analytics', 'drives'].includes(viewParam))
    ? viewParam as IdeationView : 'list';

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  const prevViewRef = React.useRef(activeView);
  React.useEffect(() => {
    if (prevViewRef.current !== activeView) {
      setActiveFilter('all');
      prevViewRef.current = activeView;
    }
  }, [activeView]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [convertedIdeas, setConvertedIdeas] = useState<Record<string, string>>({});

  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [convertDrawerOpen, setConvertDrawerOpen] = useState(false);
  const [conversionSource, setConversionSource] = useState<ConversionSource | null>(null);

  const { data: ideasData = [], isLoading } = useIdeas({
    status: activeFilter !== 'all' && activeFilter !== 'my_ideas' ? activeFilter : undefined,
    search: search || undefined,
  });

  const handleConvertIdea = useCallback((ideaKey: string) => {
    const idea = ideasData.find(i => i.key === ideaKey);
    if (!idea) return;
    setConversionSource({
      type: 'single',
      primaryIdea: {
        key: idea.key, title: idea.title, impact: idea.impact,
        votes: idea.votes, dept: idea.dept, priority: idea.priority,
        assignee: idea.assignee?.name,
        description: idea.title,
      },
    });
    setConvertDrawerOpen(true);
  }, [ideasData]);

  const handleMergeIdeas = useCallback((primaryKey: string, mergeKey: string) => {
    const primary = ideasData.find(i => i.key === primaryKey);
    const merge = ideasData.find(i => i.key === mergeKey);
    if (!primary || !merge) return;
    setConversionSource({
      type: 'merge',
      primaryIdea: {
        key: primary.key, title: primary.title, impact: primary.impact,
        votes: primary.votes, dept: primary.dept, priority: primary.priority,
        assignee: primary.assignee?.name,
      },
      mergeIdea: {
        key: merge.key, title: merge.title, impact: merge.impact, votes: merge.votes,
      },
    });
    setConvertDrawerOpen(true);
    setTriageOpen(false);
  }, [ideasData]);

  const ideasWithConversions = useMemo(() => {
    return ideasData.map(idea => {
      if (convertedIdeas[idea.key]) {
        return { ...idea, status: 'converted' as IdeaStatus, initiative: convertedIdeas[idea.key] };
      }
      return idea;
    });
  }, [convertedIdeas, ideasData]);

  const filteredIdeas = useMemo(() => ideasWithConversions, [ideasWithConversions]);

  const toggleRow = (key: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === filteredIdeas.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredIdeas.map(i => i.key)));
    }
  };

  // Stats
  const stats = useMemo(() => {
    const all = ideasWithConversions;
    const total = all.length;
    const converted = all.filter(i => i.status === 'converted').length;
    const q1 = all.filter(i => i.roadmap_quarter === 'Q1').length;
    const q2 = all.filter(i => i.roadmap_quarter === 'Q2').length;
    const q3 = all.filter(i => i.roadmap_quarter === 'Q3').length;
    const q4 = all.filter(i => i.roadmap_quarter === 'Q4').length;
    const unassigned = all.filter(i => !i.roadmap_quarter).length;
    return { total, converted, q1, q2, q3, q4, unassigned };
  }, [ideasWithConversions]);

  const pageTitle = VIEW_TITLES[activeView];

  return (
    <div className="flex flex-col h-full">
      {/* ─── Page Header (For You pattern) ─── */}
      <ProductHubPageHeader
        title={pageTitle}
        subtitle="Capture, evaluate, and promote ideas into initiatives — powered by IMPACT scoring & AI Intelligence"
        actions={
          <>
            <AIIntelligenceButton label="Intelligence" onClick={() => setIntelligenceOpen(true)} />
            <button style={{
              background: isDark ? 'transparent' : '#FFFFFF', color: dk.t2, border: `1px solid ${dk.border}`,
              borderRadius: '6px', padding: '7px 14px', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => setWizardOpen(true)}
              style={{
                background: '#2563EB', color: '#FFFFFF', border: 'none',
                borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <Plus size={14} /> New Idea
            </button>
          </>
        }
      />

      {/* ─── Stats Bar ─── */}
      <div style={{
        background: dk.pageBg, borderBottom: `1px solid ${dk.border}`,
        display: 'flex', alignItems: 'stretch',
      }}>
        {/* Total Ideas */}
        <div style={{ padding: '14px 24px', borderRight: `1px solid ${dk.divider}` }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '4px' }}>
            TOTAL IDEAS
          </div>
          <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: "'Sora', sans-serif", color: dk.t1 }}>
            {stats.total}
          </span>
        </div>

        {/* Converted */}
        <div style={{ padding: '14px 24px', borderRight: `1px solid ${dk.divider}` }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '4px' }}>
            CONVERTED
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: "'Sora', sans-serif", color: dk.greenText }}>
              {stats.converted}
            </span>
            <span style={{ fontSize: '11px', color: dk.t3 }}>→ Initiatives</span>
          </div>
        </div>

        {/* By Quarter */}
        <div style={{ flex: 1, padding: '14px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '8px' }}>
            BY QUARTER
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => {
              const qb = QUARTER_BADGE[q];
              const count = q === 'Q1' ? stats.q1 : q === 'Q2' ? stats.q2 : q === 'Q3' ? stats.q3 : stats.q4;
              return (
                <div key={q} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    height: '20px', minWidth: '26px', padding: '0 4px',
                    borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                    background: qb.bg, color: qb.text,
                  }}>{q}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', fontWeight: 700, color: dk.t1 }}>
                    {count}
                  </span>
                </div>
              );
            })}
            <div style={{ width: '1px', height: '20px', background: dk.border }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: dk.t3, fontWeight: 500 }}>Unassigned</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', fontWeight: 700, color: dk.t3 }}>
                {stats.unassigned}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtered context indicator */}
      {activeFilter !== 'all' && (
        <div style={{ padding: '6px 28px', background: isDark ? 'rgba(37,99,235,0.08)' : '#EFF6FF', borderBottom: `1px solid ${isDark ? 'rgba(37,99,235,0.15)' : '#DBEAFE'}`, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 500, color: isDark ? '#60A5FA' : '#2563EB' }}>
            Showing {activeFilter.replace('_', ' ')} ideas only
          </span>
          <span style={{ color: dk.t3 }}>·</span>
          <button onClick={() => setActiveFilter('all')} style={{ fontSize: '11px', color: isDark ? '#60A5FA' : '#2563EB', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Clear filter
          </button>
        </div>
      )}

      {/* ─── Toolbar ─── */}
      <div style={{
        background: dk.pageBg, borderBottom: `1px solid ${dk.border}`,
        padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: dk.t3 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ideas..."
            style={{
              width: '100%', height: '32px', paddingLeft: '32px', paddingRight: '10px',
              background: isDark ? 'transparent' : '#F8FAFC', border: `1px solid ${dk.border}`, borderRadius: '6px',
              fontSize: '13px', color: dk.t1, outline: 'none',
            }}
            onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; e.currentTarget.style.borderColor = '#2563EB'; }}
            onBlur={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)'; }}
          />
        </div>

        {/* Filter pills — NO DOTS */}
        {FILTER_PILLS.map(pill => {
          const isActive = activeFilter === pill.key;
          return (
            <button
              key={pill.key}
              onClick={() => setActiveFilter(pill.key)}
              style={{
                background: isActive ? '#2563EB' : (isDark ? 'transparent' : '#FFFFFF'),
                color: isActive ? '#FFFFFF' : dk.t2,
                border: `1px solid ${isActive ? '#2563EB' : dk.border}`,
                borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                transition: 'all 150ms',
              }}
            >
              {pill.label}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />
        <AIIntelligenceButton label={`AI Triage (${ideasData.length})`} onClick={() => setTriageOpen(true)} />
      </div>

      {/* ─── View Content ─── */}
      <div style={{ flex: 1, overflow: 'auto', background: dk.pageBg }}>
        {activeView === 'list' && (
          <div style={{ padding: '16px 28px 24px' }}>
            <IdeationListView
              ideas={filteredIdeas}
              selectedRows={selectedRows}
              toggleRow={toggleRow}
              toggleAll={toggleAll}
              onOpenDetail={setDetailKey}
              isDark={isDark}
              dk={dk}
            />
          </div>
        )}
        {activeView === 'board' && (
          <IdeationBoardView ideas={filteredIdeas} onOpenDetail={setDetailKey} onConvert={handleConvertIdea} />
        )}
        {activeView === 'matrix' && (
          <IdeationMatrixView onOpenDetail={setDetailKey} />
        )}
        {activeView === 'analytics' && (
          <IdeationAnalyticsView ideas={ideasWithConversions} />
        )}
        {activeView === 'drives' && (
          <IdeationDrivesView />
        )}
      </div>

      {/* ─── Panels ─── */}
      {detailKey && <IdeationDetailPanel ideaKey={detailKey} onClose={() => setDetailKey(null)} onConvert={handleConvertIdea} />}
      <IdeationCreateWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
      <IdeationTriagePanel open={triageOpen} onClose={() => setTriageOpen(false)} onMerge={handleMergeIdeas} onConvert={handleConvertIdea} ideas={ideasData} />
      <IdeationIntelligenceHub open={intelligenceOpen} onClose={() => setIntelligenceOpen(false)} onMerge={(pk, mk) => { setIntelligenceOpen(false); handleMergeIdeas(pk, mk); }} ideas={ideasData} />
      <CreateInitiativeDrawer
        open={convertDrawerOpen}
        onClose={() => { setConvertDrawerOpen(false); setConversionSource(null); }}
        conversionSource={conversionSource}
        onCreated={(initiativeKey: string) => {
          if (conversionSource) {
            const updates: Record<string, string> = {};
            updates[conversionSource.primaryIdea.key] = initiativeKey;
            if (conversionSource.type === 'merge' && conversionSource.mergeIdea) {
              updates[conversionSource.mergeIdea.key] = initiativeKey;
            }
            setConvertedIdeas(prev => ({ ...prev, ...updates }));
          }
        }}
      />
    </div>
  );
}

// ─── List View Component ─────────────────────────────────────────
function IdeationListView({ ideas, selectedRows, toggleRow, toggleAll, onOpenDetail, isDark, dk }: {
  ideas: Idea[];
  selectedRows: Set<string>;
  toggleRow: (key: string) => void;
  toggleAll: () => void;
  onOpenDetail: (key: string) => void;
  isDark: boolean;
  dk: typeof DK;
}) {
  return (
    <div style={{
      background: isDark ? 'transparent' : '#FFFFFF', borderRadius: '6px', border: `1px solid ${dk.border}`,
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ height: '50px', background: isDark ? '#1F1F1F' : '#F8FAFC' }}>
            <th style={{ width: '40px', padding: '0 8px', textAlign: 'center' }}>
              <input type="checkbox" checked={selectedRows.size === ideas.length && ideas.length > 0} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
            </th>
            {[
              { label: 'KEY', width: '100px' },
              { label: 'TITLE', width: undefined },
              { label: 'IDEAS THEME', width: '150px' },
              { label: 'STATUS', width: '130px' },
              { label: 'TYPE', width: '80px' },
              { label: 'PRI', width: '50px' },
              { label: 'IMPACT', width: '70px' },
              { label: 'QUARTER', width: '70px' },
              { label: 'ASSIGNEE', width: '150px' },
              { label: 'UPDATED', width: '90px' },
            ].map(col => (
              <th key={col.label} style={{
                textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: dk.t2, padding: '10px 12px',
                borderBottom: `0.75px solid ${dk.divider}`,
                whiteSpace: 'nowrap', width: col.width,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ideas.map((idea, rowIdx) => (
            <tr
              key={idea.key}
              onClick={() => onOpenDetail(idea.key)}
              style={{
                height: '50px', maxHeight: '50px', cursor: 'pointer',
                borderBottom: `0.75px solid ${dk.divider}`,
                background: selectedRows.has(idea.key) ? dk.selectedBg : 'transparent',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => { if (!selectedRows.has(idea.key)) e.currentTarget.style.background = dk.hoverBg; }}
              onMouseLeave={e => { if (!selectedRows.has(idea.key)) e.currentTarget.style.background = 'transparent'; }}
            >
              <td style={{ padding: '0 8px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selectedRows.has(idea.key)} onChange={() => toggleRow(idea.key)} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
              </td>
              <td style={{ padding: '8px 12px' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 600, color: dk.blueKey, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {idea.key}
                </span>
              </td>
              <td style={{ padding: '8px 12px', maxWidth: '400px' }}>
                <div style={{
                  fontSize: '13px', fontWeight: 500, color: dk.t1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {idea.title}
                </div>
              </td>
              <td style={{ padding: '8px 12px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: 500, color: idea.theme ? dk.t2 : dk.t3,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  display: 'block', maxWidth: '150px',
                }}>
                  {idea.theme || '—'}
                </span>
              </td>
              <td style={{ padding: '8px 12px' }}><StatusBadge status={idea.status} /></td>
              <td style={{ padding: '8px 12px' }}><TypeBadge type={idea.type} /></td>
              <td style={{ padding: '8px 12px' }}><PriorityBadge priority={idea.priority} /></td>
              <td style={{ padding: '8px 12px' }}><ImpactCell score={idea.impact} /></td>
              <td style={{ padding: '8px 12px' }}><QuarterBadge quarter={idea.roadmap_quarter} /></td>
              <td style={{ padding: '8px 12px' }}><AssigneeCell assignee={idea.assignee} /></td>
              <td style={{ padding: '8px 12px' }}><DateCell date={idea.updated_at} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{
        padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: `0.75px solid ${dk.divider}`,
      }}>
        <span style={{ fontSize: '12px', color: dk.t3 }}>Showing 1–{ideas.length} of {ideas.length} ideas</span>
      </div>
    </div>
  );
}

// ─── Cell Sub-components ─────────────────────────────────────────
function StatusBadge({ status }: { status: IdeaStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', background: c.bg, color: c.text,
      height: 20, padding: '0 8px', borderRadius: 4,
      fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
      textTransform: 'uppercase', letterSpacing: '0',
    }}>
      {c.label}
    </span>
  );
}

function TypeBadge({ type }: { type: Idea['type'] }) {
  const c = TYPE_CONFIG[type];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px',
      borderRadius: 4, fontSize: '11px', fontWeight: 500,
      background: c.bg, color: c.text, border: '1px solid #E2E8F0',
    }}>
      {c.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const c = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.P4;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      height: 20, minWidth: 26, padding: '0 4px', borderRadius: 4,
      fontSize: '11px', fontWeight: 650,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {priority}
    </span>
  );
}

function ImpactCell({ score }: { score: number }) {
  const textColor = score >= 4 ? '#16A34A' : score >= 3 ? '#2563EB' : score >= 2 ? '#64748B' : '#94A3B8';
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 500,
      color: textColor,
    }}>
      {score.toFixed(2)}
    </span>
  );
}

function QuarterBadge({ quarter }: { quarter?: string | null }) {
  if (!quarter) {
    return <span style={{ fontSize: '11px', color: '#94A3B8' }}>—</span>;
  }
  const qb = QUARTER_BADGE[quarter];
  if (!qb) return <span style={{ fontSize: '11px', color: '#94A3B8' }}>{quarter}</span>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      height: 20, minWidth: 26, padding: '0 4px', borderRadius: 4,
      fontSize: '11px', fontWeight: 700,
      background: qb.bg, color: qb.text,
    }}>
      {quarter}
    </span>
  );
}

function AssigneeCell({ assignee }: { assignee: Idea['assignee'] }) {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;
  if (!assignee) {
    return <span style={{ fontSize: '13px', color: dk.t3, fontStyle: 'italic' }}>Unassigned</span>;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '24px', height: '24px', borderRadius: '50%', background: '#2563EB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#FFF', fontSize: '10px', fontWeight: 700, flexShrink: 0,
      }}>{assignee.initials}</div>
      <span style={{ fontSize: '13px', color: dk.t2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {assignee.name}
      </span>
    </div>
  );
}

function DateCell({ date }: { date?: string | null }) {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;
  if (!date) return <span style={{ color: dk.t3, fontSize: '12px' }}>—</span>;
  const d = new Date(date);
  const str = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <span style={{ fontSize: '12px', color: dk.t3 }}>
      {str}
    </span>
  );
}
