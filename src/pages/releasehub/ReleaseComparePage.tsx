import React, { useState, useMemo } from 'react';
import { useReleases } from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';
import { ReleaseStatusBadge } from '@/components/releasehub/ReleaseStatusBadge';
import { SkeletonRows } from '@/components/releasehub/SkeletonRows';
import { EmptyState } from '@/components/releasehub/EmptyState';
import { BarChart3 } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

const RADAR_COLORS = ['var(--ds-text-brand, #2563EB)', '#0D9488', 'var(--ds-text-danger, #DC2626)', 'var(--ds-text-subtlest, #64748B)'];
const statusScore: Record<string, number> = { todo: 20, in_progress: 55, done: 100, archived: 10 };

export default function ReleaseComparePage() {
  const { data: releases = [], isLoading } = useReleases();
  const [selected, setSelected] = useState<string[]>([]);

  const selectedReleases = useMemo(() => releases.filter((r: any) => selected.includes(r.id)), [releases, selected]);

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  };

  const getBestIdx = (values: number[], higherIsBetter = true) => {
    if (values.length === 0) return -1;
    const best = higherIsBetter ? Math.max(...values) : Math.min(...values);
    return values.indexOf(best);
  };

  const comparisonRows: { label: string; values: any[]; render: (v: any, r?: any) => React.ReactNode; bestIdx: number }[] = useMemo(() => {
    if (selectedReleases.length < 2) return [];
    return [
      { label: 'Status', values: selectedReleases.map((r: any) => r.status), render: (v: any) => <ReleaseStatusBadge status={v} />, bestIdx: -1 },
      { label: 'Target Date', values: selectedReleases.map((r: any) => r.target_date), render: (v: any) => v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', bestIdx: -1 },
      { label: 'Days Remaining', values: selectedReleases.map((r: any) => r.days_remaining ?? 0), render: (v: any, r: any) => r?.is_overdue ? <span className="text-[var(--ds-text-danger, #DC2626)] font-bold">{Math.abs(v)}d OVERDUE</span> : <span>{v}d</span>, bestIdx: getBestIdx(selectedReleases.map((r: any) => r.days_remaining ?? 0), true) },
      { label: 'CHG Count', values: selectedReleases.map((r: any) => r.change_count || r.chg_count || 0), render: (v: any) => <span className="font-bold" style={{ fontFamily: RH.fontMono, color: v === 0 ? '#0D9488' : RH.ink1 }}>{v}</span>, bestIdx: -1 },
      { label: 'Test Cycles', values: selectedReleases.map((r: any) => r.test_cycle_count || 0), render: (v: any) => <span>{v}</span>, bestIdx: getBestIdx(selectedReleases.map((r: any) => r.test_cycle_count || 0), true) },
      { label: 'Sign-offs Pending', values: selectedReleases.map((r: any) => r.pending_signoffs || 0), render: (v: any) => <span className={v > 0 ? 'text-[var(--ds-text-danger, #DC2626)] font-bold' : ''}>{v}</span>, bestIdx: getBestIdx(selectedReleases.map((r: any) => r.pending_signoffs || 0), false) },
    ];
  }, [selectedReleases]);

  const radarData = useMemo(() => {
    if (selectedReleases.length < 2) return [];
    const subjects = [
      { subject: 'Status', fn: (r: any) => statusScore[r.status] || 0 },
      { subject: 'Days Left', fn: (r: any) => Math.max(0, Math.min(100, r.days_remaining || 0)) },
      { subject: 'CHG Safety', fn: (r: any) => { const c = r.change_count || r.chg_count || 0; return c === 0 ? 100 : Math.max(0, 100 - c * 20); } },
    ];
    return subjects.map(s => {
      const entry: any = { subject: s.subject };
      selectedReleases.forEach((r: any, i: number) => { entry[`r${i}`] = s.fn(r); });
      return entry;
    });
  }, [selectedReleases]);

  return (
    <div className="rh-page">
      <div className="mb-5">
        <h1 className="text-[22px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Release Compare</h1>
        <p className="text-[13px] text-[var(--ds-text-subtlest, #64748B)]" style={{ fontFamily: RH.fontBody }}>Side-by-side release comparison (select up to 4)</p>
      </div>

      {isLoading ? (
        <SkeletonRows variant="card" count={4} />
      ) : releases.length === 0 ? (
        <EmptyState icon={BarChart3} title="No releases to compare" subtitle="Create at least two releases to use the comparison view." />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {releases.slice(0, 8).map((r: any) => {
              const isSelected = selected.includes(r.id);
              return (
                <button key={r.id} onClick={() => toggleSelect(r.id)}
                  className={`bg-white dark:bg-[var(--ds-surface-raised, #1A1A1A)] rounded-lg border p-3 text-left transition-all ${isSelected ? 'border-[#0D9488] border-2 ring-2 ring-[#0D9488]/20' : 'border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-border, #2E2E2E)] hover:border-[#C9D3E0]'}`}
                  style={{ transition: 'all 0.12s ease' }}>
                  <span className="text-[13px] font-semibold block truncate" style={{ color: RH.ink1 }}>{r.name}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <ReleaseStatusBadge status={r.status} />
                    {r.version && <span className="text-[10px] text-[var(--ds-text-subtlest, #64748B)]" style={{ fontFamily: RH.fontMono }}>{r.version}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedReleases.length >= 2 ? (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[var(--ds-surface-raised, #1A1A1A)] rounded-lg border border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-border, #2E2E2E)] overflow-hidden">
                <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }} role="table">
                  <thead>
                    <tr className="bg-[#F4F7FA] border-b border-[var(--bd-default, #E2E8F0)]">
                      <th scope="col" className="px-3 py-0 h-9 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-[var(--ds-text-subtle, #475569)] w-[160px]">METRIC</th>
                      {selectedReleases.map((r: any) => (
                        <th key={r.id} scope="col" className="px-3 py-0 h-9 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-[var(--ds-text-subtle, #475569)]">{r.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map(row => (
                      <tr key={row.label} className="border-b border-[var(--ds-surface-sunken, #F1F5F9)] h-9">
                        <td className="px-3 py-0 font-semibold text-[var(--ds-text-subtlest, #64748B)]">{row.label}</td>
                        {selectedReleases.map((r: any, i: number) => (
                          <td key={r.id} className="px-3 py-0">
                            <span className="inline-flex items-center gap-1">
                              {row.render(row.values[i] as any, r)}
                              {row.bestIdx === i && <span className="text-[#0D9488]">★</span>}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {radarData.length > 0 && (
                <div className="bg-white dark:bg-[var(--ds-surface-raised, #1A1A1A)] rounded-lg border border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-border, #2E2E2E)] p-4">
                  <h3 className="text-[14px] font-bold mb-3" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Radar Comparison</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--bd-default, #E2E8F0)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--ds-text-subtle, #475569)' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      {selectedReleases.map((r: any, i: number) => (
                        <Radar key={r.id} name={r.name} dataKey={`r${i}`} stroke={RADAR_COLORS[i]} fill={RADAR_COLORS[i]} fillOpacity={0.15} />
                      ))}
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[var(--ds-surface-raised, #1A1A1A)] rounded-lg border border-[var(--bd-default, #E2E8F0)] dark:border-[var(--ds-border, #2E2E2E)] p-8 text-center text-[var(--ds-text-subtlest, #94A3B8)] text-[13px]">
              Select at least 2 releases above to see a comparison
            </div>
          )}
        </>
      )}
    </div>
  );
}
