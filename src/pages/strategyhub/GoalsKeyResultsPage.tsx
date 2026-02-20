/**
 * GoalsKeyResultsPage — Main page composing stats, toolbar, views, drawer & modals
 * FIX 2: Shimmer skeletons, FIX 3: Empty states, FIX 4: Export CSV, FIX 6: Responsive
 */
import { useState, useEffect, useCallback } from 'react';
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

export default function GoalsKeyResultsPage() {
  const navigate = useNavigate();
  const { data: goals = [], isLoading: goalsLoading } = useGoals();
  const { data: allKRs = [], isLoading: krsLoading } = useAllKeyResults();
  const { data: themes = [] } = useThemes();

  const [currentView, setCurrentView] = useState<'tree' | 'list' | 'heatmap'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [isAllExpanded, setIsAllExpanded] = useState(true);

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

  // FIX 4: Export CSV
  const exportCSV = useCallback(() => {
    const headers = ['ID','Title','Theme','Status','Progress','Confidence','KRs','Quarter','Owner'];
    const rows = goals.map(g => {
      const theme = themes.find(t => t.id === g.theme_id);
      const krCount = allKRs.filter(kr => kr.goal_id === g.id).length;
      const conf = typeof g.confidence_level === 'number' ? (g.confidence_level <= 1 ? Math.round(g.confidence_level * 100) : Math.round(g.confidence_level)) : 0;
      return [g.goal_key, g.title, theme?.title || '', g.status, `${Math.round(g.progress_pct || 0)}%`, `${conf}%`, String(krCount), g.fiscal_quarter || '', ''];
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
    <div style={{ padding: '16px 24px 24px' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }} aria-label="Breadcrumb">
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/strategyhub')}>StrategyHub</span>
        <span style={{ margin: '0 4px', color: '#94A3B8' }}>›</span>
        <span style={{ fontWeight: 600, color: '#0F172A' }}>Goals &amp; Key Results</span>
      </nav>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>Goals &amp; Key Results</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={exportCSV}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#64748B', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer' }}
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600, color: '#FFFFFF', backgroundColor: '#2563EB', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            <Plus size={15} strokeWidth={2.5} /> New Goal
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <>
          <GoalsStatsStripSkeleton />
          <GoalsTreeSkeleton />
        </>
      ) : goals.length === 0 ? (
        /* Empty state */
        <GoalsEmptyState onCreateGoal={() => setShowCreateModal(true)} />
      ) : (
        <>
          <GoalsStatsStrip goals={goals} keyResults={allKRs} themes={themes} />

          <GoalsToolbar
            currentView={currentView}
            onViewChange={setCurrentView}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            onExpandAll={handleExpandAll}
            isAllExpanded={isAllExpanded}
          />

          {currentView === 'tree' && (
            <GoalsTreeView
              goals={goals} keyResults={allKRs} themes={themes}
              searchQuery={searchQuery}
              expandedThemes={expandedThemes} expandedGoals={expandedGoals}
              onToggleTheme={handleToggleTheme} onToggleGoal={handleToggleGoal}
              onGoalClick={setSelectedGoalId} onCheckinClick={setCheckinKrId}
              onClearSearch={() => setSearchQuery('')}
            />
          )}

          {currentView === 'list' && (
            <GoalsListView goals={goals} themes={themes} onGoalClick={setSelectedGoalId} />
          )}

          {currentView === 'heatmap' && (
            <GoalsHeatmapView goals={goals} themes={themes} />
          )}
        </>
      )}

      {/* Interactive overlays */}
      <GoalDetailDrawer goalId={selectedGoalId} isOpen={!!selectedGoalId} onClose={() => setSelectedGoalId(null)} onCheckinClick={setCheckinKrId} />
      <CreateGoalModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <CheckinModal krId={checkinKrId} isOpen={!!checkinKrId} onClose={() => setCheckinKrId(null)} />
    </div>
  );
}
