/**
 * ContractOverview — Widget: Contract expiry radar
 * Row 3 (right), span 4
 * DATA SOURCE: resource_inventory (LIVE)
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ContractOverview() {
  const navigate = useNavigate();

  const { data: resources, isLoading } = useQuery({
    queryKey: ['strategy', 'contracts-radar'],
    queryFn: async () => {
      const { data } = await supabase
        .from('resource_inventory')
        .select('id, name, role_name, department_name, vendor_name, contract_end_date, resource_type, is_active')
        .eq('is_active', true)
        .not('contract_end_date', 'is', null)
        .order('contract_end_date', { ascending: true });
      return data || [];
    },
    staleTime: 60_000,
  });

  const metrics = useMemo(() => {
    if (!resources) return null;
    const today = new Date();
    const threeMonths = new Date(today.getTime() + 90 * 86400000);
    const sixMonths = new Date(today.getTime() + 180 * 86400000);

    const expired = resources.filter(r => new Date(r.contract_end_date!) < today);
    const critical = resources.filter(r => {
      const end = new Date(r.contract_end_date!);
      return end >= today && end <= threeMonths;
    });
    const warning = resources.filter(r => {
      const end = new Date(r.contract_end_date!);
      return end > threeMonths && end <= sixMonths;
    });
    const safe = resources.filter(r => new Date(r.contract_end_date!) > sixMonths);

    // By department
    const deptContracts = Object.entries(
      resources.reduce((acc, r) => {
        const dept = r.department_name || 'Unknown';
        if (!acc[dept]) acc[dept] = { total: 0, critical: 0, warning: 0, safe: 0, expired: 0 };
        acc[dept].total++;
        const end = new Date(r.contract_end_date!);
        if (end < today) acc[dept].expired++;
        else if (end <= threeMonths) acc[dept].critical++;
        else if (end <= sixMonths) acc[dept].warning++;
        else acc[dept].safe++;
        return acc;
      }, {} as Record<string, { total: number; critical: number; warning: number; safe: number; expired: number }>)
    ).sort((a, b) => (b[1].critical + b[1].expired) - (a[1].critical + a[1].expired));

    // Next to expire — only future contracts, sorted soonest first
    const nextExpiring = critical
      .sort((a, b) => new Date(a.contract_end_date!).getTime() - new Date(b.contract_end_date!).getTime())
      .slice(0, 3);

    // Vendor concentration
    const vendorCounts = resources.reduce((acc, r) => {
      const vendor = r.vendor_name || 'Internal';
      acc[vendor] = (acc[vendor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topVendor = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])[0];
    const vendorPct = topVendor ? Math.round((topVendor[1] / resources.length) * 100) : 0;

    return { expired, critical, warning, safe, deptContracts, nextExpiring, topVendor, vendorPct };
  }, [resources]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 50, background: 'var(--catalyst-bg-hover)', borderRadius: 6 }} />
          ))}
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 18, background: 'var(--catalyst-bg-hover)', borderRadius: 6 }} />
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const { expired, critical, warning, safe, deptContracts, nextExpiring, topVendor, vendorPct } = metrics;
  const total = (resources?.length || 1);

  const kpis = [
    { label: 'EXPIRED', value: expired.length, color: '#EF4444', pulse: expired.length > 0 },
    { label: '≤3 MONTHS', value: critical.length, color: '#EF4444', pulse: false },
    { label: '3–6 MONTHS', value: warning.length, color: '#D97706', pulse: false },
    { label: '>6 MONTHS', value: safe.length, color: '#16A34A', pulse: false },
  ];

  const timelineSegments = [
    { label: 'Expired', count: expired.length, color: '#EF4444' },
    { label: '≤3mo', count: critical.length, color: '#F87171' },
    { label: '3-6mo', count: warning.length, color: '#D97706' },
    { label: '>6mo', count: safe.length, color: '#16A34A' },
  ];

  return (
    <TooltipProvider>
      <div>
        {/* A) KPI Strip */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {kpis.map(kpi => (
            <div key={kpi.label} className="text-center relative" style={{
              border: '1px solid var(--catalyst-border-default, #E2E8F0)', borderRadius: 6, padding: '4px 6px',
            }}>
              {kpi.pulse && (
                <span className="contract-pulse-dot" style={{
                  position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: '#EF4444',
                }} />
              )}
              <div style={{ fontSize: 16, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--catalyst-text-tertiary)', fontWeight: 600 }}>
                {kpi.label}
              </div>
            </div>
          ))}
        </div>

        {/* B) Timeline Bar */}
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--catalyst-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Contract Timeline
        </div>
        <div className="flex overflow-hidden mb-1" style={{ height: 12, borderRadius: 9999 }}>
          {timelineSegments.map(seg => {
            const pct = (seg.count / total) * 100;
            return pct > 0 ? (
              <Tooltip key={seg.label}>
                <TooltipTrigger asChild>
                  <div style={{
                    width: `${pct}%`,
                    background: seg.color,
                    transition: 'width 600ms ease-out',
                    minWidth: pct > 0 ? 2 : 0,
                    cursor: 'help',
                  }} />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{seg.label}: {seg.count} contracts</p>
                </TooltipContent>
              </Tooltip>
            ) : null;
          })}
        </div>
        <div className="flex flex-wrap gap-2 mb-3" style={{ fontSize: 9, color: 'var(--catalyst-text-secondary)' }}>
          {timelineSegments.map(seg => (
            <span key={seg.label} className="flex items-center gap-1">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: seg.color }} />
              {seg.label} ({seg.count})
            </span>
          ))}
        </div>

        {/* C) By Department */}
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--catalyst-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          By Department
        </div>
        <div className="space-y-1 mb-3">
          {deptContracts.map(([dept, counts]) => {
            const deptTotal = counts.total || 1;
            const tooltipText = `${dept}: ${counts.total} contracts\n🔴 Expired: ${counts.expired}  |  🔴 ≤3mo: ${counts.critical}  |  🟠 3-6mo: ${counts.warning}  |  🟢 >6mo: ${counts.safe}`;
            return (
              <Tooltip key={dept}>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center gap-2"
                    style={{ transition: 'background 150ms', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ width: 75, fontSize: 10, textAlign: 'right', color: 'var(--catalyst-text-secondary)', flexShrink: 0, fontWeight: 500 }}>
                      {dept === 'Technical Support' ? 'Tech Support' : dept}
                    </span>
                    <div className="flex-1 flex overflow-hidden" style={{ height: 8, borderRadius: 4, background: '#F1F5F9' }}>
                      {counts.expired > 0 && (
                        <div style={{ width: `${(counts.expired / deptTotal) * 100}%`, height: '100%', background: '#EF4444', transition: 'width 600ms ease-out' }} />
                      )}
                      {counts.critical > 0 && (
                        <div style={{ width: `${(counts.critical / deptTotal) * 100}%`, height: '100%', background: '#F87171', transition: 'width 600ms ease-out' }} />
                      )}
                      {counts.warning > 0 && (
                        <div style={{ width: `${(counts.warning / deptTotal) * 100}%`, height: '100%', background: '#D97706', transition: 'width 600ms ease-out' }} />
                      )}
                      {counts.safe > 0 && (
                        <div style={{ width: `${(counts.safe / deptTotal) * 100}%`, height: '100%', background: '#16A34A', transition: 'width 600ms ease-out' }} />
                      )}
                    </div>
                    <span style={{ width: 22, fontSize: 10, textAlign: 'right', color: 'var(--catalyst-text-tertiary)', flexShrink: 0 }}>
                      {counts.total}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs whitespace-pre-line">{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* D) Next to Expire */}
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--catalyst-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Next to Expire
        </div>
        <div className="space-y-1 mb-3">
          {nextExpiring.length > 0 ? nextExpiring.map((r) => (
              <div key={r.id} className="flex items-center gap-2" style={{ fontSize: 11 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                <span className="flex-1 truncate" style={{ color: 'var(--catalyst-text-primary)', fontWeight: 500 }}>
                  {r.name || '—'}
                </span>
                <span style={{ color: 'var(--catalyst-text-tertiary)', fontSize: 10 }}>{r.department_name || '—'}</span>
                <span style={{ color: '#EF4444', fontWeight: 600, fontSize: 10 }}>
                  {formatDate(r.contract_end_date!)}
                </span>
              </div>
          )) : (
            <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)', textAlign: 'center' }}>
              No imminent expirations
            </div>
          )}
          {critical.length > 3 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/planhub/capacity'); }}
              style={{ fontSize: 10, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
            >
              +{critical.length - 3} more expiring within 3 months →
            </button>
          )}
        </div>

        {/* E) Vendor Concentration */}
        {topVendor && (
          <div className="flex items-center gap-1.5" style={{ fontSize: 10, color: 'var(--catalyst-text-secondary)' }}>
            {vendorPct > 40 && <AlertTriangle size={10} style={{ color: vendorPct > 60 ? '#EF4444' : '#D97706' }} />}
            <span>Top vendor: <strong>{topVendor[0]}</strong> — {topVendor[1]} resources ({vendorPct}%)</span>
          </div>
        )}

        <style>{`
          .contract-pulse-dot {
            animation: contractPulse 2s infinite;
          }
          @keyframes contractPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}
