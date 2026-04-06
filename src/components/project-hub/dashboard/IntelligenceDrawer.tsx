/**
 * IntelligenceDrawer — AI project intelligence panel (wired to real data)
 * All colours use var(--cp-*) tokens for automatic light/dark mode.
 */
import { useEffect, useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';
import PersonAvatar from './PersonAvatar';
import { DrawerSkeleton } from './WidgetSkeleton';
import { useDashboardStore } from './useDashboardStore';
import {
  useReleases, useOverdue, useTeamWorkload,
  useIncidents, useDefects, useTimeInStatus,
  useKeyMilestones, useInProduction,
} from '@/hooks/useProjectDashboard';

interface Props {
  projectId?: string | null;
}

export default function IntelligenceDrawer({ projectId }: Props) {
  const { activeDrawer, closeDrawer, selectedReleaseIds } = useDashboardStore();
  const open = activeDrawer === 'intelligence';

  const { data: overdue, isLoading: l1 } = useOverdue(open ? projectId : undefined, selectedReleaseIds);
  const { data: workload, isLoading: l2 } = useTeamWorkload(open ? projectId : undefined);
  const { data: incidents, isLoading: l3 } = useIncidents(open ? projectId : undefined, selectedReleaseIds);
  const { data: defects, isLoading: l4 } = useDefects(open ? projectId : undefined, selectedReleaseIds);
  const { data: tis } = useTimeInStatus(open ? projectId : undefined, selectedReleaseIds);
  const { data: milestones } = useKeyMilestones(open ? projectId : undefined, selectedReleaseIds);
  const { data: inProd } = useInProduction(open ? projectId : undefined, selectedReleaseIds);

  const isLoading = l1 || l2 || l3 || l4;

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, closeDrawer]);

  const insights = useMemo(() => {
    const overdueItems = overdue ?? [];
    const incidentItems = incidents ?? [];
    const defectItems = defects ?? [];
    const tisItems = tis ?? [];
    const workloadItems = workload ?? [];
    const prodItems = inProd ?? [];

    const bottlenecks = tisItems.flatMap((item: any) =>
      (item.statuses ?? []).filter((s: any) => s.duration_days > 5).map((s: any) => ({
        key: item.work_item_key, status: s.status, days: s.duration_days,
      }))
    ).sort((a: any, b: any) => b.days - a.days).slice(0, 3);

    const p1Count = incidentItems.filter((i: any) => i.priority === 'P1').length;
    const critDefects = defectItems.filter((d: any) => d.severity === 'critical').length;
    const overloaded = workloadItems.filter((m: any) => m.total_count > 8);
    const underloaded = workloadItems.filter((m: any) => m.total_count <= 2 && m.total_count > 0);

    const recs: string[] = [];
    if (overdueItems.length > 0) recs.push(`Review ${overdueItems.length} overdue item${overdueItems.length > 1 ? 's' : ''}: ${overdueItems.slice(0, 3).map((i: any) => i.item_key).join(', ')}`);
    if (bottlenecks.length > 0) recs.push(`Unblock bottleneck: ${bottlenecks[0].key} stuck ${bottlenecks[0].days}d in ${bottlenecks[0].status.replace(/_/g, ' ')}`);
    if (p1Count > 0) recs.push(`Prioritize ${p1Count} P1 incident${p1Count > 1 ? 's' : ''} for immediate resolution`);
    if (critDefects > 0) recs.push(`Address ${critDefects} critical defect${critDefects > 1 ? 's' : ''} blocking pipeline`);
    if (overloaded.length > 0) recs.push(`Rebalance load: ${overloaded.map((m: any) => `${m.name} (${m.total_count})`).join(', ')} overloaded`);
    if (recs.length === 0) recs.push('Project health is good — no urgent action items');

    return { overdueCount: overdueItems.length, overdueKeys: overdueItems.slice(0, 5).map((i: any) => i.item_key), bottlenecks, p1Count, critDefects, totalIncidents: incidentItems.length, totalDefects: defectItems.length, workloadItems, overloaded, underloaded, prodCount: prodItems.length, milestoneCount: (milestones ?? []).length, recs };
  }, [overdue, incidents, defects, tis, workload, inProd, milestones]);

  if (!open) return null;

  return (
    <>
      <div onClick={closeDrawer} className="ph-drawer-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.15)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      <div role="dialog" aria-label="Project Intelligence" className="ph-drawer-panel bg-[var(--cp-bg)] dark:bg-[#0A0A0A]" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, zIndex: 201, boxShadow: '-4px 0 24px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column', color: 'var(--cp-t1)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--cp-bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="bg-[var(--cp-blue)]" style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={12} color="#FFFFFF" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cp-t1)', fontFamily: "'Sora', sans-serif" }}>
              Project Intelligence
            </span>
          </div>
          <button onClick={closeDrawer} aria-label="Close drawer" className="ph-focus-ring" style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} style={{ color: 'var(--cp-t3)' }} />
          </button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--cp-bd-zone)' }}>
          <span className="bg-[var(--cp-ai-bg)]" style={{ fontSize: 10, fontWeight: 600, color: 'var(--cp-ai-t)', padding: '3px 8px', borderRadius: 6 }}>
            ✦ AI · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {isLoading ? (
            <DrawerSkeleton />
          ) : (
            <>
              <Section label="Recommendations">
                <div className="bg-[var(--cp-warn-bg)]" style={{ border: '1px solid var(--cp-bd)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--cp-t2)', lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--cp-t1)' }}>Action Items</div>
                    {insights.recs.map((r, i) => <div key={i}>{i + 1}. {r}</div>)}
                  </div>
                </div>
              </Section>
              <Section label="Scope & Delays">
                <div className="bg-[var(--cp-bg-sunken)]" style={{ border: '1px solid var(--cp-bd)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--cp-t2)', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
                  <div><strong style={{ color: 'var(--cp-t1)' }}>{insights.overdueCount}</strong> overdue items{insights.overdueKeys.length > 0 && `: ${insights.overdueKeys.join(', ')}`}</div>
                  {insights.bottlenecks.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <strong style={{ color: 'var(--cp-t1)' }}>Bottlenecks:</strong>
                      {insights.bottlenecks.map((b: any, i: number) => (
                        <div key={i} style={{ marginLeft: 8, fontSize: 11, color: 'var(--cp-warn)' }}>• {b.key}: {b.days}d in {b.status.replace(/_/g, ' ')}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 4 }}><strong style={{ color: 'var(--cp-t1)' }}>{insights.milestoneCount}</strong> items at milestone gates · <strong style={{ color: 'var(--cp-t1)' }}>{insights.prodCount}</strong> in production</div>
                </div>
              </Section>
              <Section label="People & Capacity">
                <div className="bg-[var(--cp-bg-sunken)]" style={{ border: '1px solid var(--cp-bd)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--cp-t2)', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
                  {insights.workloadItems.map((m: any) => (
                    <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <PersonAvatar name={m.name} size={18} />
                      <span style={{ fontWeight: 600, flex: 1, color: 'var(--cp-t1)' }}>{m.name}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: m.total_count > 8 ? 'var(--cp-err)' : 'var(--cp-blue-text)' }}>{m.total_count}</span>
                      {m.total_count > 8 && <span style={{ fontSize: 9, color: 'var(--cp-err)', fontWeight: 600 }}>OVERLOADED</span>}
                    </div>
                  ))}
                  {insights.underloaded.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--cp-t3)', marginTop: 4 }}>Underutilized: {insights.underloaded.map((m: any) => m.name).join(', ')}</div>
                  )}
                </div>
              </Section>
              <Section label="Incidents & Quality">
                <div className="bg-[var(--cp-bg-sunken)]" style={{ border: '1px solid var(--cp-bd)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--cp-t2)', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
                  <div><strong style={{ color: 'var(--cp-t1)' }}>{insights.totalIncidents}</strong> active incidents{insights.p1Count > 0 && <span style={{ color: 'var(--cp-err)', fontWeight: 700 }}> ({insights.p1Count} P1)</span>}</div>
                  <div><strong style={{ color: 'var(--cp-t1)' }}>{insights.totalDefects}</strong> defects{insights.critDefects > 0 && <span style={{ color: 'var(--cp-err)', fontWeight: 700 }}> ({insights.critDefects} critical)</span>}</div>
                </div>
              </Section>
            </>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--cp-bd)' }}>
          <button onClick={closeDrawer} className="ph-focus-ring bg-[var(--cp-bg)] dark:bg-[#0A0A0A]" style={{ width: '100%', height: 50, borderRadius: 8, border: '1px solid var(--cp-bd)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--cp-t3)' }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--cp-t4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>{label}</div>
      {children}
    </div>
  );
}
