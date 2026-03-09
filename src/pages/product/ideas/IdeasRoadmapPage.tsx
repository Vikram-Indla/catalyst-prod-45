import React, { useState, useMemo } from 'react';
import { useRoadmapIdeas, useUpdateIdeaCommitted, useUpdateMilestones, useConvertToInitiative } from '@/hooks/useIdeasRoadmap';
import { RoadmapToolbar } from '@/components/ideas-roadmap/RoadmapToolbar';
import { RoadmapFilters } from '@/components/ideas-roadmap/RoadmapFilters';
import { RoadmapKanban } from '@/components/ideas-roadmap/RoadmapKanban';
import { RoadmapDatesTable } from '@/components/ideas-roadmap/RoadmapDatesTable';
import { RoadmapSidePanel } from '@/components/ideas-roadmap/RoadmapSidePanel';
import type { RoadmapIdea, RoadmapView, RoadmapQuarter } from '@/types/ideasRoadmap';

const TEAMS = ['All Teams', 'Senaie BAU', 'Integration Team', 'Mobile App Team'];

export default function IdeasRoadmapPage() {
  const { data: ideas = [], isLoading } = useRoadmapIdeas();
  const updateCommitted = useUpdateIdeaCommitted();
  const updateMilestones = useUpdateMilestones();
  const convertToInit = useConvertToInitiative();

  const [view, setView] = useState<RoadmapView>('roadmap');
  const [teamFilter, setTeamFilter] = useState('All Teams');
  const [committedOnly, setCommittedOnly] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<RoadmapIdea | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = ideas;
    if (teamFilter !== 'All Teams') result = result.filter(i => i.team === teamFilter);
    if (committedOnly) result = result.filter(i => i.isCommitted);
    return result;
  }, [ideas, teamFilter, committedOnly]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  async function handleToggleCommitted(idea: RoadmapIdea) {
    const nextCommitted = !idea.isCommitted;
    const quarter = nextCommitted ? (idea.quarter ?? 'Q1') : null;
    await updateCommitted.mutateAsync({ ideaId: idea.id, isCommitted: nextCommitted, quarter: quarter as RoadmapQuarter });
    showToast(nextCommitted ? `${idea.ideaKey} committed to ${quarter}` : `${idea.ideaKey} moved to Uncommitted`);
  }

  async function handleDrop(ideaId: string, quarter: RoadmapQuarter, isCommitted: boolean) {
    await updateCommitted.mutateAsync({ ideaId, isCommitted, quarter });
    showToast(isCommitted ? `Moved to ${quarter}` : 'Moved to Uncommitted');
  }

  async function handleSaveMilestones(ideaId: string, milestones: any) {
    await updateMilestones.mutateAsync({ ideaId, milestones });
    showToast('Milestones saved');
  }

  async function handleConvert(ideaId: string) {
    await convertToInit.mutateAsync(ideaId);
    showToast('Idea converted to Initiative');
    setSelectedIdea(null);
  }

  if (isLoading) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#94A3B8',
      }}>
        Loading roadmap…
      </div>
    );
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#FFFFFF', fontFamily: "'Inter', sans-serif",
    }}>
      <RoadmapToolbar
        view={view}
        onViewChange={setView}
        committedOnly={committedOnly}
        onCommittedOnlyChange={setCommittedOnly}
        totalCount={filtered.length}
        committedCount={filtered.filter(i => i.isCommitted).length}
      />

      <RoadmapFilters
        teams={TEAMS}
        activeTeam={teamFilter}
        onTeamChange={setTeamFilter}
        ideaCount={filtered.length}
      />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'roadmap' ? (
          <RoadmapKanban
            ideas={filtered}
            onDrop={handleDrop}
            onSelectIdea={setSelectedIdea}
            onToggleCommitted={handleToggleCommitted}
          />
        ) : (
          <RoadmapDatesTable
            ideas={filtered}
            onSelectIdea={setSelectedIdea}
            onToggleCommitted={handleToggleCommitted}
          />
        )}
      </div>

      {selectedIdea && (
        <RoadmapSidePanel
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onSaveMilestones={handleSaveMilestones}
          onToggleCommitted={handleToggleCommitted}
          onConvertToInitiative={handleConvert}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1E293B', color: '#FFFFFF', padding: '8px 20px',
          borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,.15)',
          animation: 'fadeInUp 250ms ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
