/**
 * IdeationPage — /producthub/ideation
 * Ideation Module: Page Shell + List View with hardcoded data
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, Sparkles, Download, Plus, ClipboardList, Columns, 
  ScatterChart, BarChart3, ChevronUp, ChevronDown, ArrowUpDown,
  Filter as FilterIcon
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────
type IdeaStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted';
type IdeaType = 'opportunity' | 'solution' | 'feature' | 'improvement' | 'problem';
type ViewTab = 'list' | 'board' | 'matrix' | 'analytics';

interface Assignee {
  name: string;
  initials: string;
  color: string;
}

interface Idea {
  key: string;
  title: string;
  subtitle: string;
  status: IdeaStatus;
  type: IdeaType;
  priority: string;
  impact: number;
  votes: number;
  initiative: string | null;
  dept: string;
  assignee: Assignee | null;
  ai: 'ready' | 'pending';
}

// ─── Data ────────────────────────────────────────────────────────
const ideas: Idea[] = [
  { key: 'IDH-001', title: 'Unified Digital Services Portal', subtitle: 'Ministry Directive · Feb 5', status: 'converted', type: 'opportunity', priority: 'P1', impact: 4.40, votes: 12, initiative: 'INIT-001', dept: 'Digital Trans.', assignee: { name: 'Sarah K.', initials: 'SK', color: '#0D9488' }, ai: 'ready' },
  { key: 'IDH-002', title: 'AI-Powered Permit Classification', subtitle: 'Research · Feb 6', status: 'under_review', type: 'solution', priority: 'P1', impact: 3.90, votes: 8, initiative: null, dept: 'IT Ops', assignee: { name: 'Ahmed M.', initials: 'AM', color: '#2563EB' }, ai: 'ready' },
  { key: 'IDH-003', title: 'Real-Time Factory Compliance Dashboard', subtitle: 'Stakeholder · Feb 7', status: 'submitted', type: 'feature', priority: 'P2', impact: 3.50, votes: 5, initiative: null, dept: 'Data & Analytics', assignee: { name: 'Fatima R.', initials: 'FR', color: '#D97706' }, ai: 'pending' },
  { key: 'IDH-004', title: 'Bilingual Document Generation Engine', subtitle: 'Internal · Feb 8', status: 'under_review', type: 'feature', priority: 'P2', impact: 3.70, votes: 9, initiative: null, dept: 'Digital Trans.', assignee: { name: 'Omar H.', initials: 'OH', color: '#6366F1' }, ai: 'ready' },
  { key: 'IDH-005', title: 'Investor Onboarding Simplification', subtitle: 'Customer · Feb 9', status: 'approved', type: 'improvement', priority: 'P1', impact: 4.60, votes: 15, initiative: null, dept: 'Customer Exp.', assignee: { name: 'Sarah K.', initials: 'SK', color: '#0D9488' }, ai: 'ready' },
  { key: 'IDH-006', title: 'Predictive Maintenance for Legacy Systems', subtitle: 'Internal · Feb 10', status: 'under_review', type: 'solution', priority: 'P2', impact: 2.80, votes: 6, initiative: 'INIT-002', dept: 'IT Ops', assignee: { name: 'Layla S.', initials: 'LS', color: '#E11D48' }, ai: 'ready' },
  { key: 'IDH-007', title: 'Mobile-First Inspection App', subtitle: 'Stakeholder · Feb 10', status: 'submitted', type: 'feature', priority: 'P2', impact: 3.20, votes: 4, initiative: null, dept: 'Risk & Comp.', assignee: { name: 'Khalid B.', initials: 'KB', color: '#0D9488' }, ai: 'ready' },
  { key: 'IDH-008', title: 'Open Data Portal for Industry Statistics', subtitle: 'Ministry · Feb 11', status: 'draft', type: 'opportunity', priority: 'P3', impact: 2.60, votes: 0, initiative: null, dept: 'Data & Anal.', assignee: null, ai: 'pending' },
  { key: 'IDH-009', title: 'Blockchain-Based Certificate Verification', subtitle: 'Research · Feb 12', status: 'rejected', type: 'solution', priority: 'P3', impact: 1.50, votes: -2, initiative: null, dept: 'Cybersecurity', assignee: null, ai: 'ready' },
  { key: 'IDH-010', title: 'Stakeholder Communication Hub', subtitle: 'Internal · Feb 13', status: 'submitted', type: 'feature', priority: 'P2', impact: 3.30, votes: 7, initiative: null, dept: 'Customer Exp.', assignee: { name: 'Nora A.', initials: 'NA', color: '#EA580C' }, ai: 'ready' },
  { key: 'IDH-011', title: 'Automated Regulatory Impact Assessment', subtitle: 'Research · Feb 14', status: 'under_review', type: 'opportunity', priority: 'P1', impact: 4.20, votes: 11, initiative: null, dept: 'Digital Trans.', assignee: { name: 'Ahmed M.', initials: 'AM', color: '#2563EB' }, ai: 'ready' },
  { key: 'IDH-012', title: 'Employee Skills Gap Analysis Tool', subtitle: 'Internal · Feb 14', status: 'draft', type: 'feature', priority: 'P3', impact: 2.40, votes: 0, initiative: null, dept: 'HR', assignee: null, ai: 'pending' },
  { key: 'IDH-013', title: 'Integrated Payment Gateway for Ministry Fees', subtitle: 'Customer · Feb 15', status: 'converted', type: 'feature', priority: 'P1', impact: 4.30, votes: 14, initiative: 'INIT-002', dept: 'IT Ops', assignee: { name: 'Layla S.', initials: 'LS', color: '#E11D48' }, ai: 'ready' },
  { key: 'IDH-014', title: 'Carbon Footprint Tracking Module', subtitle: 'Ministry · Feb 16', status: 'submitted', type: 'opportunity', priority: 'P2', impact: 3.40, votes: 6, initiative: null, dept: 'Data & Anal.', assignee: { name: 'Fatima R.', initials: 'FR', color: '#D97706' }, ai: 'ready' },
  { key: 'IDH-015', title: 'Cross-Ministry Data Sharing Framework', subtitle: 'Internal · Feb 17', status: 'under_review', type: 'solution', priority: 'P1', impact: 4.10, votes: 10, initiative: null, dept: 'IT Ops', assignee: { name: 'Khalid B.', initials: 'KB', color: '#0D9488' }, ai: 'ready' },
];

// ─── Config Maps ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<IdeaStatus, { dot: string; bg: string; text: string; label: string }> = {
  draft:        { dot: '#A1A1AA', bg: '#F4F4F5', text: '#71717A', label: 'Draft' },
  submitted:    { dot: '#2563EB', bg: '#DBEAFE', text: '#1D4ED8', label: 'Submitted' },
  under_review: { dot: '#D97706', bg: '#FEF3C7', text: '#B45309', label: 'Under Review' },
  approved:     { dot: '#16A34A', bg: '#DCFCE7', text: '#15803D', label: 'Approved' },
  rejected:     { dot: '#EF4444', bg: '#FECACA', text: '#B91C1C', label: 'Rejected' },
  converted:    { dot: '#0D9488', bg: '#CCFBF1', text: '#0F766E', label: 'Converted' },
};

const TYPE_CONFIG: Record<IdeaType, { bg: string; text: string; label: string }> = {
  opportunity:  { bg: '#F0FDF4', text: '#15803D', label: 'Opportunity' },
  solution:     { bg: '#FAF5FF', text: '#7C3AED', label: 'Solution' },
  feature:      { bg: '#EFF6FF', text: '#1D4ED8', label: 'Feature' },
  improvement:  { bg: '#FFF7ED', text: '#C2410C', label: 'Improvement' },
  problem:      { bg: '#FEF2F2', text: '#B91C1C', label: 'Problem' },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string }> = {
  P1: { bg: '#FECACA', text: '#991B1B' },
  P2: { bg: '#FED7AA', text: '#9A3412' },
  P3: { bg: '#E4E4E7', text: '#52525B' },
  P4: { bg: '#F4F4F5', text: '#A1A1AA' },
};

const VIEW_TABS: { key: ViewTab; label: string; icon: React.ElementType }[] = [
  { key: 'list', label: 'List', icon: ClipboardList },
  { key: 'board', label: 'Board', icon: Columns },
  { key: 'matrix', label: 'Matrix', icon: ScatterChart },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const VIEW_TITLES: Record<ViewTab, string> = {
  list: 'Idea Backlog',
  board: 'Idea Board',
  matrix: 'Impact Matrix',
  analytics: 'Analytics',
};

type StatusFilter = 'all' | IdeaStatus | 'my_ideas';

const FILTER_PILLS: { key: StatusFilter; label: string; dot?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted', dot: '#2563EB' },
  { key: 'under_review', label: 'Under Review', dot: '#D97706' },
  { key: 'approved', label: 'Approved', dot: '#16A34A' },
  { key: 'converted', label: 'Converted', dot: '#0D9488' },
  { key: 'my_ideas', label: '⭐ My Ideas' },
];

// ─── Helper: Impact bar color ────────────────────────────────────
function getImpactColor(score: number) {
  if (score >= 4.0) return { gradient: 'linear-gradient(90deg, #16A34A, #22C55E)', text: '#16A34A' };
  if (score >= 3.0) return { gradient: 'linear-gradient(90deg, #2563EB, #3B82F6)', text: '#2563EB' };
  if (score >= 2.0) return { gradient: 'linear-gradient(90deg, #D97706, #F59E0B)', text: '#D97706' };
  return { gradient: 'linear-gradient(90deg, #EF4444, #F87171)', text: '#EF4444' };
}

// ─── Component ───────────────────────────────────────────────────
export default function IdeationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as ViewTab | null;
  const activeView: ViewTab = viewParam && ['list', 'board', 'matrix', 'analytics'].includes(viewParam) ? viewParam : 'list';

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const setActiveView = (v: ViewTab) => {
    if (v === 'list') {
      setSearchParams({});
    } else {
      setSearchParams({ view: v });
    }
  };

  const filteredIdeas = useMemo(() => {
    let result = ideas;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.title.toLowerCase().includes(q) || i.key.toLowerCase().includes(q));
    }
    if (activeFilter !== 'all' && activeFilter !== 'my_ideas') {
      result = result.filter(i => i.status === activeFilter);
    }
    return result;
  }, [search, activeFilter]);

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
          <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
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
              15
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{
              background: '#7C3AED', color: '#FFFFFF', border: '1px solid #7C3AED',
              borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}>
              <Sparkles size={14} /> Intelligence
            </button>
            <button style={{
              background: '#FFFFFF', color: '#334155', border: '1px solid #E2E8F0',
              borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}>
              <Download size={14} /> Export
            </button>
            <button style={{
              background: '#2563EB', color: '#FFFFFF', border: 'none',
              borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}>
              <Plus size={14} /> New Idea
            </button>
          </div>
        </div>

        {/* Subtitle */}
        <div style={{ padding: '4px 28px 0' }}>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontFamily: "'Inter', sans-serif" }}>
            Capture, evaluate, and promote ideas into initiatives — powered by IMPACT scoring & AI Intelligence
          </p>
        </div>

        {/* View Tabs */}
        <div style={{ padding: '12px 28px 0', display: 'flex', gap: '0' }}>
          {VIEW_TABS.map(tab => {
            const isActive = activeView === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key)}
                style={{
                  background: 'none', border: 'none', borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  padding: '8px 16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontSize: '13px', fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'color 150ms, border-color 150ms',
                }}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.key === 'list' && (
                  <span style={{
                    background: isActive ? '#EFF6FF' : '#F8FAFC',
                    border: `1px solid ${isActive ? '#BFDBFE' : '#E2E8F0'}`,
                    borderRadius: '10px', padding: '0 6px', fontSize: '10px', fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: isActive ? '#2563EB' : '#94A3B8',
                  }}>
                    15
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Stats Bar ─── */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'stretch',
      }}>
        {[
          { label: 'TOTAL IDEAS', value: '15', color: '#0F172A', trend: '↑ 3 this week', trendColor: '#16A34A' },
          { label: 'AVG IMPACT', value: '3.72', color: '#2563EB', trend: '↑ 0.4', trendColor: '#16A34A' },
          { label: 'PENDING REVIEW', value: '4', color: '#D97706', trend: '—', trendColor: '#94A3B8' },
          { label: 'CONVERSION RATE', value: '13.3%', color: '#0D9488', trend: '2 → Initiatives', trendColor: '#16A34A' },
          { label: 'AI ENRICHED', value: '11', color: '#7C3AED', trend: '73%', trendColor: '#7C3AED' },
        ].map((stat, i, arr) => (
          <div key={stat.label} style={{
            flex: 1, padding: '14px 20px',
            borderRight: i < arr.length - 1 ? '1px solid #E2E8F0' : 'none',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#94A3B8', marginBottom: '4px', fontFamily: "'Inter', sans-serif" }}>
              {stat.label}
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
              fontFamily: "'Inter', sans-serif",
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
                fontFamily: "'Inter', sans-serif",
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
        <button style={{
          background: '#7C3AED', color: '#FFFFFF', border: 'none', borderRadius: '6px',
          padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
          <Sparkles size={12} /> AI Triage (4)
        </button>
      </div>

      {/* ─── View Content ─── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 28px 24px' }}>
        {activeView === 'list' ? (
          <IdeationListView
            ideas={filteredIdeas}
            selectedRows={selectedRows}
            toggleRow={toggleRow}
            toggleAll={toggleAll}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#94A3B8', fontSize: '15px', fontWeight: 500 }}>
            {VIEW_TITLES[activeView]} — Coming Soon
          </div>
        )}
      </div>
    </div>
  );
}

// ─── List View Component ─────────────────────────────────────────
function IdeationListView({ ideas, selectedRows, toggleRow, toggleAll }: {
  ideas: Idea[];
  selectedRows: Set<string>;
  toggleRow: (key: string) => void;
  toggleAll: () => void;
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
              <input
                type="checkbox"
                checked={selectedRows.size === ideas.length && ideas.length > 0}
                onChange={toggleAll}
                style={{ cursor: 'pointer', accentColor: '#2563EB' }}
              />
            </th>
            {['KEY', 'TITLE', 'STATUS', 'TYPE', 'PRI', 'IMPACT', 'VOTES', 'INITIATIVE', 'DEPT', 'ASSIGNEE', 'AI'].map((col, i) => (
              <th key={col} style={{
                textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px', color: '#94A3B8', padding: '0 8px',
                fontFamily: "'Inter', sans-serif",
                width: i === 0 ? '80px' : i === 1 ? undefined : i === 2 ? '120px' : i === 3 ? '100px'
                  : i === 4 ? '50px' : i === 5 ? '110px' : i === 6 ? '80px' : i === 7 ? '100px'
                  : i === 8 ? '110px' : i === 9 ? '120px' : '60px',
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
              style={{
                height: '44px', cursor: 'pointer',
                borderBottom: rowIdx < ideas.length - 1 ? '1px solid #F4F4F5' : 'none',
                background: selectedRows.has(idea.key) ? '#F0F4FF' : undefined,
                transition: 'background 100ms',
              }}
              onMouseEnter={e => { if (!selectedRows.has(idea.key)) e.currentTarget.style.background = '#FAFBFF'; }}
              onMouseLeave={e => { if (!selectedRows.has(idea.key)) e.currentTarget.style.background = ''; }}
            >
              {/* Checkbox */}
              <td style={{ padding: '0 8px' }}>
                <input type="checkbox" checked={selectedRows.has(idea.key)} onChange={() => toggleRow(idea.key)} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
              </td>

              {/* KEY */}
              <td style={{ padding: '0 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}>
                {idea.key}
              </td>

              {/* TITLE */}
              <td style={{ padding: '0 8px', maxWidth: '260px' }}>
                <div style={{
                  fontSize: '13px', fontWeight: 600,
                  color: idea.status === 'converted' ? '#0D9488' : '#0F172A',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {idea.title}
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>{idea.subtitle}</div>
              </td>

              {/* STATUS */}
              <td style={{ padding: '0 8px' }}>
                <StatusBadge status={idea.status} />
              </td>

              {/* TYPE */}
              <td style={{ padding: '0 8px' }}>
                <TypeBadge type={idea.type} />
              </td>

              {/* PRIORITY */}
              <td style={{ padding: '0 8px' }}>
                <PriorityBadge priority={idea.priority} />
              </td>

              {/* IMPACT */}
              <td style={{ padding: '0 8px' }}>
                <ImpactCell score={idea.impact} />
              </td>

              {/* VOTES */}
              <td style={{ padding: '0 8px' }}>
                <VotesCell votes={idea.votes} />
              </td>

              {/* INITIATIVE */}
              <td style={{ padding: '0 8px' }}>
                {idea.initiative ? (
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700,
                    color: '#0D9488', background: '#F0FDFA', border: '1px solid #CCFBF1',
                    borderRadius: '4px', padding: '2px 6px',
                  }}>
                    {idea.initiative}
                  </span>
                ) : (
                  <span style={{ color: '#94A3B8', fontSize: '13px' }}>—</span>
                )}
              </td>

              {/* DEPT */}
              <td style={{ padding: '0 8px', fontSize: '12px', color: '#334155', fontFamily: "'Inter', sans-serif" }}>
                {idea.dept}
              </td>

              {/* ASSIGNEE */}
              <td style={{ padding: '0 8px' }}>
                <AssigneeCell assignee={idea.assignee} />
              </td>

              {/* AI */}
              <td style={{ padding: '0 8px' }}>
                <AiBadge ai={idea.ai} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{
        padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid #F4F4F5',
      }}>
        <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
          Showing 1–{ideas.length} of {ideas.length} ideas
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1].map(p => (
            <button key={p} style={{
              width: '28px', height: '28px', borderRadius: '6px',
              border: '1px solid #E2E8F0', background: p === 1 ? '#2563EB' : '#FFFFFF',
              color: p === 1 ? '#FFFFFF' : '#334155', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {p}
            </button>
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
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: c.bg, color: c.text, padding: '3px 10px', borderRadius: '20px',
      fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

function TypeBadge({ type }: { type: IdeaType }) {
  const c = TYPE_CONFIG[type];
  return (
    <span style={{
      background: c.bg, color: c.text, padding: '2px 8px', borderRadius: '4px',
      fontSize: '11px', fontWeight: 600,
    }}>
      {c.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const c = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.P4;
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 800,
      background: c.bg, color: c.text, padding: '2px 7px', borderRadius: '4px',
    }}>
      {priority}
    </span>
  );
}

function ImpactCell({ score }: { score: number }) {
  const { gradient, text } = getImpactColor(score);
  const fill = (score / 5) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '52px', height: '6px', background: '#E4E4E7', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${fill}%`, height: '100%', background: gradient, borderRadius: '3px' }} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: text }}>
        {score.toFixed(2)}
      </span>
    </div>
  );
}

function VotesCell({ votes }: { votes: number }) {
  const color = votes > 0 ? '#16A34A' : votes < 0 ? '#EF4444' : '#94A3B8';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <button style={{
        width: '22px', height: '22px', borderRadius: '4px', border: 'none',
        background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#94A3B8', fontSize: '12px',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <ChevronUp size={14} />
      </button>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color, minWidth: '16px', textAlign: 'center' }}>
        {votes}
      </span>
      <button style={{
        width: '22px', height: '22px', borderRadius: '4px', border: 'none',
        background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#94A3B8', fontSize: '12px',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <ChevronDown size={14} />
      </button>
    </div>
  );
}

function AssigneeCell({ assignee }: { assignee: Assignee | null }) {
  if (!assignee) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          width: '22px', height: '22px', borderRadius: '50%', border: '1.5px dashed #CBD5E1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} />
        <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>Unassigned</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width: '22px', height: '22px', borderRadius: '50%', background: assignee.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#FFFFFF', fontSize: '9px', fontWeight: 700, fontFamily: "'Inter', sans-serif",
      }}>
        {assignee.initials}
      </div>
      <span style={{ fontSize: '12px', color: '#334155', fontFamily: "'Inter', sans-serif" }}>{assignee.name}</span>
    </div>
  );
}

function AiBadge({ ai }: { ai: 'ready' | 'pending' }) {
  if (ai === 'ready') {
    return (
      <span style={{
        background: '#EDE9FE', color: '#7C3AED', padding: '2px 7px', borderRadius: '4px',
        fontSize: '10px', fontWeight: 600,
      }}>
        ✦ Ready
      </span>
    );
  }
  return (
    <span style={{
      background: '#FEF3C7', color: '#B45309', padding: '2px 7px', borderRadius: '4px',
      fontSize: '10px', fontWeight: 600,
    }}>
      ⏳ Pending
    </span>
  );
}
