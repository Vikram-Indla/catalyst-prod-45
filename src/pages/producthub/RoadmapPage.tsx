// =====================================================
// PRODUCT ROADMAP PAGE — Initiative Timeline (Gantt)
// With roadmap summary stat cards
// =====================================================

import React, { useState } from 'react';
import { TimelineShell } from '@/components/producthub/timeline/TimelineShell';
import { CreateInitiativeDrawer } from '@/components/producthub/shared/CreateInitiativeDrawer';
import { useRoadmapSummary } from '@/hooks/useRoadmapInitiatives';

export const RoadmapPage: React.FC = () => {
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const { data: summary } = useRoadmapSummary();

  const currentQuarter = (() => {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `Q${q} ${now.getFullYear()}`;
  })();

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b bg-card">
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Product Roadmap</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>Initiative timeline &amp; delivery planning</p>
      </div>

      {/* Summary Stat Cards */}
      <div className="px-6 py-3 grid grid-cols-4 gap-3 border-b" style={{ background: '#FAFBFC', borderColor: '#F1F5F9' }}>
        {/* Card 1: On Roadmap */}
        <div className="bg-white border rounded-xl p-3.5" style={{ borderColor: '#E2E8F0' }}>
          <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>On Roadmap</div>
          <div className="text-[22px] font-bold mt-1" style={{ color: '#0F172A' }}>{summary?.total_on_roadmap ?? 0}</div>
          <div className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>Curated from {summary?.total_initiatives ?? 0} initiatives</div>
        </div>
        {/* Card 2: By Type */}
        <div className="bg-white border rounded-xl p-3.5" style={{ borderColor: '#E2E8F0' }}>
          <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>By Type</div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-[16px] font-bold" style={{ color: '#2563EB' }}>{summary?.roadmap_projects ?? 0}</span>
            <span className="text-[10px]" style={{ color: '#64748B' }}>Proj</span>
            <span className="text-[16px] font-bold" style={{ color: '#0D9488' }}>{summary?.roadmap_enhancements ?? 0}</span>
            <span className="text-[10px]" style={{ color: '#64748B' }}>Enh</span>
            <span className="text-[16px] font-bold" style={{ color: '#D97706' }}>{summary?.roadmap_improvements ?? 0}</span>
            <span className="text-[10px]" style={{ color: '#64748B' }}>Imp</span>
          </div>
        </div>
        {/* Card 3: This Quarter */}
        <div className="bg-white border rounded-xl p-3.5" style={{ borderColor: '#E2E8F0' }}>
          <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>This Quarter</div>
          <div className="text-[22px] font-bold mt-1" style={{ color: '#0F172A' }}>{currentQuarter}</div>
          <div className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>Active initiatives</div>
        </div>
        {/* Card 4: Health */}
        <div className="bg-white border rounded-xl p-3.5" style={{ borderColor: '#E2E8F0' }}>
          <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>Health</div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-[16px] font-bold" style={{ color: '#16A34A' }}>{summary?.roadmap_on_track ?? 0}</span>
            <span className="text-[10px]" style={{ color: '#64748B' }}>On Track</span>
            <span className="text-[16px] font-bold" style={{ color: '#D97706' }}>{summary?.roadmap_at_risk ?? 0}</span>
            <span className="text-[10px]" style={{ color: '#64748B' }}>At Risk</span>
            <span className="text-[16px] font-bold" style={{ color: '#EF4444' }}>{summary?.roadmap_off_track ?? 0}</span>
            <span className="text-[10px]" style={{ color: '#64748B' }}>Off Track</span>
          </div>
        </div>
      </div>

      <TimelineShell />
      <CreateInitiativeDrawer open={showCreateDrawer} onClose={() => setShowCreateDrawer(false)} />
    </div>
  );
};

export default RoadmapPage;
