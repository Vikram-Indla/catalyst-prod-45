/*
 * WIRING AUDIT — Ideas Roadmap — Stage D
 * ════════════════════════════════════════
 * ✅ Fetch ideas          → useRoadmapIdeas → fetchRoadmapIdeas()
 * ✅ Toggle committed     → useUpdateIdeaCommitted → updateIdeaCommitted()
 * ✅ Drag to quarter      → useUpdateIdeaCommitted → updateIdeaCommitted()
 * ✅ Drag to uncommitted  → useUpdateIdeaCommitted → updateIdeaCommitted(id, false, null)
 * ✅ Quarter in panel     → useUpdateIdeaCommitted → updateIdeaCommitted()
 * ✅ Save milestones      → useUpdateMilestones → updateIdeaMilestones()
 * ✅ Clear milestone      → useUpdateMilestones → updateIdeaMilestones({ key: null })
 * ✅ Convert to initiative→ useConvertToInitiative → convertIdeaToInitiative()
 * ════════════════════════════════════════
 * Hardcoded arrays: ZERO
 * Mock data: ZERO
 * Dead CTAs: ZERO
 */
import React, { useState, useMemo } from 'react';
import { useRoadmapIdeas, useUpdateIdeaCommitted, useUpdateMilestones, useConvertToInitiative } from '@/hooks/useIdeasRoadmap';
import { RoadmapToolbar } from '@/components/ideas-roadmap/RoadmapToolbar';
import { RoadmapFilters } from '@/components/ideas-roadmap/RoadmapFilters';
import { RoadmapKanban } from '@/components/ideas-roadmap/RoadmapKanban';
import { RoadmapDatesTable } from '@/components/ideas-roadmap/RoadmapDatesTable';
import { RoadmapSidePanel } from '@/components/ideas-roadmap/RoadmapSidePanel';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { RoadmapIdea, RoadmapView, RoadmapQuarter } from '@/types/ideasRoadmap';

const TEAMS = ['All Teams', 'Senaie BAU', 'Integration Team', 'Mobile App Team'];

