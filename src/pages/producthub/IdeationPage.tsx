/**
 * IdeationPage — /producthub/ideation
 * Ideation Module: Page Shell with sidebar-driven view switching
 * Tabs removed — sidebar items are sole navigators
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, Download, Plus, ChevronUp, ChevronDown, ArrowUpDown,
} from 'lucide-react';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';
import {
  Idea, IdeationView, IdeaStatus, StatusFilter, VIEW_TITLES,
  STATUS_CONFIG, TYPE_CONFIG, PRIORITY_CONFIG, FILTER_PILLS, getImpactColor,
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

// ─── Component ───────────────────────────────────────────────────
export default function IdeationPage() {
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as string | null;
  const activeView: IdeationView = (viewParam && ['board', 'matrix', 'analytics', 'drives'].includes(viewParam))
    ? viewParam as IdeationView : 'list';

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  // FIX 2: Reset filter when view changes
  const prevViewRef = React.useRef(activeView);
  React.useEffect(() => {
    if (prevViewRef.current !== activeView) {
      setActiveFilter('all');
      prevViewRef.current = activeView;
    }
  }, [activeView]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  // Track converted ideas: key → initiative key (e.g., 'IDH-005' → 'MIM-006')
  const [convertedIdeas, setConvertedIdeas] = useState<Record<string, string>>({});

  // Panel states
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);

  // Convert to Initiative
  const [convertDrawerOpen, setConvertDrawerOpen] = useState(false);
  const [conversionSource, setConversionSource] = useState<ConversionSource | null>(null);

  // ── Supabase data ──
  const { data: ideasData = [], isLoading } = useIdeas({
    status: activeFilter !== 'all' && activeFilter !== 'my_ideas' ? activeFilter : undefined,
    search: search || undefined,
  });

  const handleConvertIdea = useCallback((ideaKey: string) => {
    const idea = ideasData.find(i => i.key === ideaKey);
    if (!idea) return;
      // Fetch the real description from the idea's raw data
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

  // Apply conversions to the ideas list
  const ideasWithConversions = useMemo(() => {
    return ideasData.map(idea => {
      if (convertedIdeas[idea.key]) {
        return { ...idea, status: 'converted' as IdeaStatus, initiative: convertedIdeas[idea.key] };
      }
      return idea;
    });
  }, [convertedIdeas, ideasData]);

  const filteredIdeas = useMemo(() => {
    // Filtering is now done server-side via useIdeas, just apply local conversions
    return ideasWithConversions;
  }, [ideasWithConversions]);

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

  const pageTitle = VIEW_TITLES[activeView];

  return (
    <div className="flex flex-col h-full" style={{ background: '#F8FAFC' }}>
      {/* ─── Page Header ─── */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
        {/* Breadcrumb */}
        <div style={{ padding: '12px 28px 0' }}>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>
            ProductHub › Ideation › {pageTitle}
          </span>
        </div>

        {/* Title Row */}
        <div style={{ padding: '8px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', margin: 0, fontFamily: "'Sora', sans-serif" }}>
              {pageTitle}
            </h1>
            <span style={{
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px',
              padding: '1px 7px', fontSize: '11px', fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace", color: '#94A3B8',
            }}>
              {isLoading ? '…' : ideasData.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <AIIntelligenceButton label="Intelligence" onClick={() => setIntelligenceOpen(true)} />
            <button style={{
              background: '#FFFFFF', color: '#334155', border: '1px solid #E2E8F0',
              borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}>
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => setWizardOpen(true)}
              style={{
                background: '#2563EB', color: '#FFFFFF', border: 'none',
                borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
              }}
            >
              + New Idea
            </button>
          </div>
        </div>

        {/* Subtitle */}
        <div style={{ padding: '4px 28px 14px' }}>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Capture, evaluate, and promote ideas into initiatives — powered by IMPACT scoring & AI Intelligence
          </p>
        </div>
      </div>

      {/* ─── Stats Bar ─── */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'stretch',
      }}>
        {(() => {
          // Use ideasWithConversions to include local conversion overrides
          const allIdeas = ideasWithConversions;
          const total = allIdeas.length;
          const avgImpact = total > 0 ? (allIdeas.reduce((s, i) => s + i.impact, 0) / total).toFixed(2) : '0';
          const pendingReview = allIdeas.filter(i => i.status === 'under_review').length;
          const converted = allIdeas.filter(i => i.status === 'converted').length;
          const convRate = total > 0 ? (converted / total * 100).toFixed(1) + '%' : '0%';
          const aiReady = allIdeas.filter(i => i.ai === 'ready').length;
          const aiPct = total > 0 ? Math.round(aiReady / total * 100) + '%' : '0%';
          return [
            { label: 'TOTAL IDEAS', value: String(total), color: '#0F172A', trend: '', trendColor: '#16A34A' },
            { label: 'AVG IMPACT', value: avgImpact, color: '#0F172A', trend: '', trendColor: '#16A34A' },
            { label: 'PENDING REVIEW', value: String(pendingReview), color: '#0F172A', trend: '—', trendColor: '#94A3B8' },
            { label: 'CONVERSION RATE', value: convRate, color: '#0F172A', trend: `${converted} → Initiatives`, trendColor: '#16A34A' },
            { label: 'AI ENRICHED', value: String(aiReady), color: '#0F172A', trend: aiPct, trendColor: '#7C3AED' },
          ];
        })().map((stat, i, arr) => (
          <div key={stat.label} style={{
            flex: 1, padding: '14px 20px',
            borderRight: i < arr.length - 1 ? '1px solid #E2E8F0' : 'none',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#94A3B8', marginBottom: '4px' }}>
              {stat.label}{activeFilter !== 'all' && stat.label === 'TOTAL IDEAS' && <span style={{ fontSize: '10px', color: '#94A3B8', marginLeft: '4px', fontWeight: 400 }}>(filtered)</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.5px', color: stat.color }}>
                {stat.value}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: stat.trendColor }}>
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filtered context indicator */}
      {activeFilter !== 'all' && (
        <div style={{ padding: '6px 28px', background: '#EFF6FF', borderBottom: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#2563EB' }}>
            Showing {activeFilter.replace('_', ' ')} ideas only
          </span>
          <span style={{ color: '#94A3B8' }}>·</span>
          <button onClick={() => setActiveFilter('all')} style={{ fontSize: '11px', color: '#2563EB', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Clear filter
          </button>
        </div>
      )}

      {/* ─── Toolbar ─── */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
        padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ideas..."
            style={{
              width: '100%', height: '32px', paddingLeft: '32px', paddingRight: '10px',
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px',
              fontSize: '13px', color: '#0F172A', outline: 'none',
            }}
            onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; e.currentTarget.style.borderColor = '#2563EB'; }}
            onBlur={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          />
        </div>

        {/* Filter pills */}
        {FILTER_PILLS.map(pill => {
          const isActive = activeFilter === pill.key;
          return (
            <button
              key={pill.key}
              onClick={() => setActiveFilter(pill.key)}
              style={{
                background: isActive ? '#2563EB' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#334155',
                border: `1px solid ${isActive ? '#2563EB' : '#E2E8F0'}`,
                borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                transition: 'all 150ms',
              }}
            >
              {pill.dot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#FFFFFF' : pill.dot, flexShrink: 0 }} />}
              {pill.label}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />
        <div style={{ width: '1px', height: '24px', background: '#E2E8F0' }} />

        <button style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: 500, color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ArrowUpDown size={13} /> Group
        </button>
        <button style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: 500, color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ArrowUpDown size={13} /> Rank
        </button>
        <AIIntelligenceButton label={`AI Triage (${ideasData.length})`} onClick={() => setTriageOpen(true)} />
      </div>

      {/* ─── View Content ─── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeView === 'list' && (
          <div style={{ padding: '16px 28px 24px' }}>
            <IdeationListView
              ideas={filteredIdeas}
              selectedRows={selectedRows}
              toggleRow={toggleRow}
              toggleAll={toggleAll}
              onOpenDetail={setDetailKey}
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
          <IdeationAnalyticsView />
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
          // Mark source ideas as converted
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
function IdeationListView({ ideas, selectedRows, toggleRow, toggleAll, onOpenDetail }: {
  ideas: Idea[];
  selectedRows: Set<string>;
  toggleRow: (key: string) => void;
  toggleAll: () => void;
  onOpenDetail: (key: string) => void;
}) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)', overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ height: '36px', background: '#FAFAFA' }}>
            <th style={{ width: '32px', padding: '0 8px' }}>
              <input type="checkbox" checked={selectedRows.size === ideas.length && ideas.length > 0} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
            </th>
            {['KEY', 'TITLE', 'STATUS', 'TYPE', 'PRI', 'IMPACT', 'VOTES', 'INITIATIVE', 'DEPT', 'ASSIGNEE', 'AI'].map((col, i) => (
              <th key={col} style={{
                textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px', color: '#94A3B8', padding: '0 8px',
                width: i === 0 ? '80px' : i === 1 ? undefined : i === 2 ? '120px' : i === 3 ? '100px'
                  : i === 4 ? '50px' : i === 5 ? '110px' : i === 6 ? '80px' : i === 7 ? '100px'
                  : i === 8 ? '110px' : i === 9 ? '120px' : '40px',
              }}>
                {col}
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
                height: '44px', cursor: 'pointer',
                borderBottom: rowIdx < ideas.length - 1 ? '1px solid #F4F4F5' : 'none',
                background: selectedRows.has(idea.key) ? '#F0F4FF' : undefined,
                transition: 'background 100ms',
              }}
              onMouseEnter={e => { if (!selectedRows.has(idea.key)) e.currentTarget.style.background = '#FAFBFF'; }}
              onMouseLeave={e => { if (!selectedRows.has(idea.key)) e.currentTarget.style.background = ''; }}
            >
              <td style={{ padding: '0 8px' }} onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selectedRows.has(idea.key)} onChange={() => toggleRow(idea.key)} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
              </td>
              <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}>
                {idea.key}
              </td>
              <td style={{ padding: '0 8px', maxWidth: '260px' }}>
                <div style={{
                  fontSize: '13px', fontWeight: 600,
                  color: idea.status === 'converted' ? '#0D9488' : '#0F172A',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {idea.title}
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>{idea.subtitle}</div>
              </td>
              <td style={{ padding: '0 8px' }}><StatusBadge status={idea.status} /></td>
              <td style={{ padding: '0 8px' }}><TypeBadge type={idea.type} /></td>
              <td style={{ padding: '0 8px' }}><PriorityBadge priority={idea.priority} /></td>
              <td style={{ padding: '0 8px' }}><ImpactCell score={idea.impact} /></td>
              <td style={{ padding: '0 8px' }} onClick={e => e.stopPropagation()}><VotesCell votes={idea.votes} /></td>
              <td style={{ padding: '0 8px' }}>
                {idea.initiative ? (
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700,
                    color: '#0D9488', background: '#F0FDFA', border: '1px solid #CCFBF1',
                    borderRadius: '4px', padding: '2px 6px',
                  }}>{idea.initiative}</span>
                ) : <span style={{ color: '#94A3B8', fontSize: '13px' }}>—</span>}
              </td>
              <td style={{ padding: '0 8px', fontSize: '12px', color: '#334155' }}>{idea.dept}</td>
              <td style={{ padding: '0 8px' }}><AssigneeCell assignee={idea.assignee} /></td>
              <td style={{ padding: '0 8px' }}><AiBadge ai={idea.ai} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{
        padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid #F4F4F5',
      }}>
        <span style={{ fontSize: '12px', color: '#94A3B8' }}>Showing 1–{ideas.length} of {ideas.length} ideas</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1].map(p => (
            <button key={p} style={{
              width: '28px', height: '28px', borderRadius: '6px',
              border: '1px solid #E2E8F0', background: p === 1 ? '#2563EB' : '#FFFFFF',
              color: p === 1 ? '#FFFFFF' : '#334155', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{p}</button>
          ))}
        </div>
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
      height: 20, padding: '0 6px', borderRadius: 3,
      fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
      textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>
      {c.label}
    </span>
  );
}

function TypeBadge({ type }: { type: Idea['type'] }) {
  const c = TYPE_CONFIG[type];
  return <span style={{ background: c.bg, color: c.text, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{c.label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const c = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.P4;
  return <span style={{
    fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 700,
    background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    height: 20, padding: '0 7px', borderRadius: '3px',
    display: 'inline-flex', alignItems: 'center',
  }}>{priority}</span>;
}

function ImpactCell({ score }: { score: number }) {
  const { gradient, text } = getImpactColor(score);
  const fill = (score / 5) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '52px', height: '6px', background: '#E4E4E7', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${fill}%`, height: '100%', background: gradient, borderRadius: '3px' }} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: text }}>{score.toFixed(2)}</span>
    </div>
  );
}

function VotesCell({ votes }: { votes: number }) {
  const color = votes > 0 ? '#16A34A' : votes < 0 ? '#EF4444' : '#94A3B8';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <button style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      ><ChevronUp size={14} /></button>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color, minWidth: '16px', textAlign: 'center' }}>{votes}</span>
      <button style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      ><ChevronDown size={14} /></button>
    </div>
  );
}

function AssigneeCell({ assignee }: { assignee: Idea['assignee'] }) {
  if (!assignee) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1.5px dashed #CBD5E1' }} />
        <span style={{ fontSize: '12px', color: '#94A3B8' }}>Unassigned</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: assignee.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '9px', fontWeight: 700 }}>{assignee.initials}</div>
      <span style={{ fontSize: '12px', color: '#334155' }}>{assignee.name}</span>
    </div>
  );
}

function AiBadge({ ai }: { ai: 'ready' | 'pending' }) {
  if (ai === 'ready') {
    return <span style={{ fontSize: '14px', fontWeight: 700, color: '#7C3AED', textAlign: 'center', display: 'block' }}>✦</span>;
  }
  return null;
}
