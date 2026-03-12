import React, { useState, useMemo } from 'react';
import { Clock, Filter } from 'lucide-react';
import { useProductionEvents } from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';
import { DeployResultBadge } from '@/components/releasehub/DeployResultBadge';
import { StatusLozenge } from '@/components/releasehub/StatusLozenge';
import { SkeletonRows } from '@/components/releasehub/SkeletonRows';
import { EmptyState } from '@/components/releasehub/EmptyState';
import { format } from 'date-fns';

export default function ProductionEventsPage() {
  const { data: events = [], isLoading } = useProductionEvents();
  const [resultFilter, setResultFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (resultFilter === 'all') return events;
    return events.filter((e: any) => e.deployment_result?.toLowerCase() === resultFilter);
  }, [events, resultFilter]);

  const filterChips = [
    { key: 'all', label: 'All' },
    { key: 'success', label: 'Success' },
    { key: 'rolled_back', label: 'Rolled Back' },
    { key: 'monitoring', label: 'Monitoring' },
  ];

  return (
    <div className="p-6" style={{ background: '#FFFFFF' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[24px]" style={{ fontFamily: RH.fontDisplay, fontWeight: 650, color: RH.ink1 }}>Production Events</h1>
          <p className="text-[13px] text-[#64748B] mt-1">Live production deployments, hotfixes, and rollbacks</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-5">
        <Filter size={14} className="text-[#64748B]" />
        {filterChips.map(chip => (
          <button key={chip.key} onClick={() => setResultFilter(chip.key)}
            className="h-8 px-3 rounded-[6px] text-[12px] transition-colors"
            style={{
              fontWeight: 600,
              border: `0.75px solid ${resultFilter === chip.key ? '#2563EB' : 'rgba(15,23,42,0.12)'}`,
              background: resultFilter === chip.key ? '#EFF6FF' : '#FFFFFF',
              color: resultFilter === chip.key ? '#2563EB' : '#64748B',
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <SkeletonRows count={5} />
      ) : events.length === 0 ? (
        <EmptyState icon={Clock} title="No production events yet" subtitle="Production deployments will be recorded here" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Clock} title="No events match your filter" subtitle="Try a different filter" />
      ) : (
        <div className="relative pl-8">
          {/* Vertical timeline line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-[rgba(15,23,42,0.12)]" />

          <div className="space-y-4">
            {filtered.map((ev: any) => {
              const dotColor = ev.deployment_result === 'SUCCESS' ? '#16A34A'
                : ev.deployment_result === 'ROLLED_BACK' ? '#DC2626'
                : '#94A3B8';
              const dotSize = ev.event_type === 'DEPLOYMENT' ? 16
                : ev.event_type === 'ROLLBACK' ? 14
                : 12;

              return (
                <div key={ev.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className="absolute rounded-full bg-white"
                    style={{
                      left: -20 - dotSize / 2,
                      top: 18,
                      width: dotSize,
                      height: dotSize,
                      border: `2.5px solid ${dotColor}`,
                    }}
                  />

                  {/* Event card */}
                  <div className="bg-white rounded-[4px] p-4" style={{ border: '0.75px solid rgba(15,23,42,0.12)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[14px]" style={{ fontWeight: 650, color: RH.ink1 }}>{ev.title}</span>
                      <StatusLozenge status={ev.event_type} />
                      {ev.deployment_result && <DeployResultBadge result={ev.deployment_result} />}
                    </div>
                    <div className="flex items-center gap-4 text-[12px] text-[#64748B]">
                      {ev.change_key && (
                        <span>
                          Change: <span style={{ fontFamily: RH.fontMono, fontWeight: 650, color: '#2563EB' }}>{ev.change_key}</span>
                        </span>
                      )}
                      {ev.release_key && (
                        <span>
                          Release: <span style={{ fontFamily: RH.fontMono, fontWeight: 650, color: '#334155' }}>{ev.release_key}</span>
                        </span>
                      )}
                      <span>{ev.deployed_at ? format(new Date(ev.deployed_at), 'MMM d, yyyy HH:mm') : '—'}</span>
                      <span>by {ev.deployed_by}</span>
                      {ev.duration_minutes && <span>{ev.duration_minutes}min</span>}
                    </div>
                    {ev.notes && <p className="text-[12px] text-[#94A3B8] mt-1.5">{ev.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