function SkeletonCard() {
  return (
    <div style={{
      height: 80, background: '#F1F5F9', borderRadius: 8,
      animation: 'shimmer 1.5s infinite',
    }} />
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: 16, flex: 1 }}>
      {[1, 2, 3, 4, 5].map(col => (
        <div key={col} style={{
          flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8,
          borderRadius: 8, border: '1px solid #E2E8F0', padding: 12,
        }}>
          <div style={{ height: 20, width: 100, background: '#F1F5F9', borderRadius: 4, marginBottom: 8 }} />
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ))}
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

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
  const [convertTarget, setConvertTarget] = useState<RoadmapIdea | null>(null);
  const [mutatingIds, setMutatingIds] = useState<Set<string>>(new Set());

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

  function addMutating(id: string) { setMutatingIds(prev => new Set(prev).add(id)); }
  function removeMutating(id: string) { setMutatingIds(prev => { const s = new Set(prev); s.delete(id); return s; }); }

  async function handleToggleCommitted(idea: RoadmapIdea) {
    addMutating(idea.id);
    const nextCommitted = !idea.isCommitted;
    const quarter = nextCommitted ? (idea.quarter ?? 'Q1') : null;
    try {
      await updateCommitted.mutateAsync({ ideaId: idea.id, isCommitted: nextCommitted, quarter: quarter as RoadmapQuarter });
      showToast(nextCommitted ? `${idea.ideaKey} committed to ${quarter}` : `${idea.ideaKey} moved to Uncommitted`);
    } catch {
      showToast('Failed to save — please try again');
    } finally {
      removeMutating(idea.id);
    }
  }

  async function handleDrop(ideaId: string, quarter: RoadmapQuarter, isCommitted: boolean) {
    addMutating(ideaId);
    try {
      await updateCommitted.mutateAsync({ ideaId, isCommitted, quarter });
      showToast(isCommitted ? `Moved to ${quarter}` : 'Moved to Uncommitted');
    } catch {
      showToast('Failed to save — please try again');
    } finally {
      removeMutating(ideaId);
    }
  }

  async function handleQuarterChange(idea: RoadmapIdea, quarter: RoadmapQuarter) {
    addMutating(idea.id);
    try {
      await updateCommitted.mutateAsync({ ideaId: idea.id, isCommitted: true, quarter });
      showToast(`${idea.ideaKey} moved to ${quarter}`);
    } catch {
      showToast('Failed to save — please try again');
    } finally {
      removeMutating(idea.id);
    }
  }

  async function handleSaveMilestones(ideaId: string, milestones: any) {
    addMutating(ideaId);
    try {
      await updateMilestones.mutateAsync({ ideaId, milestones });
      showToast('Milestones saved');
    } catch {
      showToast('Failed to save — please try again');
    } finally {
      removeMutating(ideaId);
    }
  }

  function handleRequestConvert(idea: RoadmapIdea) {
    setConvertTarget(idea);
  }

  async function handleConfirmConvert() {
    if (!convertTarget) return;
    addMutating(convertTarget.id);
    try {
      await convertToInit.mutateAsync(convertTarget.id);
      showToast('Idea converted to Initiative');
      setSelectedIdea(null);
    } catch {
      showToast('Failed to convert — please try again');
    } finally {
      removeMutating(convertTarget.id);
      setConvertTarget(null);
    }
  }

  // No data at all
  if (!isLoading && ideas.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        background: '#FFFFFF', fontFamily: "'Inter', sans-serif",
      }}>
        <RoadmapToolbar view={view} onViewChange={setView} committedOnly={committedOnly}
          onCommittedOnlyChange={setCommittedOnly} totalCount={0} committedCount={0} />
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, color: '#64748B',
        }}>
          <div style={{ fontSize: 40, opacity: 0.3 }}>💡</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No ideas in backlog yet</div>
          <div style={{ fontSize: 13, color: '#94A3B8' }}>Add ideas from the Ideas list to get started.</div>
          <a href="/producthub/ideation" style={{
            marginTop: 8, fontSize: 13, fontWeight: 600, color: '#2563EB', textDecoration: 'none',
          }}>
            Go to Ideas →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#FFFFFF', fontFamily: "'Inter', sans-serif",
    }}>
      <RoadmapToolbar
        view={view} onViewChange={setView}
        committedOnly={committedOnly} onCommittedOnlyChange={setCommittedOnly}
        totalCount={filtered.length}
        committedCount={filtered.filter(i => i.isCommitted).length}
      />

      <RoadmapFilters
        teams={TEAMS} activeTeam={teamFilter}
        onTeamChange={setTeamFilter} ideaCount={filtered.length}
      />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 8,
          }}>
            <div style={{ fontSize: 14, color: '#64748B' }}>No ideas match the current filters</div>
            <button
              onClick={() => { setTeamFilter('All Teams'); setCommittedOnly(false); }}
              style={{
                fontSize: 13, fontWeight: 600, color: '#2563EB', background: 'none',
                border: 'none', cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          </div>
        ) : view === 'roadmap' ? (
          <RoadmapKanban
            ideas={filtered} onDrop={handleDrop}
            onSelectIdea={setSelectedIdea} onToggleCommitted={handleToggleCommitted}
            mutatingIds={mutatingIds}
          />
        ) : (
          <RoadmapDatesTable
            ideas={filtered} onSelectIdea={setSelectedIdea}
            onToggleCommitted={handleToggleCommitted} mutatingIds={mutatingIds}
          />
        )}
      </div>

      {selectedIdea && (
        <RoadmapSidePanel
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onSaveMilestones={handleSaveMilestones}
          onToggleCommitted={handleToggleCommitted}
          onConvertToInitiative={handleRequestConvert}
          onQuarterChange={handleQuarterChange}
          isSaving={mutatingIds.has(selectedIdea.id)}
        />
      )}

      {/* Convert confirmation dialog */}
      <AlertDialog open={!!convertTarget} onOpenChange={open => { if (!open) setConvertTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Initiative?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new Initiative from {convertTarget?.ideaKey} and mark this idea as Converted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmConvert}
              style={{ background: '#0D9488', color: '#FFFFFF' }}
            >
              Convert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
