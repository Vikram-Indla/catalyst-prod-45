/**
 * OkrHeatmap — Widget 2: Theme × Quarter heatmap table
 * Row 1, span 6
 * DATA SOURCE: es_dashboard_okr_heatmap view
 */

import { useState, useMemo } from 'react';
import { Drawer } from '../shared/Drawer';
import { KrListItem } from '../shared/KrListItem';
import { useOkrHeatmap } from '@/hooks/strategy/useStrategyData';
import { formatThemeName } from '@/utils/strategy/formatThemeName';
import type { OkrStatus } from '@/types/strategy';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

function getCellStyle(status: OkrStatus): { bg: string; text: string } {
  switch (status) {
    case 'on_track': return { bg: 'rgba(13,148,136,0.18)', text: '#0D9488' };
    case 'at_risk': return { bg: 'rgba(217,119,6,0.18)', text: '#B45309' };
    case 'off_track': return { bg: 'rgba(239,68,68,0.15)', text: '#DC2626' };
    default: return { bg: 'transparent', text: 'var(--catalyst-text-secondary, #334155)' };
  }
}

function pctToStatus(pct: number | null): OkrStatus {
  if (pct === null || pct === undefined) return 'not_started';
  if (pct >= 70) return 'on_track';
  if (pct >= 40) return 'at_risk';
  return 'off_track';
}

interface HeatmapRow {
  themeId: string;
  themeName: string;
  themeColor: string;
  quarters: Record<string, { pct: number | null; status: OkrStatus }>;
  overall: { pct: number | null; status: OkrStatus };
}

export function OkrHeatmap() {
  const { data: rawData, isLoading } = useOkrHeatmap();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInfo, setDrawerInfo] = useState<{ theme: string; quarter: string; pct: number } | null>(null);

  // Build heatmap rows by grouping raw data by theme
  const rows: HeatmapRow[] = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    // Group by theme
    const themeMap = new Map<string, typeof rawData>();
    for (const row of rawData) {
      const tid = row.theme_id as string;
      if (!themeMap.has(tid)) themeMap.set(tid, []);
      themeMap.get(tid)!.push(row);
    }

    return Array.from(themeMap.entries()).map(([themeId, items]) => {
      const first = items[0];
      // Calculate quarterly averages
      const qGroups: Record<string, number[]> = { Q1: [], Q2: [], Q3: [], Q4: [] };
      for (const item of items) {
        const q = item.quarter as number;
        const pct = Number(item.progress_pct) || 0;
        if (q >= 1 && q <= 4) qGroups[`Q${q}`].push(pct);
      }

      const quarters: Record<string, { pct: number | null; status: OkrStatus }> = {};
      for (const qKey of QUARTERS) {
        const vals = qGroups[qKey];
        if (vals.length === 0) {
          quarters[qKey] = { pct: null, status: 'not_started' };
        } else {
          const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
          quarters[qKey] = { pct: avg, status: pctToStatus(avg) };
        }
      }

      const allVals = Object.values(quarters).filter(q => q.pct !== null).map(q => q.pct!);
      const overallPct = allVals.length > 0 ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length) : null;

      return {
        themeId,
        themeName: (first.theme_title as string) || 'Unknown',
        themeColor: (first.theme_color as string) || '#2563EB',
        quarters,
        overall: { pct: overallPct, status: pctToStatus(overallPct) },
      };
    });
  }, [rawData]);

  const openCell = (themeName: string, quarter: string, pct: number | null) => {
    if (pct === null) return;
    setDrawerInfo({ theme: themeName, quarter, pct });
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: 36, background: 'var(--catalyst-bg-hover)', borderRadius: 6 }} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--catalyst-text-tertiary)' }}>
        <span style={{ fontSize: 12 }}>No OKR data available</span>
      </div>
    );
  }

  const thCss: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: 'var(--catalyst-text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 8px', textAlign: 'center',
  };

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 4 }}>
          <thead>
            <tr>
              <th style={{ ...thCss, textAlign: 'left', width: 120 }} />
              {QUARTERS.map(q => <th key={q} style={thCss}>{q}</th>)}
              <th style={{ ...thCss, borderLeft: '2px solid var(--catalyst-border-strong, #CBD5E1)' }}>Overall</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.themeId}>
                <td style={{ fontSize: 11, fontWeight: 600, color: 'var(--catalyst-text-primary)', padding: '6px 8px' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: row.themeColor, flexShrink: 0 }} />
                    {formatThemeName(row.themeName)}
                  </div>
                </td>
                {QUARTERS.map(q => {
                  const cell = row.quarters[q];
                  const style = getCellStyle(cell.status);
                  return (
                    <td
                      key={q}
                      tabIndex={cell.pct !== null ? 0 : undefined}
                      onClick={() => openCell(row.themeName, q, cell.pct)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && cell.pct !== null) openCell(row.themeName, q, cell.pct); }}
                      style={{
                        textAlign: 'center', padding: '8px 6px', borderRadius: 6,
                        background: style.bg, color: style.text,
                        fontSize: 13, fontWeight: 700,
                        cursor: cell.pct !== null ? 'pointer' : 'default',
                        transition: 'transform 120ms, background 120ms',
                      }}
                      onMouseEnter={(e) => { if (cell.pct !== null) e.currentTarget.style.transform = 'scale(1.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      {cell.pct !== null ? cell.pct : '—'}
                    </td>
                  );
                })}
                <td style={{
                  textAlign: 'center', padding: '8px 6px', borderRadius: 6,
                  background: getCellStyle(row.overall.status).bg,
                  color: getCellStyle(row.overall.status).text,
                  fontSize: 13, fontWeight: 600,
                  borderLeft: '2px solid var(--catalyst-border-strong, #CBD5E1)',
                }}>
                  {row.overall.pct ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3" style={{ fontSize: 11, color: 'var(--catalyst-text-secondary)' }}>
        <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0D9488' }} /> On Track (≥70%)</span>
        <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#B45309' }} /> At Risk (40–69%)</span>
        <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626' }} /> Off Track (&lt;40%)</span>
      </div>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={drawerInfo ? `${drawerInfo.theme} — ${drawerInfo.quarter}` : ''}>
        {drawerInfo && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--catalyst-text-primary)', marginBottom: 8 }}>
              {drawerInfo.quarter} Performance: {drawerInfo.pct}%
            </div>
            <p style={{ fontSize: 13, color: 'var(--catalyst-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              Progress tracked across key results for this theme during {drawerInfo.quarter}. Below are the individual contributing KRs.
            </p>
            {/* Show KRs from the heatmap data for this theme+quarter */}
            {rawData?.filter(r =>
              (r.theme_title as string) === drawerInfo.theme &&
              (r.quarter as number) === parseInt(drawerInfo.quarter.replace('Q', ''))
            ).map((kr, i) => (
              <KrListItem
                key={i}
                status={pctToStatus(Number(kr.progress_pct))}
                title={(kr.kr_title as string) || 'Key Result'}
                meta={`Progress: ${kr.progress_pct ?? 0}%`}
                progress={Number(kr.progress_pct) || 0}
              />
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}
