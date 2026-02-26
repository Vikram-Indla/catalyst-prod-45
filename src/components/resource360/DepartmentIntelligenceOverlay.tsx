import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HUB_COLORS, HUB_SHORT } from '@/constants/resource360';

interface Props {
  departmentName: string;
  onClose: () => void;
}

export default function DepartmentIntelligenceOverlay({ departmentName, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Auto-generate on mount
  useEffect(() => {
    handleGenerate();
  }, [departmentName]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const { data: result, error: fnErr } = await supabase.functions.invoke('r360-department-intelligence', {
        body: { department_name: departmentName },
      });
      if (fnErr) throw new Error(fnErr.message || 'Failed to generate department intelligence');
      if (result?.error) throw new Error(result.error);
      setData(result);
      toast.success(`Department intelligence generated — ${result.metrics?.resource_count} resources analyzed`);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to generate department intelligence';
      setError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const metrics = data?.metrics || {};
  const ai = data?.ai || {};
  const resourceSummaries = data?.resource_summaries || [];
  const hubDist = metrics.hub_distribution || {};
  const weeklyHistory = metrics.weekly_closure_history || [];
  const maxWeekly = Math.max(...weeklyHistory, 1);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Department AI Intelligence overlay"
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, left: 220,
        zIndex: 300, background: '#FFFFFF', overflow: 'auto',
        animation: 'slideInRight 350ms ease-out',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top bar */}
      <div style={{
        background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
        padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12, color: '#FFFFFF',
      }}>
        <span style={{ fontSize: 14, fontWeight: 800 }}>✦</span>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Department Intelligence — {departmentName}</span>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            background: generating ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
            border: 'none', borderRadius: 6,
            padding: '6px 14px', color: '#FFFFFF', fontSize: 12, fontWeight: 600,
            cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? '⏳ Generating…' : data ? '✨ Refresh AI' : '✨ Generate'}
        </button>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.3)',
          background: 'transparent', color: '#FFFFFF', fontSize: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
        {/* Generating state */}
        {generating && !data && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#7C3AED', marginBottom: 4 }}>
              Analyzing {departmentName} department…
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              Aggregating metrics across all resources, generating behavioral patterns, and building department intelligence.
              <br />This may take 20-40 seconds.
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ width: 200, height: 4, background: '#EDE9FE', borderRadius: 2, margin: '0 auto', overflow: 'hidden' }}>
                <div style={{ width: '60%', height: '100%', background: '#7C3AED', borderRadius: 2, animation: 'indeterminate 1.5s ease-in-out infinite' }} />
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !generating && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', marginBottom: 4 }}>{error}</div>
            <button onClick={handleGenerate} style={{
              marginTop: 12, background: '#2563EB', color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>Try Again</button>
          </div>
        )}

        {/* Main content */}
        {data && !generating && (
          <>
            {/* Department Header */}
            <Section title="Department Overview">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 16,
                  background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#FFFFFF', fontSize: 24, fontWeight: 700,
                  boxShadow: '0 0 0 3px #FFFFFF, 0 0 0 5px #7C3AED',
                }}>
                  🏢
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{departmentName}</div>
                  <div style={{ fontSize: 13, color: '#334155' }}>{metrics.resource_count} resources · {metrics.resources_with_metrics} with data</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <StatPill label="Total" value={metrics.total_items} />
                    <StatPill label="Done" value={metrics.done_count} color="#059669" />
                    <StatPill label="In Progress" value={metrics.in_progress_count} color="#2563EB" />
                    <StatPill label="To Do" value={metrics.todo_count} color="#D97706" />
                  </div>
                </div>
              </div>
            </Section>

            {/* Department Pattern */}
            {ai.department_pattern && (
              <Section title="Department Pattern">
                <p style={{ fontSize: 13, lineHeight: 1.7, color: '#334155', margin: 0 }}>{ai.department_pattern}</p>
              </Section>
            )}

            {/* Delivery Summary */}
            {ai.delivery_summary && (
              <Section title="Delivery Summary">
                <p style={{ fontSize: 13, lineHeight: 1.7, color: '#334155', margin: 0 }}>{ai.delivery_summary}</p>
              </Section>
            )}

            {/* Hub Performance */}
            <Section title="Hub Performance">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                {Object.entries(hubDist).map(([hub, v]: [string, any]) => {
                  const hubColor = HUB_COLORS[hub] || '#64748B';
                  return (
                    <div key={hub} style={{
                      padding: '10px 12px', borderRadius: 8,
                      borderLeft: `4px solid ${hubColor}`, background: '#F8FAFC',
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                        {HUB_SHORT[hub] || hub}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>{v.pct ?? 0}%</div>
                      <div style={{ fontSize: 10, color: '#64748B' }}>{v.count ?? 0} items · {v.closure_pct ?? 0}% closed</div>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Delivery Metrics */}
            <Section title="Delivery Metrics (Dept Averages)">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <MetricCard label="Avg Subtask" value={metrics.avg_subtask_days != null ? `${metrics.avg_subtask_days.toFixed(1)}d` : '—'} />
                <MetricCard label="Avg Story" value={metrics.avg_story_days != null ? `${metrics.avg_story_days.toFixed(1)}d` : '—'} />
                <MetricCard label="Avg Bug" value={metrics.avg_bug_days != null ? `${metrics.avg_bug_days.toFixed(1)}d` : '—'} />
                <MetricCard label="Pickup Speed" value={metrics.pickup_speed_hours != null ? `${metrics.pickup_speed_hours.toFixed(0)}h` : '—'} />
              </div>
              {weeklyHistory.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Weekly Closures (Department)</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
                    {weeklyHistory.map((v: number, i: number) => (
                      <div key={i} style={{
                        flex: 1,
                        height: `${Math.max((v / maxWeekly) * 100, 4)}%`,
                        background: '#2563EB',
                        borderRadius: '3px 3px 0 0',
                        opacity: 0.7,
                      }} title={`Week ${i + 1}: ${v} items`} />
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Strength & Risk */}
            {(ai.strength_analysis || ai.risk_assessment) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {ai.strength_analysis && (
                  <div style={{ padding: 16, borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: '#059669', marginBottom: 8 }}>💪 Strengths</div>
                    <p style={{ fontSize: 12, lineHeight: 1.6, color: '#166534', margin: 0 }}>{ai.strength_analysis}</p>
                  </div>
                )}
                {ai.risk_assessment && (
                  <div style={{ padding: 16, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: '#DC2626', marginBottom: 8 }}>⚠️ Risks</div>
                    <p style={{ fontSize: 12, lineHeight: 1.6, color: '#991B1B', margin: 0 }}>{ai.risk_assessment}</p>
                  </div>
                )}
              </div>
            )}

            {/* Behavioral Patterns */}
            {ai.behavioral_patterns?.length > 0 && (
              <Section title="Department Behavioral Patterns">
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {ai.behavioral_patterns.map((p: any, i: number) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED', marginTop: 5, flexShrink: 0 }} />
                      <div>
                        <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{p.pattern_text}</span>
                        {p.evidence_refs?.length > 0 && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: '#0D9488' }}>
                            [{p.evidence_refs.join(', ')}]
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Team Dynamics */}
            {ai.team_dynamics?.length > 0 && (
              <Section title="Team Dynamics & Recommendations">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ai.team_dynamics.map((td: any, i: number) => (
                    <div key={i} style={{ padding: '12px 16px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6, marginBottom: 6 }}>{td.observation}</div>
                      <div style={{ fontSize: 11, color: '#2563EB', fontWeight: 600 }}>→ {td.recommendation}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Workload Distribution */}
            {ai.workload_distribution?.length > 0 && (
              <Section title="Workload Distribution">
                {ai.workload_distribution.map((w: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#334155', minWidth: 100 }}>{w.label}</span>
                    <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4 }}>
                      <div style={{ width: `${w.pct}%`, height: '100%', background: '#2563EB', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', minWidth: 36, textAlign: 'right' }}>{w.pct}%</span>
                  </div>
                ))}
              </Section>
            )}

            {/* Weekly Story — Grouped by Resource */}
            <Section title="Weekly Story (Grouped by Resource)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {resourceSummaries
                  .filter((r: any) => r.total_items > 0)
                  .sort((a: any, b: any) => b.total_items - a.total_items)
                  .map((r: any) => (
                  <div key={r.rid} style={{ padding: '12px 16px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{r.name}</span>
                        <span style={{ fontSize: 11, color: '#64748B', marginLeft: 8 }}>{r.role} · RID: {r.rid}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <MiniStat label="Done" value={r.done_count} color="#059669" />
                        <MiniStat label="WIP" value={r.in_progress_count} color="#2563EB" />
                        <MiniStat label="Total" value={r.total_items} color="#475569" />
                      </div>
                    </div>
                    {r.weekly_closures?.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24 }}>
                        {r.weekly_closures.map((v: number, i: number) => (
                          <div key={i} style={{
                            flex: 1,
                            height: `${Math.max((v / Math.max(...r.weekly_closures, 1)) * 100, 8)}%`,
                            background: '#2563EB', borderRadius: '2px 2px 0 0', opacity: 0.5,
                          }} title={`${v}`} />
                        ))}
                      </div>
                    )}
                    {r.patterns?.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        {r.patterns.slice(0, 2).map((p: string, i: number) => (
                          <div key={i} style={{ fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>• {p}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            {/* Footer */}
            <div style={{
              marginTop: 24, padding: '12px 16px', borderRadius: 8,
              background: '#F8FAFC', border: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', gap: 12,
              fontSize: 11, color: '#64748B',
            }}>
              <span>Generated: {data.generated_at ? new Date(data.generated_at).toLocaleString() : '—'}</span>
              <span>·</span>
              <span>{metrics.resource_count} resources · {metrics.total_items} items analyzed</span>
            </div>
          </>
        )}

        {/* Refreshing overlay */}
        {generating && data && (
          <div style={{
            position: 'fixed', top: 0, left: 220, right: 0, bottom: 0,
            background: 'rgba(255,255,255,0.8)', zIndex: 301,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#7C3AED' }}>Refreshing department intelligence…</div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{
      fontSize: 11, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.08em',
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
    <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, color: '#64748B', marginTop: 4 }}>{label}</div>
  </div>
);

const StatPill = ({ label, value, color }: { label: string; value: number; color?: string }) => (
  <span style={{
    fontSize: 11, padding: '2px 8px', borderRadius: 4,
    background: '#F1F5F9', color: color || '#475569', fontWeight: 600,
  }}>
    {label}: {value}
  </span>
);

const MiniStat = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 14, fontWeight: 900, color }}>{value}</div>
    <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase' as const, color: '#64748B' }}>{label}</div>
  </div>
);
