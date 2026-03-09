import React, { useState, useMemo } from 'react';
import { useReleases } from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';
import { ReleaseStatusBadge } from '@/components/releasehub/ReleaseStatusBadge';
import { SkeletonRows } from '@/components/releasehub/SkeletonRows';
import { EmptyState } from '@/components/releasehub/EmptyState';
import { ChevronDown, BarChart3 } from 'lucide-react';

export default function ReleaseComparePage() {
  const { data: releases = [], isLoading } = useReleases();
  const [selected, setSelected] = useState<string[]>([]);

  const selectedReleases = useMemo(() => releases.filter((r: any) => selected.includes(r.id)), [releases, selected]);

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  };

  const comparisonRows = [
    { label: 'Status', fn: (r: any) => <ReleaseStatusBadge status={r.status} /> },
    { label: 'CHG Count', fn: (r: any) => <span className="font-bold" style={{ fontFamily: RH.fontMono, color: RH.ink1 }}>{r.change_count || r.chg_count || 0}</span> },
    { label: 'Test Cycles', fn: (r: any) => <span style={{ color: RH.ink2 }}>{r.test_cycle_count || 0}</span> },
    { label: 'Days Left', fn: (r: any) => <span className={r.is_overdue ? 'text-[#DC2626] font-bold' : 'text-[#475569]'}>{r.is_overdue ? `${Math.abs(r.days_remaining)}d overdue` : r.days_remaining != null ? `${r.days_remaining}d` : '—'}</span> },
    { label: 'Source', fn: (r: any) => <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: r.source === 'jira' ? '#FFF7ED' : '#F0FDFA', color: r.source === 'jira' ? '#9A3412' : '#0D9488' }}>{r.source}</span> },
  ];

  return (
    <div className="rh-page">
      <div className="mb-5">
        <h1 className="text-[22px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Release Compare</h1>
        <p className="text-[13px] text-[#64748B]" style={{ fontFamily: RH.fontBody }}>Side-by-side release comparison (select up to 4)</p>
      </div>

      {isLoading ? (
        <SkeletonRows variant="card" count={4} />
      ) : releases.length === 0 ? (
        <EmptyState icon={BarChart3} title="No releases to compare" subtitle="Create at least two releases to use the comparison view." />
      ) : (
        <>
          {/* Selector */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {releases.slice(0, 8).map((r: any) => {
              const isSelected = selected.includes(r.id);
              return (
                <button key={r.id} onClick={() => toggleSelect(r.id)}
                  className={`bg-white rounded-lg border p-3 text-left transition-all ${isSelected ? 'border-[#0D9488] ring-2 ring-[#0D9488]/20' : 'border-[#E2E8F0] hover:border-[#C9D3E0]'}`}
                  style={{ transition: 'all 0.12s ease' }}>
                  <span className="text-[13px] font-semibold block truncate" style={{ color: RH.ink1 }}>{r.name}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <ReleaseStatusBadge status={r.status} />
                    {r.version && <span className="text-[10px] text-[#64748B]" style={{ fontFamily: RH.fontMono }}>{r.version}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Comparison Table */}
          {selectedReleases.length >= 2 ? (
            <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
              <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }} role="table">
                <thead>
                  <tr className="bg-[#F4F7FA] border-b border-[#E2E8F0]">
                    <th scope="col" className="px-3 py-0 h-9 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#475569] w-[140px]">METRIC</th>
                    {selectedReleases.map((r: any) => (
                      <th key={r.id} scope="col" className="px-3 py-0 h-9 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#475569]">{r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(row => (
                    <tr key={row.label} className="border-b border-[#F1F5F9] h-9">
                      <td className="px-3 py-0 font-semibold text-[#64748B]">{row.label}</td>
                      {selectedReleases.map((r: any) => (
                        <td key={r.id} className="px-3 py-0">{row.fn(r)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-8 text-center text-[#94A3B8] text-[13px]">
              Select at least 2 releases above to see a comparison
            </div>
          )}
        </>
      )}
    </div>
  );
}
