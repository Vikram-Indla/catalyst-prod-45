/**
 * OkrHeatmap — Widget 2: Theme × Quarter heatmap table
 * Row 1, span 6
 */

import { useState } from 'react';
import { Drawer } from '../shared/Drawer';
import { KrListItem } from '../shared/KrListItem';
import type { OkrStatus } from '@/types/strategy';

interface CellData {
  pct: number | null;
  status: OkrStatus;
}

interface ThemeRow {
  id: string;
  name: string;
  color: string;
  quarters: Record<string, CellData>;
  overall: CellData;
}

const MOCK_DATA: ThemeRow[] = [
  {
    id: 'dt', name: 'Digital Trans.', color: '#2563EB',
    quarters: { Q1: { pct: 82, status: 'on_track' }, Q2: { pct: 78, status: 'on_track' }, Q3: { pct: 65, status: 'at_risk' }, Q4: { pct: null, status: 'not_started' } },
    overall: { pct: 75, status: 'on_track' },
  },
  {
    id: 'wd', name: 'Workforce Dev.', color: '#0D9488',
    quarters: { Q1: { pct: 91, status: 'on_track' }, Q2: { pct: 85, status: 'on_track' }, Q3: { pct: 72, status: 'on_track' }, Q4: { pct: null, status: 'not_started' } },
    overall: { pct: 83, status: 'on_track' },
  },
  {
    id: 'sc', name: 'Supply Chain', color: '#D97706',
    quarters: { Q1: { pct: 76, status: 'on_track' }, Q2: { pct: 58, status: 'at_risk' }, Q3: { pct: 41, status: 'off_track' }, Q4: { pct: null, status: 'not_started' } },
    overall: { pct: 58, status: 'off_track' },
  },
  {
    id: 'esg', name: 'Sustainability', color: '#16A34A',
    quarters: { Q1: { pct: 88, status: 'on_track' }, Q2: { pct: 80, status: 'on_track' }, Q3: { pct: 63, status: 'at_risk' }, Q4: { pct: null, status: 'not_started' } },
    overall: { pct: 77, status: 'on_track' },
  },
];

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

function getCellStyle(status: OkrStatus): { bg: string; text: string } {
  switch (status) {
    case 'on_track': return { bg: 'rgba(13,148,136,0.15)', text: '#0D9488' };
    case 'at_risk': return { bg: 'rgba(217,119,6,0.15)', text: '#D97706' };
    case 'off_track': return { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' };
    default: return { bg: 'transparent', text: 'var(--catalyst-text-tertiary, #94A3B8)' };
  }
}

export function OkrHeatmap() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInfo, setDrawerInfo] = useState<{ theme: string; quarter: string; pct: number } | null>(null);

  const openCell = (themeName: string, quarter: string, pct: number | null) => {
    if (pct === null) return;
    setDrawerInfo({ theme: themeName, quarter, pct });
    setDrawerOpen(true);
  };

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
              <th style={thCss}>Overall</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_DATA.map(row => (
              <tr key={row.id}>
                <td style={{ fontSize: 11, fontWeight: 600, color: 'var(--catalyst-text-primary)', padding: '6px 8px' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                    {row.name}
                  </div>
                </td>
                {QUARTERS.map(q => {
                  const cell = row.quarters[q];
                  const style = getCellStyle(cell.status);
                  return (
                    <td
                      key={q}
                      tabIndex={cell.pct !== null ? 0 : undefined}
                      onClick={() => openCell(row.name, q, cell.pct)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && cell.pct !== null) openCell(row.name, q, cell.pct); }}
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
                  fontSize: 13, fontWeight: 700,
                }}>
                  {row.overall.pct}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3" style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>
        <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0D9488' }} /> On Track (≥70%)</span>
        <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D97706' }} /> At Risk (50–69%)</span>
        <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} /> Off Track (&lt;50%)</span>
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
            <KrListItem status="on_track" title="Permit digitization milestone" meta="Target: 12,500 · Current: 10,250" progress={82} />
            <KrListItem status="at_risk" title="System integration phase" meta="Target: 2 systems · Current: 1" progress={50} />
            <KrListItem status="on_track" title="User adoption rate" meta="Target: 80% · Current: 76%" progress={95} />
          </div>
        )}
      </Drawer>
    </>
  );
}
