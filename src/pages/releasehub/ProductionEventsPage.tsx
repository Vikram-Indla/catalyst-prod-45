import React, { useState, useMemo } from 'react';
import { Clock, Filter, Check } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useProductionEvents } from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';
import { SkeletonRows } from '@/components/releasehub/SkeletonRows';
import { EmptyState } from '@/components/releasehub/EmptyState';
import { format } from 'date-fns';

const EVENT_TYPE_LOZENGE: Record<string, { bg: string; color: string; label: string }> = {
  DEPLOYMENT: { bg: '#1B7F37', color: 'var(--ds-text-inverse, #FFFFFF)', label: 'DEPLOYMENT' },
  HOTFIX: { bg: 'var(--ds-border, #DFE1E6)', color: '#42526E', label: 'HOTFIX' },
  ROLLBACK: { bg: 'var(--ds-background-danger, #FEF2F2)', color: 'var(--ds-text-danger, #991B1B)', label: 'ROLLBACK' },
};

const RESULT_BADGE: Record<string, { bg: string; color: string; label: string; icon?: boolean }> = {
  SUCCESS: { bg: '#1B7F37', color: 'var(--ds-text-inverse, #FFFFFF)', label: 'SUCCESS', icon: true },
  ROLLED_BACK: { bg: 'var(--ds-background-danger, #FEF2F2)', color: 'var(--ds-text-danger, #991B1B)', label: 'ROLLED BACK' },
  MONITORING: { bg: '#0C66E4', color: 'var(--ds-text-inverse, #FFFFFF)', label: 'MONITORING' },
};

function Lozenge({ bg, color, label, icon }: { bg: string; color: string; label: string; icon?: boolean }) {
  return (
    <span style={{
      height: 20, padding: '0 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
      letterSpacing: '0.03em', display: 'inline-flex', alignItems: 'center', gap: 4,
      background: bg, color,
    }}>
      {icon && <Check style={{ width: 10, height: 10 }} />}
      {label}
    </span>
  );
}

function getDotStyle(event: any) {
  const type = event.event_type?.toUpperCase() || 'DEPLOYMENT';
  const result = event.deployment_result?.toUpperCase();

  let borderColor = 'var(--ds-text-success, #16A34A)';
  let size = 16;

  if (type === 'ROLLBACK' || result === 'ROLLED_BACK') {
    borderColor = 'var(--ds-text-danger, #DC2626)';
    size = 14;
  } else if (type === 'HOTFIX') {
    borderColor = 'var(--ds-text-subtlest, #64748B)';
    size = 12;
  }

  return { borderColor, size };
}

function formatDateTime(dateStr: string) {
  try {
    return format(new Date(dateStr), "d MMM yyyy, HH:mm");
  } catch {
    return dateStr;
  }
}

