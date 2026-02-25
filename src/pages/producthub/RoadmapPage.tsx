// =====================================================
// PRODUCT ROADMAP PAGE — Initiative Timeline (Gantt)
// With roadmap summary stat cards — wired to MDT Backlog
// Supports fullscreen mode (hides header, collapses sidebar)
// =====================================================

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { TimelineShell } from '@/components/producthub/timeline/TimelineShell';
import { CreateInitiativeDrawer } from '@/components/producthub/shared/CreateInitiativeDrawer';
import { useMDTBacklog } from '@/hooks/useMDTBacklog';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { Maximize2, Minimize2 } from 'lucide-react';

export const RoadmapPage: React.FC = () => {
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { sidebarExpanded, setSidebarExpanded } = useCatalystContext();
  const [prevSidebarState, setPrevSidebarState] = useState(true);
  const { data: mdtData } = useMDTBacklog();

  // Only count items with on_roadmap = true for summary
  const roadmapItems = useMemo(() => {
    return (mdtData?.data ?? []).filter(i => i.on_roadmap === true);
  }, [mdtData]);

  const summary = useMemo(() => {
    const items = roadmapItems;
    return {
      total_on_roadmap: items.length,
      total_initiatives: items.length,
      roadmap_projects: items.filter(i => i.initiative_type_key === 'project').length,
      roadmap_enhancements: items.filter(i => i.initiative_type_key === 'enhancement').length,
      roadmap_improvements: items.filter(i => i.initiative_type_key === 'improvement').length,
      roadmap_on_track: items.filter(i => i.status === 'under_implementation' || i.status === 'ready_for_development').length,
      roadmap_at_risk: items.filter(i => i.status === 'on_hold').length,
      roadmap_off_track: items.filter(i => i.status === 'cancelled').length,
    };
  }, [roadmapItems]);

  const currentQuarter = (() => {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `Q${q} ${now.getFullYear()}`;
  })();

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      if (!prev) {
        setPrevSidebarState(sidebarExpanded);
        setSidebarExpanded(false);
      } else {
        setSidebarExpanded(prevSidebarState);
      }
      return !prev;
    });
  }, [sidebarExpanded, setSidebarExpanded, prevSidebarState]);

  // Escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
        setSidebarExpanded(prevSidebarState);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, setSidebarExpanded, prevSidebarState]);

  return (
    <div className="flex flex-col h-full">
      {/* Header — hidden in fullscreen */}
      {!isFullscreen && (
        <div className="px-6 py-4 border-b bg-card flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Product Roadmap</h1>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>Initiative timeline &amp; delivery planning</p>
          </div>
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 h-9 px-3 text-sm font-medium rounded-lg border transition-colors hover:bg-muted"
            style={{ borderColor: '#E2E8F0', color: '#475569' }}
            title="Fullscreen view"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
        </div>
      )}

      {/* Fullscreen exit bar — only in fullscreen */}
      {isFullscreen && (
        <div 
          className="flex items-center justify-between px-4 py-1.5 border-b"
          style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
        >
          <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>Product Roadmap</span>
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md border transition-colors hover:bg-muted"
            style={{ borderColor: '#E2E8F0', color: '#475569' }}
            title="Exit fullscreen (Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Exit
          </button>
        </div>
      )}

      {/* Summary Stat Cards — hidden in fullscreen */}
      {!isFullscreen && (
        <div className="px-6 py-3 grid grid-cols-4 gap-3 border-b" style={{ background: '#FAFBFC', borderColor: '#F1F5F9' }}>
          <div className="bg-white border rounded-xl p-3.5" style={{ borderColor: '#E2E8F0' }}>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>On Roadmap</div>
            <div className="text-[22px] font-bold mt-1" style={{ color: '#0F172A' }}>{summary.total_on_roadmap}</div>
            <div className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>MDT Business Requests</div>
          </div>
          <div className="bg-white border rounded-xl p-3.5" style={{ borderColor: '#E2E8F0' }}>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>By Status</div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-[16px] font-bold" style={{ color: '#14B8A6' }}>{summary.roadmap_on_track}</span>
              <span className="text-[10px]" style={{ color: '#64748B' }}>Active</span>
              <span className="text-[16px] font-bold" style={{ color: '#A855F7' }}>{roadmapItems.filter(i => i.status === 'technical_validation').length}</span>
              <span className="text-[10px]" style={{ color: '#64748B' }}>Validation</span>
            </div>
          </div>
          <div className="bg-white border rounded-xl p-3.5" style={{ borderColor: '#E2E8F0' }}>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>This Quarter</div>
            <div className="text-[22px] font-bold mt-1" style={{ color: '#0F172A' }}>{currentQuarter}</div>
            <div className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>Active initiatives</div>
          </div>
          <div className="bg-white border rounded-xl p-3.5" style={{ borderColor: '#E2E8F0' }}>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>Health</div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-[16px] font-bold" style={{ color: '#16A34A' }}>{summary.roadmap_on_track}</span>
              <span className="text-[10px]" style={{ color: '#64748B' }}>On Track</span>
              <span className="text-[16px] font-bold" style={{ color: '#D97706' }}>{summary.roadmap_at_risk}</span>
              <span className="text-[10px]" style={{ color: '#64748B' }}>At Risk</span>
              <span className="text-[16px] font-bold" style={{ color: '#EF4444' }}>{summary.roadmap_off_track}</span>
              <span className="text-[10px]" style={{ color: '#64748B' }}>Off Track</span>
            </div>
          </div>
        </div>
      )}

      <TimelineShell onAddNew={() => setShowCreateDrawer(true)} />
      <CreateInitiativeDrawer open={showCreateDrawer} onClose={() => setShowCreateDrawer(false)} />
    </div>
  );
};

export default RoadmapPage;
