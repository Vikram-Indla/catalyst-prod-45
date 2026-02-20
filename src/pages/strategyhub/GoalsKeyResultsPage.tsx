/**
 * GoalsKeyResultsPage — Main page composing stats, toolbar, views, drawer & modals
 * Route: /strategyhub/goals
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { useGoals, useAllKeyResults, useThemes } from '@/hooks/useGoals';
import { GoalsStatsStrip } from '@/components/goals/GoalsStatsStrip';
import { GoalsToolbar } from '@/components/goals/GoalsToolbar';
import { GoalsTreeView } from '@/components/goals/GoalsTreeView';
import { GoalsListView } from '@/components/goals/GoalsListView';
import { GoalsHeatmapView } from '@/components/goals/GoalsHeatmapView';
import { GoalDetailDrawer } from '@/components/goals/GoalDetailDrawer';
import { CreateGoalModal } from '@/components/goals/CreateGoalModal';
import { CheckinModal } from '@/components/goals/CheckinModal';

export default function GoalsKeyResultsPage() {
  const navigate = useNavigate();
  const { data: goals = [], isLoading: goalsLoading } = useGoals();
  const { data: allKRs = [] } = useAllKeyResults();
  const { data: themes = [] } = useThemes();

  const [currentView, setCurrentView] = useState<'tree' | 'list' | 'heatmap'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [isAllExpanded, setIsAllExpanded] = useState(true);

  // Interactive state
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [checkinKrId, setCheckinKrId] = useState<string | null>(null);

  // Auto-expand all themes on first load
  useEffect(() => {
    if (themes.length > 0 && expandedThemes.size === 0) {
      setExpandedThemes(new Set(themes.map(t => t.id)));
      setIsAllExpanded(true);
    }
  }, [themes.length]);

  const handleToggleTheme = useCallback((id: string) => {
    setExpandedThemes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleToggleGoal = useCallback((id: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (isAllExpanded) {
      setExpandedThemes(new Set());
      setExpandedGoals(new Set());
      setIsAllExpanded(false);
    } else {
      setExpandedThemes(new Set(themes.map(t => t.id)));
      setExpandedGoals(new Set(goals.map(g => g.id)));
      setIsAllExpanded(true);
    }
  }, [isAllExpanded, themes, goals]);

  const isLoading = goalsLoading;

  return (
    <div style={{ padding: '16px 24px 24px' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/strategyhub')}>
          StrategyHub
        </span>
        <span style={{ margin: '0 4px', color: '#94A3B8' }}>›</span>
        <span style={{ fontWeight: 600, color: '#0F172A' }}>Goals &amp; Key Results</span>
      </nav>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Goals &amp; Key Results
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', fontSize: 13, fontWeight: 600,
            color: '#FFFFFF', backgroundColor: '#2563EB',
            border: 'none', borderRadius: 6, cursor: 'pointer',
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          New Goal
        </button>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 8, color: '#94A3B8' }}>
          <Loader2 size={20} className="animate-spin" />
          <span style={{ fontSize: 13 }}>Loading goals...</span>
        </div>
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
              goals={goals}
              keyResults={allKRs}
              themes={themes}
              searchQuery={searchQuery}
              expandedThemes={expandedThemes}
              expandedGoals={expandedGoals}
              onToggleTheme={handleToggleTheme}
              onToggleGoal={handleToggleGoal}
              onGoalClick={setSelectedGoalId}
              onCheckinClick={setCheckinKrId}
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
      <GoalDetailDrawer
        goalId={selectedGoalId}
        isOpen={!!selectedGoalId}
        onClose={() => setSelectedGoalId(null)}
        onCheckinClick={setCheckinKrId}
      />
      <CreateGoalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      <CheckinModal
        krId={checkinKrId}
        isOpen={!!checkinKrId}
        onClose={() => setCheckinKrId(null)}
      />
    </div>
  );
}