export default function ProductionEventsPage() {
  const { isDark } = useTheme();
  const { data: events = [], isLoading } = useProductionEvents();
  const [resultFilter, setResultFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (resultFilter === 'all') return events;
    return events.filter((e: any) => e.deployment_result?.toUpperCase() === resultFilter.toUpperCase());
  }, [events, resultFilter]);

  const filterChips = [
    { key: 'all', label: 'All' },
    { key: 'SUCCESS', label: 'Success' },
    { key: 'ROLLED_BACK', label: 'Rolled Back' },
    { key: 'MONITORING', label: 'Monitoring' },
  ];

  return (
    <div style={{ background: 'var(--cp-bg-elevated, #FFFFFF)', minHeight: '100%', padding: 24 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{
            fontFamily: 'var(--cp-font-heading)', fontSize: 24, fontWeight: 650,
            lineHeight: 1.2, color: RH.ink1,
          }}>
            Production Events
          </h1>
          <p style={{ fontSize: 13, color: 'var(--cp-text-tertiary, #64748B)', marginTop: 2 }}>
            Post-deployment monitoring & event log
          </p>
        </div>
        <button
          className="h-9 px-4 rounded-md text-[13px] font-semibold flex items-center gap-1.5"
          style={{ border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.12)', background: 'var(--cp-bg-elevated, #FFFFFF)', color: 'var(--cp-text-secondary, #475569)' }}
          onClick={() => {
            const next = resultFilter === 'all' ? 'SUCCESS' : 'all';
            setResultFilter(next);
          }}
        >
          <Filter style={{ width: 14, height: 14 }} />
          Filter
        </button>
      </div>

      {/* Filter chips (shown below header) */}
      <div className="flex items-center gap-2 mb-5">
        {filterChips.map(chip => (
          <button key={chip.key} onClick={() => setResultFilter(chip.key)}
            className="h-8 px-3 rounded-[6px] text-[12px] transition-colors"
            style={{
              fontWeight: 600,
              border: `0.75px solid ${resultFilter === chip.key ? 'var(--ds-text-brand, #2563EB)' : 'var(--cp-border-default, rgba(15,23,42,0.12))'}`,
              background: resultFilter === chip.key ? ('var(--cp-primary-light, #EFF6FF)') : ('var(--cp-bg-elevated, #FFFFFF)'),
              color: resultFilter === chip.key ? 'var(--ds-text-brand, #2563EB)' : ('var(--cp-text-tertiary, #64748B)'),
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
        <div className="relative" style={{ paddingLeft: 28 }}>
          {/* Vertical line */}
          <div className="absolute top-0 bottom-0" style={{
            left: 10, width: 2, background: 'rgba(15,23,42,0.12)',
          }} />

          {filtered.map((ev: any, idx: number) => {
            const { borderColor, size } = getDotStyle(ev);
            const typeKey = ev.event_type?.toUpperCase() || 'DEPLOYMENT';
            const resultKey = ev.deployment_result?.toUpperCase();
            const typeLoz = EVENT_TYPE_LOZENGE[typeKey];
            // Skip result badge when redundant with event type (ROLLBACK + ROLLED_BACK)
            const resultBadge = (resultKey && !(typeKey === 'ROLLBACK' && resultKey === 'ROLLED_BACK')) ? RESULT_BADGE[resultKey] : null;

            return (
              <div key={ev.id} className="relative" style={{ paddingBottom: idx === filtered.length - 1 ? 0 : 24 }}>
                {/* Timeline dot */}
                <div
                  className="absolute rounded-full"
                  style={{
                    left: -(18 + size / 2),
                    top: 4,
                    width: size,
                    height: size,
                    border: `2px solid ${borderColor}`,
                    background: 'var(--cp-bg-elevated, #FFFFFF)',
                  }}
                />

                {/* Event card */}
                <div
                  style={{
                    background: 'var(--cp-bg-elevated, #FFFFFF)',
                    borderRadius: 4,
                    padding: '14px 16px',
                    border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.12)',
                  }}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span style={{ fontSize: 14, fontWeight: 650, color: RH.ink1 }}>{ev.title}</span>
                    {typeLoz && <Lozenge bg={typeLoz.bg} color={typeLoz.color} label={typeLoz.label} />}
                    {resultBadge && <Lozenge bg={resultBadge.bg} color={resultBadge.color} label={resultBadge.label} icon={resultBadge.icon} />}
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap" style={{ gap: 16, fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)' }}>
                    {ev.change_key && <span style={{ fontFamily: RH.fontMono }}>{ev.change_key}</span>}
                    {ev.release_key && <span style={{ fontFamily: RH.fontMono }}>{ev.release_key}</span>}
                    {ev.deployed_at && <span>{formatDateTime(ev.deployed_at)}</span>}
                    {ev.deployed_by && <span>{ev.deployed_by}</span>}
                    {ev.duration_minutes != null && <span>{ev.duration_minutes} min</span>}
                  </div>

                  {/* Notes (if any) */}
                  {ev.notes && (
                    <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #94A3B8)', marginTop: 6 }}>{ev.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
