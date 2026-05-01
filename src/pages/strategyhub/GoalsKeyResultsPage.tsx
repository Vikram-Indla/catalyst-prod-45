/**
 * GoalsKeyResultsPage — Main page composing stats, toolbar, views, drawer & modals
 * ECLIPSE D8: Dark mode parity
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useNavigate } from 'react-router-dom';
import { Plus, Download } from 'lucide-react';
import { useGoals, useAllKeyResults, useThemes } from '@/hooks/useGoals';
import { GoalsStatsStrip, GoalsStatsStripSkeleton } from '@/components/goals/GoalsStatsStrip';
import { GoalsToolbar } from '@/components/goals/GoalsToolbar';
import { GoalsTreeView, GoalsTreeSkeleton, GoalsEmptyState } from '@/components/goals/GoalsTreeView';
import { GoalsListView } from '@/components/goals/GoalsListView';
import { GoalsHeatmapView } from '@/components/goals/GoalsHeatmapView';
import { GoalDetailDrawer } from '@/components/goals/GoalDetailDrawer';
import { CreateGoalModal } from '@/components/goals/CreateGoalModal';
import { CheckinModal } from '@/components/goals/CheckinModal';
import { useIsDark } from '@/components/strategy/themes/useIsDark';

// Dark mode tokens
const DK = {
  bg: '#0A0A0A',
  t1: 'var(--cp-t1)',
  t2: 'var(--cp-t2)',
  t3: 'var(--cp-t3)',
  t4: 'var(--cp-t4)',
  border: '#2E2E2E',
  borderSubtle: '#2E2E2E',
  hover: '#1F1F1F',
};

export default function GoalsKeyResultsPage() {
  const navigate = useNavigate();
  const isDark = useIsDark();
  const { data: goals = [], isLoading: goalsLoading } = useGoals();
  const { data: allKRs = [], isLoading: krsLoading } = useAllKeyResults();
  const { data: themes = [] } = useThemes();

  const [currentView, setCurrentView] = useState<'tree' | 'list' | 'heatmap'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [isAllExpanded, setIsAllExpanded] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [checkinKrId, setCheckinKrId] = useState<string | null>(null);

  useEffect(() => {
    if (themes.length > 0 && expandedThemes.size === 0) {
      setExpandedThemes(new Set(themes.map(t => t.id)));
      setIsAllExpanded(true);
    }
  }, [themes.length]);

  const handleToggleTheme = useCallback((id: string) => {
    setExpandedThemes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const handleToggleGoal = useCallback((id: string) => {
    setExpandedGoals(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (isAllExpanded) { setExpandedThemes(new Set()); setExpandedGoals(new Set()); setIsAllExpanded(false); }
    else { setExpandedThemes(new Set(themes.map(t => t.id))); setExpandedGoals(new Set(goals.map(g => g.id))); setIsAllExpanded(true); }
  }, [isAllExpanded, themes, goals]);

  const filteredGoals = useMemo(() => {
    let result = goals;
    if (activeFilters.status?.length) result = result.filter(g => activeFilters.status.includes(g.status));
    if (activeFilters.theme?.length) result = result.filter(g => activeFilters.theme.includes(g.theme_id));
    if (activeFilters.owner?.length) result = result.filter(g => g.owner_id && activeFilters.owner.includes(g.owner_id));
    if (activeFilters.quarter?.length) result = result.filter(g => g.fiscal_quarter && activeFilters.quarter.includes(g.fiscal_quarter));
    return result;
  }, [goals, activeFilters]);

  const filterOptions = useMemo(() => {
    const statuses = [...new Set(goals.map(g => g.status))];
    const ownerMap = new Map<string, string>();
    goals.forEach(g => { if (g.owner_id && g.owner_name) ownerMap.set(g.owner_id, g.owner_name); });
    const quarters = [...new Set(goals.map(g => g.fiscal_quarter).filter(Boolean))] as string[];
    return {
      statuses,
      themes: themes.map(t => ({ id: t.id, title: t.title, color: t.color })),
      owners: Array.from(ownerMap.entries()).map(([id, name]) => ({ id, name })),
      quarters: quarters.sort(),
    };
  }, [goals, themes]);

  const handleHeatmapCellClick = useCallback((themeId: string, quarter: string) => {
    setActiveFilters({ theme: [themeId], quarter: [quarter] });
    setCurrentView('tree');
    setExpandedThemes(new Set([themeId]));
  }, []);

  const exportCSV = useCallback(() => {
    const headers = ['ID','Title','Theme','Status','Progress','Confidence','KRs','Quarter','Owner'];
    const rows = goals.map(g => {
      const theme = themes.find(t => t.id === g.theme_id);
      const krCount = allKRs.filter(kr => kr.goal_id === g.id).length;
      const conf = typeof g.confidence_level === 'number' ? (g.confidence_level <= 1 ? Math.round(g.confidence_level * 100) : Math.round(g.confidence_level)) : 0;
      return [g.goal_key, g.title, theme?.title || '', g.status, `${Math.round(g.progress_pct || 0)}%`, `${conf}%`, String(krCount), g.fiscal_quarter || '', g.owner_name || ''];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'goals_key_results.csv'; a.click();
    URL.revokeObjectURL(url);
  }, [goals, themes, allKRs]);

  const isLoading = goalsLoading || krsLoading;

  return (
    <div data-goals-page="" style={{ padding: '16px 24px 24px', minHeight: '100%', backgroundColor: 'var(--bg)' }}>
      {/* Inline breadcrumb removed Apr 2026 — Decision A. */}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <CatalystPageHeader title="Goals & Key Results" />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: isDark ? DK.t2 : '#64748B', background: 'var(--cp-bg-elevated, #FFFFFF)', border: `1px solid ${isDark ? DK.border : '#E2E8F0'}`, borderRadius: 6, cursor: 'pointer', boxShadow: isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.04)' }}>
            <Download size={14} /> Export
          </button>
          <button onClick={() => setShowCreateModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600, color: 'var(--ds-text-inverse, #FFFFFF)', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', border: 'none', borderRadius: 6, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.18)' }}>
            <Plus size={15} strokeWidth={2.5} /> New Goal
          </button>
        </div>
      </div>

      {isLoading ? (
        <>
          <GoalsStatsStripSkeleton isDark={isDark} />
          <GoalsTreeSkeleton isDark={isDark} />
        </>
      ) : goals.length === 0 ? (
        <GoalsEmptyState onCreateGoal={() => setShowCreateModal(true)} isDark={isDark} />
      ) : (
        <>
          <GoalsStatsStrip goals={filteredGoals} keyResults={allKRs} themes={themes} isDark={isDark} />

          <GoalsToolbar
            currentView={currentView}
            onViewChange={setCurrentView}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            onExpandAll={handleExpandAll}
            isAllExpanded={isAllExpanded}
            activeFilters={activeFilters}
            onFiltersChange={setActiveFilters}
            filterOptions={filterOptions}
            isDark={isDark}
          />

          {currentView === 'tree' && (
            <GoalsTreeView
              goals={filteredGoals} keyResults={allKRs} themes={themes}
              searchQuery={searchQuery}
              expandedThemes={expandedThemes} expandedGoals={expandedGoals}
              onToggleTheme={handleToggleTheme} onToggleGoal={handleToggleGoal}
              onGoalClick={setSelectedGoalId} onCheckinClick={setCheckinKrId}
              onClearSearch={() => setSearchQuery('')}
              isDark={isDark}
            />
          )}

          {currentView === 'list' && (
            <GoalsListView goals={filteredGoals} themes={themes} onGoalClick={setSelectedGoalId} isDark={isDark} />
          )}

          {currentView === 'heatmap' && (
            <GoalsHeatmapView goals={filteredGoals} themes={themes} onCellClick={handleHeatmapCellClick} isDark={isDark} />
          )}
        </>
      )}

      <GoalDetailDrawer goalId={selectedGoalId} isOpen={!!selectedGoalId} onClose={() => setSelectedGoalId(null)} onCheckinClick={setCheckinKrId} />
      <CreateGoalModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <CheckinModal krId={checkinKrId} isOpen={!!checkinKrId} onClose={() => setCheckinKrId(null)} />
    </div>
  );
}
