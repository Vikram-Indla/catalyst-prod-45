import React, { useEffect } from 'react';
import { useAiProfile, useBehavioralPatterns, useReleaseStanding, useHubDistribution } from '@/hooks/useResource360';
import { HUB_COLORS, HUB_SHORT } from '@/constants/resource360';

interface AiIntelligenceOverlayProps {
  resourceId: string;
  resource: any;
  onClose: () => void;
}

const AiIntelligenceOverlay: React.FC<AiIntelligenceOverlayProps> = ({ resourceId, resource, onClose }) => {
  const { data: profile } = useAiProfile(resourceId);
  const { data: patterns } = useBehavioralPatterns(resourceId);
  const { data: hubDist } = useHubDistribution(resourceId);

  // Get first release standing
  const { data: standing } = useReleaseStanding(resourceId, profile?.release_id || '');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const initials = resource?.initials || resource?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??';

  const deliveryMetrics = profile?.delivery_metrics || {};
  const hubDistribution = profile?.hub_distribution || {};
  const hubClosure = profile?.hub_closure_rates || {};
  const roleExp = profile?.role_expectation || {};

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      left: 220,
      zIndex: 300,
      background: '#FFFFFF',
      overflow: 'auto',
      animation: 'slideInRight 350ms ease-out',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Purple top bar */}
      <div style={{
        background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: '#FFFFFF',
      }}>
        <span style={{ fontSize: 14, fontWeight: 800 }}>✦</span>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>AI Intelligence — {resource?.full_name}</span>
        <button style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none', borderRadius: 6,
          padding: '6px 14px', color: '#FFFFFF',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          Export PDF
        </button>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.3)',
          background: 'transparent', color: '#FFFFFF',
          fontSize: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
        {/* 1. Profile Card */}
        <Section title="Resource Profile">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', fontSize: 28, fontWeight: 700,
              boxShadow: '0 0 0 3px #FFFFFF, 0 0 0 5px #7C3AED',
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{resource?.full_name}</div>
              <div style={{ fontSize: 13, color: '#334155' }}>{resource?.job_role}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {[resource?.r360_departments?.name, resource?.r360_vendors?.name, resource?.country].filter(Boolean).map((p, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#F1F5F9', color: '#475569' }}>{p}</span>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 2. Resource Pattern */}
        {profile?.resource_pattern && (
          <Section title="Resource Pattern">
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#334155' }}>{profile.resource_pattern}</p>
          </Section>
        )}

        {/* 3. Hub Lifetime Performance */}
        <Section title="Hub Lifetime Performance">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {(hubDist || []).map((h: any) => {
              const hubColor = HUB_COLORS[h.source_hub] || '#64748B';
              return (
                <div key={h.source_hub} style={{
                  padding: '10px 12px', borderRadius: 8,
                  borderLeft: `4px solid ${hubColor}`,
                  background: '#F8FAFC',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    {HUB_SHORT[h.source_hub] || h.source_hub}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>{h.hub_pct?.toFixed(0)}%</div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>{h.hub_item_count} items · {h.hub_closure_pct?.toFixed(0)}% closed</div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* 4. Delivery Pattern */}
        {profile && (
          <Section title="Delivery Pattern">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <MetricCard label="Avg Subtask" value={`${deliveryMetrics.avg_subtask_days?.toFixed(1) || '—'}d`} />
              <MetricCard label="Avg Story" value={`${deliveryMetrics.avg_story_days?.toFixed(1) || '—'}d`} />
              <MetricCard label="Avg Bug" value={`${deliveryMetrics.avg_bug_days?.toFixed(1) || '—'}d`} />
              <MetricCard label="Pickup Speed" value={`${deliveryMetrics.pickup_speed_hours?.toFixed(0) || '—'}h`} />
            </div>
            {deliveryMetrics.weekly_closure_history && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Weekly Closures</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
                  {(deliveryMetrics.weekly_closure_history as number[]).map((v: number, i: number) => (
                    <div key={i} style={{
                      flex: 1,
                      height: `${Math.max((v / Math.max(...deliveryMetrics.weekly_closure_history)) * 100, 4)}%`,
                      background: '#2563EB',
                      borderRadius: '3px 3px 0 0',
                      opacity: 0.7,
                    }} title={`${v} items`} />
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* 5. Role Expectation */}
        {roleExp?.expected && (
          <Section title="Role Expectation vs Actual">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Expected Duties</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#334155', lineHeight: 1.8 }}>
                  {(roleExp.expected || []).map((e: string, i: number) => <li key={i}>{e}</li>)}
                </ul>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Actual Distribution</div>
                {(roleExp.actual_distribution || []).map((a: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#334155', minWidth: 80 }}>{a.label}</span>
                    <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4 }}>
                      <div style={{ width: `${a.pct}%`, height: '100%', background: '#2563EB', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', minWidth: 36, textAlign: 'right' }}>{a.pct}%</span>
                  </div>
                ))}
                {roleExp.anomalies?.length > 0 && (
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: '#FEF3C7', fontSize: 11, color: '#92400E' }}>
                    ⚠️ {roleExp.anomalies.join('; ')}
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* 6. Behavioral Patterns */}
        {patterns && patterns.length > 0 && (
          <Section title="Behavioral Patterns">
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {patterns.map((p: any) => (
                <li key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED', marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{p.pattern_text}</span>
                    {p.evidence_refs?.length > 0 && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: '#0D9488', textDecoration: 'underline', cursor: 'pointer' }}>
                        [{p.evidence_refs.join(', ')}]
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* 7-8. Release Standing placeholder */}
        {standing && (
          <Section title="Current Release Standing">
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 20 }}>
              {/* Donut */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <svg width={120} height={120} viewBox="0 0 120 120">
                  <circle cx={60} cy={60} r={50} fill="none" stroke="#F1F5F9" strokeWidth={12} />
                  <circle cx={60} cy={60} r={50} fill="none" stroke="#2563EB" strokeWidth={12}
                    strokeDasharray={`${(standing.completion_pct / 100) * 314} 314`}
                    strokeLinecap="round" transform="rotate(-90 60 60)" />
                  <text x={60} y={60} textAnchor="middle" dominantBaseline="central"
                    style={{ fontSize: 22, fontWeight: 900, fill: '#0F172A' }}>
                    {standing.completion_pct}%
                  </text>
                </svg>
                <div style={{
                  marginTop: 8, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 6,
                  background: standing.verdict === 'on_track' ? '#D1FAE5' : standing.verdict === 'at_risk' ? '#FEF3C7' : '#FEE2E2',
                  color: standing.verdict === 'on_track' ? '#059669' : standing.verdict === 'at_risk' ? '#D97706' : '#DC2626',
                  textTransform: 'uppercase',
                }}>
                  {standing.verdict?.replace('_', ' ')}
                </div>
              </div>

              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                  <MiniStat label="Done" value={standing.done_count} color="#059669" />
                  <MiniStat label="In Progress" value={standing.progress_count} color="#2563EB" />
                  <MiniStat label="To Do" value={standing.todo_count} color="#DC2626" />
                </div>

                {standing.project_standings && (
                  <div>
                    {(standing.project_standings as any[]).map((ps: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11 }}>{ps.statusEmoji || ps.status_emoji}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', minWidth: 100 }}>{ps.project}</span>
                        <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 3 }}>
                          <div style={{ width: `${ps.items ? (ps.done / ps.items) * 100 : 0}%`, height: '100%', background: '#059669', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 10, color: '#64748B' }}>{ps.done}/{ps.items}</span>
                      </div>
                    ))}
                  </div>
                )}

                {standing.critical_path_items?.length > 0 && (
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: '#FEE2E2', fontSize: 11, color: '#DC2626' }}>
                    🚨 Critical Path: {standing.critical_path_items.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* 9. Generation Footer */}
        {profile && (
          <div style={{
            marginTop: 24, padding: '12px 16px', borderRadius: 8,
            background: '#F8FAFC', border: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', gap: 12,
            fontSize: 11, color: '#64748B',
          }}>
            <span>Generated: {profile.generated_at ? new Date(profile.generated_at).toLocaleString() : '—'}</span>
            <span>·</span>
            <span>v{profile.generation_version || '1.0'}</span>
            <span>·</span>
            <span>Next Refresh: {profile.next_refresh_at ? new Date(profile.next_refresh_at).toLocaleString() : 'On demand'}</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{
      fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
      color: '#7C3AED', marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 10, fontWeight: 800 }}>✦</span>
      {title}
      <div style={{ flex: 1, height: 1, background: '#EDE9FE' }} />
    </div>
    {children}
  </div>
);

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div style={{ padding: '10px 12px', borderRadius: 8, background: '#F8FAFC', textAlign: 'center' }}>
    <div style={{ fontSize: 20, fontWeight: 900, color: '#0F172A' }}>{value}</div>
    <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginTop: 4 }}>{label}</div>
  </div>
);

const MiniStat = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div style={{ textAlign: 'center', padding: '8px', borderRadius: 6, background: '#F8FAFC' }}>
    <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>{label}</div>
  </div>
);

export default AiIntelligenceOverlay;
