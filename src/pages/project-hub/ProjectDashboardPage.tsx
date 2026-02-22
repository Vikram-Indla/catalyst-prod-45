/**
 * ProjectDashboard V3 — Full widget assembly
 */
import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Settings, Users, CalendarRange } from 'lucide-react';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';
import '@/components/project-hub/shared/phStyles.css';
import '@/components/project-hub/dashboard/dashboardPolish.css';

import { useDashboardStore } from '@/components/project-hub/dashboard/useDashboardStore';
import { useReleases } from '@/hooks/useProjectDashboard';
import ReleaseDropdown from '@/components/project-hub/dashboard/ReleaseDropdown';
import KeyMilestones from '@/components/project-hub/dashboard/KeyMilestones';
import LatestInProduction from '@/components/project-hub/dashboard/LatestInProduction';
import ItemsByStatus from '@/components/project-hub/dashboard/ItemsByStatus';
import OverdueItems from '@/components/project-hub/dashboard/OverdueItems';
import OnHoldItems from '@/components/project-hub/dashboard/OnHoldItems';
import ProductionIncidents from '@/components/project-hub/dashboard/ProductionIncidents';
import QADefects from '@/components/project-hub/dashboard/QADefects';
import TimeInStatus from '@/components/project-hub/dashboard/TimeInStatus';
import TeamWorkload from '@/components/project-hub/dashboard/TeamWorkload';
import RecentActivity from '@/components/project-hub/dashboard/RecentActivity';
import LifecycleDrawer from '@/components/project-hub/dashboard/LifecycleDrawer';
import WorkloadDrawer from '@/components/project-hub/dashboard/WorkloadDrawer';
import IntelligenceDrawer from '@/components/project-hub/dashboard/IntelligenceDrawer';
import MilestoneConfigModal from '@/components/project-hub/dashboard/MilestoneConfigModal';

const C = {
  bg: '#F8FAFC', card: '#FFFFFF', bdr: '#E2E8F0',
  ink1: '#0F172A', ink2: '#334155', ink3: '#64748B', ink4: '#94A3B8',
  primary: '#2563EB', teal: '#0D9488', purple: '#7C3AED', success: '#16A34A',
};

export default function ProjectDashboardPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { selectedReleaseIds, openIntelligence } = useDashboardStore();
  const [milestoneConfigOpen, setMilestoneConfigOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-dashboard-v3', key],
    queryFn: async () => {
      if (!key) return null;
      const { data, error } = await supabase.from('ph_projects').select('*').eq('key', key.toUpperCase()).maybeSingle();
      if (error) { console.warn(error.message); return null; }
      return data;
    },
    enabled: !!key,
  });

  const projectId = (project as any)?.id ?? null;
  const name = (project as any)?.name || key?.toUpperCase() || 'Project';
  const pKey = (project as any)?.key || key?.toUpperCase() || '';
  const initials = pKey.slice(0, 2);

  const { data: releases } = useReleases(projectId);

  // Build release ID → name map
  const releaseMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of releases ?? []) m[(r as any).id] = (r as any).name || (r as any).title || (r as any).id?.slice(0, 8);
    return m;
  }, [releases]);

  // Auto-select releases
  const { setSelectedReleaseIds } = useDashboardStore();
  useEffect(() => {
    if (releases?.length && selectedReleaseIds.length === 0) {
      setSelectedReleaseIds(releases.map((r: any) => r.id));
    }
  }, [releases]);

  return (
    <div className="ph-content-wrapper" style={{ fontFamily: "'Inter', sans-serif", background: C.bg }}>
      <div className="ph-inner-content">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-4">
          <span className="cursor-pointer hover:underline" style={{ fontSize: 13, color: C.ink3 }} onClick={() => navigate('/project-hub/projects')}>ProjectHub</span>
          <ChevronRight size={12} color={C.ink4} />
          <span style={{ fontSize: 13, color: C.ink3, fontWeight: 500 }}>{pKey}</span>
          <ChevronRight size={12} color={C.ink4} />
          <span style={{ fontSize: 13, color: C.ink1, fontWeight: 600 }}>Dashboard</span>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 rounded-xl" style={{ background: C.bdr }} />
            <div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 rounded-xl" style={{ background: C.bdr }} />)}</div>
          </div>
        ) : (
          <>
            {/* Header Card */}
            <div style={{ background: C.card, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: '20px 24px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 14, fontWeight: 800, fontFamily: "'Sora', sans-serif" }}>{initials}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: C.ink1, fontFamily: "'Sora', sans-serif" }}>{name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.success, background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>On Track</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.primary, background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>Active</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} color={C.ink4} /><span style={{ fontSize: 12, color: C.ink3 }}>8 members</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarRange size={12} color={C.ink4} /><span style={{ fontSize: 12, color: C.ink3 }}>Jan 15 – Mar 30, 2026</span></div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ReleaseDropdown projectId={projectId} />
                <AIIntelligenceButton label="Intelligence" onClick={openIntelligence} />
                <button onClick={() => navigate(`/project-hub/${key}/settings`)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.bdr}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={15} color={C.ink3} />
                </button>
              </div>
            </div>

            {/* Release Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.ink4, textTransform: 'uppercase', letterSpacing: '.04em' }}>Releases:</span>
              {selectedReleaseIds.map(id => (
                <span key={id} style={{ fontSize: 11, fontWeight: 600, color: C.ink2, background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                  {releaseMap[id] || id.slice(0, 8)}
                </span>
              ))}
            </div>

            {/* Widget Grid */}
            <div className="ph-widget-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="ph-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <KeyMilestones projectId={projectId} onConfigOpen={() => setMilestoneConfigOpen(true)} releaseMap={releaseMap} />
                <LatestInProduction projectId={projectId} releaseMap={releaseMap} />
              </div>
              <div className="ph-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <ItemsByStatus />
                <OverdueItems projectId={projectId} releaseMap={releaseMap} />
                <OnHoldItems projectId={projectId} releaseMap={releaseMap} />
              </div>
              <div className="ph-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <ProductionIncidents projectId={projectId} releaseMap={releaseMap} />
                <QADefects projectId={projectId} releaseMap={releaseMap} />
              </div>
              <TimeInStatus projectId={projectId} releaseMap={releaseMap} />
              <div className="ph-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <TeamWorkload projectId={projectId} />
                <RecentActivity projectId={projectId} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawers & Modals */}
      <LifecycleDrawer />
      <WorkloadDrawer />
      <IntelligenceDrawer projectId={projectId} />
      {projectId && <MilestoneConfigModal open={milestoneConfigOpen} onClose={() => setMilestoneConfigOpen(false)} projectId={projectId} />}
    </div>
  );
}
