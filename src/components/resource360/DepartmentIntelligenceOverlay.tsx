import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDeptAICache } from '@/hooks/useDeptAICache';

interface Props {
  departmentName: string;
  onClose: () => void;
}

export default function DepartmentIntelligenceOverlay({ departmentName, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { workloadDistribution: cachedWorkload, dataAge, isStale, isComputing, hasCache, refresh: cacheRefresh, refetch: cacheRefetch } = useDeptAICache(departmentName);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    handleGenerate();
  }, [departmentName]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      // Also trigger cache refresh in background
      cacheRefresh();
      const { data: result, error: fnErr } = await supabase.functions.invoke('r360-department-intelligence', {
        body: { department_name: departmentName },
      });
      if (fnErr) throw new Error(fnErr.message || 'Failed to generate department intelligence');
      if (result?.error) throw new Error(result.error);
      setData(result);
      cacheRefetch();
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

  const ai = data?.ai || {};
  const resourceSummaries = data?.resource_summaries || [];

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
        {hasCache && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
            Data: {dataAge}{isStale ? ' · ⚠ Stale' : ''}
          </span>
        )}
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

        {/* Main content — only Workload Distribution + Weekly Story */}
        {(data || hasCache) && !generating && (
          <>
            {/* Workload Distribution — prefer cached, fallback to AI-generated */}
            {(cachedWorkload?.length > 0 || ai.workload_distribution?.length > 0) && (
              <Section title="Workload Distribution">
                {(cachedWorkload || ai.workload_distribution).map((w: any, i: number) => (
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
              <span>{data.metrics?.resource_count} resources · {data.metrics?.total_items} items analyzed</span>
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

const MiniStat = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 14, fontWeight: 900, color }}>{value}</div>
    <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase' as const, color: '#64748B' }}>{label}</div>
  </div>
);
