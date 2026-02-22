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

  const releaseMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of releases ?? []) m[(r as any).id] = (r as any).name || (r as any).title || (r as any).id?.slice(0, 8);
    return m;
  }, [releases]);

  const { setSelectedReleaseIds } = useDashboardStore();
  useEffect(() => {
    if (releases?.length && selectedReleaseIds.length === 0) {
      setSelectedReleaseIds(releases.map((r: any) => r.id));
    }
  }, [releases]);

  return (
    <div className="ph-content-wrapper" style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC' }}>
      <div className="ph-inner-content" style={{ padding: '12px 16px' }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="cursor-pointer hover:underline" style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }} onClick={() => navigate('/project-hub/projects')}>ProjectHub</span>
          <ChevronRight size={12} color="#94A3B8" />
          <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>{pKey}</span>
          <ChevronRight size={12} color="#94A3B8" />
          <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 700 }}>Dashboard</span>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 rounded-xl" style={{ background: '#E2E8F0' }} />
            <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 rounded-xl" style={{ background: '#E2E8F0' }} />)}</div>
          </div>
        ) : (
          <>
            {/* Header Card with Release Pills */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, marginBottom: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 14, fontWeight: 800, fontFamily: "'Sora', sans-serif" }}>{initials}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>{name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#166534', background: '#DCFCE7', border: '1px solid #86EFAC', padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>On Track</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#1E40AF', background: '#DBEAFE', border: '1px solid #93C5FD', padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>Active</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} color="#64748B" /><span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>8 members</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarRange size={12} color="#64748B" /><span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Jan 15 – Mar 30, 2026</span></div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  
                  <ReleaseDropdown projectId={projectId} />
                  <AIIntelligenceButton label="Intelligence" onClick={openIntelligence} />
                  <button onClick={() => navigate(`/project-hub/${key}/settings`)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Settings size={15} color="#64748B" />
                  </button>
                </div>
              </div>
              {/* Release pills row inside header */}
              {selectedReleaseIds.length > 0 && (
                <div style={{ borderTop: '1px solid #F1F5F9', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6, background: '#FAFBFC', flexWrap: 'wrap' }}>
                  {selectedReleaseIds.map(id => {
                    const label = releaseMap[id];
                    if (!label) return null; // Don't show pills for releases without names
                    return (
                      <span key={id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                        background: '#FFFFFF', border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 2px rgba(0,0,0,.04)',
                      }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#0F766E', fontWeight: 700 }}>{label}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Widget Grid */}
            <div className="ph-widget-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 10 }}>
                <KeyMilestones projectId={projectId} onConfigOpen={() => setMilestoneConfigOpen(true)} releaseMap={releaseMap} />
                <LatestInProduction projectId={projectId} releaseMap={releaseMap} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 10 }}>
                <ItemsByStatus projectId={projectId} />
                <OverdueItems projectId={projectId} releaseMap={releaseMap} />
                <OnHoldItems projectId={projectId} releaseMap={releaseMap} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 10 }}>
                <ProductionIncidents projectId={projectId} releaseMap={releaseMap} />
                <QADefects projectId={projectId} releaseMap={releaseMap} />
              </div>
              <TimeInStatus projectId={projectId} releaseMap={releaseMap} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 10 }}>
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
