import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAiProfile, useBehavioralPatterns, useReleaseStanding, useHubDistribution } from '@/hooks/useResource360';
import { HUB_COLORS, HUB_SHORT } from '@/constants/resource360';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';

interface AiIntelligenceOverlayProps {
  resourceId: string;
  resource: any;
  rid: string;
  onClose: () => void;
}

// Hook to read pre-computed metrics from cache table (instant read)
const useCachedMetrics = (resourceId: string) =>
  useQuery({
    queryKey: ['r360-cached-metrics', resourceId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('r360_resource_metrics' as any)
        .select('*')
        .eq('resource_id', resourceId)
        .maybeSingle() as any);
      if (error) throw error;
      return data as any;
    },
    enabled: !!resourceId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

const AiIntelligenceOverlay: React.FC<AiIntelligenceOverlayProps> = ({ resourceId, resource, rid, onClose }) => {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useAiProfile(resourceId);
  const { data: patterns, isLoading: patternsLoading } = useBehavioralPatterns(resourceId);
  const { data: hubDist, isLoading: hubDistLoading } = useHubDistribution(resourceId);
  const { data: cachedMetrics } = useCachedMetrics(resourceId);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [releaseId, setReleaseId] = useState<string>('');
  useEffect(() => {
    if (!resourceId) return;
    (supabase
      .from('r360_ai_release_standings' as any)
      .select('release_id')
      .eq('resource_id', resourceId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle() as any)
      .then(({ data }: any) => {
        if (data?.release_id) setReleaseId(data.release_id);
      });
  }, [resourceId]);

  const { data: standing } = useReleaseStanding(resourceId, releaseId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const initials = resource?.initials || resource?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??';

  const deliveryMetrics = profile?.delivery_metrics || cachedMetrics?.delivery_metrics || {};
  const hubClosure = profile?.hub_closure_rates || cachedMetrics?.hub_closure_rates || {};
  const roleExp = profile?.role_expectation || {};
  const isLoading = profileLoading || patternsLoading || hubDistLoading;

  // Staleness indicator
  const computedAt = cachedMetrics?.computed_at ? new Date(cachedMetrics.computed_at) : null;
  const aiGeneratedAt = profile?.generated_at ? new Date(profile.generated_at) : null;
  const stalenessMinutes = computedAt ? Math.round((Date.now() - computedAt.getTime()) / 60000) : null;
  const stalenessLabel = stalenessMinutes != null
    ? stalenessMinutes < 60 ? `${stalenessMinutes}m ago`
    : stalenessMinutes < 1440 ? `${Math.round(stalenessMinutes / 60)}h ago`
    : `${Math.round(stalenessMinutes / 1440)}d ago`
    : null;

  // Insufficient data check
  const hasInsufficientData = !profile && !cachedMetrics && !isLoading;
  // Has metrics but no AI narrative yet
  const hasMetricsNoAI = !profile && cachedMetrics && !isLoading;

  // Step 1: Compute metrics (fast, no AI)
  const handleComputeMetrics = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('r360-compute-metrics', {
        body: { resource_id: resourceId, jira_account_id: resource?.jira_account_id, user_id: resource?.id },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success(`Metrics computed — ${data.total_items} items across ${data.hubs_found?.length || 0} hubs`);
      queryClient.invalidateQueries({ queryKey: ['r360-cached-metrics', resourceId] });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to compute metrics');
    } finally {
      setRefreshing(false);
    }
  };

  // Step 2: Generate AI narrative (uses pre-computed metrics)
  const handleGenerate = async () => {
    // If no metrics yet, compute first
    if (!cachedMetrics) {
      await handleComputeMetrics();
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('r360-generate-profile', {
        body: { resource_id: resourceId, rid },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success(`Profile generated — ${data.items_analyzed} items, ${data.patterns_generated} patterns`);
      queryClient.invalidateQueries({ queryKey: ['r360-ai-profile', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['r360-ai-patterns', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['r360-cached-metrics', resourceId] });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to generate profile');
    } finally {
      setGenerating(false);
    }
  };

  const completionPct = standing?.completion_pct ?? 0;
  const weeklyHistory = (deliveryMetrics.weekly_closure_history || []) as number[];
  const allZeros = weeklyHistory.length > 0 && weeklyHistory.every((v: number) => v === 0);
  const maxWeekly = Math.max(...weeklyHistory, 1);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="AI Intelligence overlay"
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, left: 220,
        zIndex: 300, background: isDark ? '#0A0A0A' : '#FFFFFF', overflow: 'auto',
        animation: 'slideInRight 350ms ease-out',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Purple top bar */}
      <div style={{
        background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
        padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12, color: '#FFFFFF',
      }}>
        <span style={{ fontSize: 14, fontWeight: 800 }}>✦</span>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>AI Intelligence — {resource?.full_name}</span>
        <button
          onClick={handleComputeMetrics}
          disabled={refreshing || generating}
          aria-label="Refresh Metrics"
          style={{
            background: refreshing ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)',
            border: 'none', borderRadius: 6,
            padding: '6px 10px', color: '#FFFFFF', fontSize: 11, fontWeight: 600,
            cursor: refreshing ? 'wait' : 'pointer', opacity: refreshing ? 0.6 : 1,
          }}
        >
          {refreshing ? '⏳ Syncing…' : '🔄 Sync Data'}
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating || refreshing}
          aria-label="Generate AI Profile"
          style={{
            background: generating ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
            border: 'none', borderRadius: 6,
            padding: '6px 14px', color: '#FFFFFF', fontSize: 12, fontWeight: 600,
            cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? '⏳ Generating…' : profile ? '✨ Refresh AI' : '✨ Generate'}
        </button>
        {stalenessLabel && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
            Data: {stalenessLabel}
          </span>
        )}
        <button aria-label="Export PDF" style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6,
          padding: '6px 14px', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          Export PDF
        </button>
        <button onClick={onClose} aria-label="Close AI Intelligence" style={{
          width: 32, height: 32, borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.3)',
          background: 'transparent', color: '#FFFFFF', fontSize: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
        {/* Loading skeleton */}
        {isLoading && !generating && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[120, 80, 100, 60, 90].map((h, i) => (
              <div key={i} className="r360-skeleton" style={{ height: h, borderRadius: 8 }} />
            ))}
          </div>
        )}

        {/* Generating state */}
        {generating && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🧠</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#3B82F6', marginBottom: 4 }}>
              Analyzing {resource?.full_name}'s work data…
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#878787' : '#64748B' }}>
              Computing delivery metrics, generating behavioral patterns, and building release standings.
              <br />This may take 15-30 seconds.
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ width: 200, height: 4, background: isDark ? '#1A1A1A' : '#DBEAFE', borderRadius: 4, margin: '0 auto', overflow: 'hidden' }}>
                <div style={{ width: '60%', height: '100%', background: '#3B82F6', borderRadius: 4, animation: 'indeterminate 1.5s ease-in-out infinite' }} />
              </div>
            </div>
          </div>
        )}

        {/* Insufficient data - no profile, no metrics, not generating */}
        {hasInsufficientData && !generating && !refreshing && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 4 }}>
              No data synced yet
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#878787' : '#64748B', marginBottom: 16 }}>
              Click "Sync Data" to pull metrics from all hubs, then "Generate" for AI analysis.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={handleComputeMetrics} style={{
                background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: 8,
                padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                🔄 Sync Data
              </button>
              <button onClick={handleGenerate} style={{
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#FFFFFF', border: 'none', borderRadius: 8,
                padding: '10px 24px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,.3)',
              }}>
                ✨ Generate AI Profile
              </button>
            </div>
          </div>
        )}

        {/* Has pre-computed metrics but no AI narrative yet */}
        {hasMetricsNoAI && !generating && !refreshing && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 4 }}>
              Metrics ready — {cachedMetrics?.total_items} items across {Object.keys(cachedMetrics?.hub_distribution || {}).length} hubs
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#878787' : '#64748B', marginBottom: 16 }}>
              Data synced {stalenessLabel || 'just now'}. Click "Generate" to create the AI narrative.
            </div>
            <button onClick={handleGenerate} style={{
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              color: '#FFFFFF', border: 'none', borderRadius: 8,
              padding: '10px 24px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,.3)',
            }}>
              ✨ Generate AI Profile
            </button>
          </div>
        )}

        {!isLoading && profile && (
          <>
            {/* 1. Profile Card */}
            <Section title="Resource Profile" isDark={isDark}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#FFFFFF', fontSize: 28, fontWeight: 700,
                  boxShadow: '0 0 0 3px #FFFFFF, 0 0 0 5px #2563EB',
                }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A' }}>{resource?.full_name}</div>
                  <div style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#334155' }}>{resource?.job_role}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {[resource?.r360_departments?.name, resource?.r360_vendors?.name, resource?.country].filter(Boolean).map((p, i) => (
                      <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: isDark ? '#1A1A1A' : '#F1F5F9', color: isDark ? '#A1A1A1' : '#475569' }}>{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* 2. Resource Pattern */}
            {profile.resource_pattern && (
              <Section title="Resource Pattern" isDark={isDark}>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: isDark ? '#A1A1A1' : '#334155', margin: 0 }}>{profile.resource_pattern}</p>
              </Section>
            )}

            {/* 3. Hub Lifetime Performance */}
            <Section title="Hub Lifetime Performance" isDark={isDark}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                {(hubDist || []).map((h: any) => {
                  const hubColor = HUB_COLORS[h.source_hub] || '#64748B';
                  return (
                    <div key={h.source_hub} style={{
                      padding: '10px 12px', borderRadius: 8,
                      borderLeft: `4px solid ${hubColor}`, background: isDark ? '#1A1A1A' : '#F8FAFC',
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase' }}>
                        {HUB_SHORT[h.source_hub] || h.source_hub}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: isDark ? '#EDEDED' : '#0F172A' }}>{h.hub_pct?.toFixed(0) ?? 0}%</div>
                      <div style={{ fontSize: 10, color: isDark ? '#878787' : '#64748B' }}>{h.hub_item_count ?? 0} items · {h.hub_closure_pct?.toFixed(0) ?? 0}% closed</div>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* 4. Delivery Pattern */}
            <Section title="Delivery Pattern" isDark={isDark}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <MetricCard isDark={isDark} label="Avg Subtask" value={deliveryMetrics.avg_subtask_days != null ? `${deliveryMetrics.avg_subtask_days.toFixed(1)}d` : '—'} />
                <MetricCard isDark={isDark} label="Avg Story" value={deliveryMetrics.avg_story_days != null ? `${deliveryMetrics.avg_story_days.toFixed(1)}d` : '—'} />
                <MetricCard isDark={isDark} label="Avg Bug" value={deliveryMetrics.avg_bug_days != null ? `${deliveryMetrics.avg_bug_days.toFixed(1)}d` : '—'} />
                <MetricCard isDark={isDark} label="Pickup Speed" value={deliveryMetrics.pickup_speed_hours != null ? `${deliveryMetrics.pickup_speed_hours.toFixed(0)}h` : '—'} />
              </div>
              {weeklyHistory.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Weekly Closures</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
                    {weeklyHistory.map((v: number, i: number) => (
                      <div key={i} style={{
                        flex: 1,
                        height: allZeros ? '4%' : `${Math.max((v / maxWeekly) * 100, 4)}%`,
                        background: '#2563EB',
                        borderRadius: '3px 3px 0 0',
                        opacity: allZeros ? 0.3 : 0.7,
                      }} title={`${v} items`} />
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* 5. Role Expectation */}
            {roleExp?.expected && (
              <Section title="Role Expectation vs Actual" isDark={isDark}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Expected Duties</div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: isDark ? '#A1A1A1' : '#334155', lineHeight: 1.8 }}>
                      {(roleExp.expected || []).map((e: string, i: number) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Actual Distribution</div>
                    {(roleExp.actual_distribution || []).map((a: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: isDark ? '#A1A1A1' : '#334155', minWidth: 80 }}>{a.label}</span>
                        <div style={{ flex: 1, height: 8, background: isDark ? '#1A1A1A' : '#F1F5F9', borderRadius: 4 }}>
                          <div style={{ width: `${a.pct}%`, height: '100%', background: '#2563EB', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', minWidth: 36, textAlign: 'right' }}>{a.pct}%</span>
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
              <Section title="Behavioral Patterns" isDark={isDark}>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {patterns.map((p: any) => (
                    <li key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', marginTop: 5, flexShrink: 0 }} />
                      <div>
                        <span style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#334155', lineHeight: 1.6 }}>{p.pattern_text}</span>
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

            {/* 7-8. Release Standing */}
            {standing && (
              <Section title="Current Release Standing" isDark={isDark}>
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <svg width={120} height={120} viewBox="0 0 120 120" aria-label={`Completion: ${completionPct}%`}>
                      <circle cx={60} cy={60} r={50} fill="none" stroke={isDark ? '#1A1A1A' : '#F1F5F9'} strokeWidth={12} />
                      {completionPct > 0 && (
                        <circle cx={60} cy={60} r={50} fill="none"
                          stroke={completionPct === 100 ? '#059669' : '#2563EB'}
                          strokeWidth={12}
                          strokeDasharray={`${(completionPct / 100) * 314} 314`}
                          strokeLinecap="round" transform="rotate(-90 60 60)" />
                      )}
                      <text x={60} y={completionPct === 100 ? 55 : 60} textAnchor="middle" dominantBaseline="central"
                        style={{ fontSize: 22, fontWeight: 900, fill: isDark ? '#EDEDED' : '#0F172A' }}>
                        {completionPct}%
                      </text>
                      {completionPct === 100 && (
                        <text x={60} y={75} textAnchor="middle" style={{ fontSize: 14, fill: '#059669' }}>✓</text>
                      )}
                    </svg>
                    <div style={{
                      marginTop: 8, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 6,
                      background: standing.verdict === 'on_track' ? '#D1FAE5' : standing.verdict === 'at_risk' ? '#FEF3C7' : '#FEE2E2',
                      color: standing.verdict === 'on_track' ? '#059669' : standing.verdict === 'at_risk' ? '#D97706' : '#DC2626',
                      textTransform: 'uppercase',
                    }}>
                      {standing.verdict?.replace('_', ' ')}
                    </div>
                    {standing.confidence_score != null && (
                      <div style={{ marginTop: 4, fontSize: 10, color: isDark ? '#878787' : '#64748B' }}>
                        {standing.confidence_score === 0
                          ? 'Low confidence — insufficient data'
                          : `Confidence: ${standing.confidence_score}%`}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                      <MiniStat isDark={isDark} label="Done" value={standing.done_count ?? 0} color="#059669" />
                      <MiniStat isDark={isDark} label="In Progress" value={standing.progress_count ?? 0} color="#2563EB" />
                      <MiniStat isDark={isDark} label="To Do" value={standing.todo_count ?? 0} color="#DC2626" />
                    </div>

                    {standing.project_standings && (
                      <div>
                        {(standing.project_standings as any[]).map((ps: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 11 }}>{ps.statusEmoji || ps.status_emoji || '📊'}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', minWidth: 100 }}>{ps.project}</span>
                            <div style={{ flex: 1, height: 6, background: isDark ? '#1A1A1A' : '#F1F5F9', borderRadius: 3 }}>
                              <div style={{ width: `${ps.items ? (ps.done / ps.items) * 100 : 0}%`, height: '100%', background: '#059669', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 10, color: isDark ? '#878787' : '#64748B' }}>{ps.done}/{ps.items}</span>
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
            <div style={{
              marginTop: 24, padding: '12px 16px', borderRadius: 8,
              background: isDark ? '#1A1A1A' : '#F8FAFC', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', gap: 12,
              fontSize: 11, color: isDark ? '#878787' : '#64748B',
            }}>
              <span>Generated: {profile.generated_at ? new Date(profile.generated_at).toLocaleString() : '—'}</span>
              <span>·</span>
              <span>v{profile.generation_version || '1.0'}</span>
              <span>·</span>
              <span>Next Refresh: {profile.next_refresh_at ? new Date(profile.next_refresh_at).toLocaleString() : 'On demand'}</span>
            </div>
          </>
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
};

const Section = ({ title, children, isDark }: { title: string; children: React.ReactNode; isDark?: boolean }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{
      fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
      color: '#3B82F6', marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 10, fontWeight: 800 }}>✦</span>
      {title}
      <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : '#DBEAFE' }} />
    </div>
    {children}
  </div>
);

const MetricCard = ({ label, value, isDark }: { label: string; value: string; isDark?: boolean }) => (
  <div style={{ padding: '10px 12px', borderRadius: 8, background: isDark ? '#1A1A1A' : '#F8FAFC', textAlign: 'center' }}>
    <div style={{ fontSize: 20, fontWeight: 900, color: isDark ? '#EDEDED' : '#0F172A' }}>{value}</div>
    <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: isDark ? '#878787' : '#64748B', marginTop: 4 }}>{label}</div>
  </div>
);

const MiniStat = ({ label, value, color, isDark }: { label: string; value: number; color: string; isDark?: boolean }) => (
  <div style={{ textAlign: 'center', padding: '8px', borderRadius: 6, background: isDark ? '#1A1A1A' : '#F8FAFC' }}>
    <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: isDark ? '#878787' : '#64748B' }}>{label}</div>
  </div>
);

export default AiIntelligenceOverlay;
