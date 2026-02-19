/**
 * ThemeTimelineView — 12-month horizontal Gantt chart
 */
import type { StrategicTheme } from '@/types/strategic-themes';
import { STATUS_CONFIG, deriveHealthStatus } from './theme-utils';

interface Props {
  themes: StrategicTheme[];
  onSelect: (theme: StrategicTheme) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEAR = 2026;
const YEAR_START = new Date(YEAR, 0, 1).getTime();
const YEAR_END = new Date(YEAR, 11, 31).getTime();

function dateToPercent(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr).getTime();
  if (d < YEAR_START) return 0;
  if (d > YEAR_END) return 100;
  return ((d - YEAR_START) / (YEAR_END - YEAR_START)) * 100;
}

export function ThemeTimelineView({ themes, onSelect }: Props) {
  const today = new Date();
  const todayPct = today.getFullYear() === YEAR ? dateToPercent(today.toISOString()) : null;

  // Only show themes with dates
  const withDates = themes.filter(t => t.start_date && t.target_completion);
  const noDates = themes.filter(t => !t.start_date || !t.target_completion);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
      {/* Header */}
      <div className="flex" style={{ borderBottom: '1px solid #E2E8F0' }}>
        <div className="shrink-0 flex items-center" style={{ width: 220, height: 36, padding: '0 12px', background: '#F8FAFC' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Theme</span>
        </div>
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(12, 1fr)`, background: '#F8FAFC' }}>
          {MONTHS.map((m, i) => (
            <div key={m} className="flex items-center justify-center" style={{
              height: 36, fontSize: 11, fontWeight: 500, color: '#64748B',
              borderLeft: '1px solid #F1F5F9',
              background: i % 2 === 0 ? 'rgba(248,250,252,0.5)' : 'transparent',
            }}>
              {m}
            </div>
          ))}
        </div>
      </div>

      {/* Rows with dates */}
      {withDates.map(theme => {
        const health = deriveHealthStatus(theme);
        const sc = STATUS_CONFIG[health];
        const startPct = dateToPercent(theme.start_date)!;
        const endPct = dateToPercent(theme.target_completion)!;
        const hasBar = endPct > startPct;

        return (
          <div
            key={theme.id}
            onClick={() => onSelect(theme)}
            className="flex cursor-pointer transition-colors"
            style={{ borderBottom: '1px solid #F1F5F9', height: 48 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Label */}
            <div className="shrink-0 flex items-center gap-2 min-w-0" style={{ width: 220, padding: '0 12px' }}>
              <div className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: theme.color }} />
              <span className="truncate" style={{ fontSize: 12, fontWeight: 500, color: '#0F172A' }} title={theme.title}>{theme.title}</span>
              <span className="shrink-0 inline-flex rounded-full px-1.5 py-0.5" style={{ fontSize: 9, fontWeight: 500, background: sc.bg, color: sc.text }}>
                {sc.label}
              </span>
            </div>

            {/* Timeline area */}
            <div className="flex-1 relative" style={{ borderLeft: '1px solid #E2E8F0' }}>
              {/* Month gridlines + alternating shading */}
              {MONTHS.map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0" style={{
                  left: `${(i / 12) * 100}%`,
                  width: `${100 / 12}%`,
                  borderLeft: '1px dashed #F1F5F9',
                  background: i % 2 === 0 ? 'rgba(248,250,252,0.5)' : 'transparent',
                }} />
              ))}

              {/* Today marker */}
              {todayPct !== null && (
                <div className="absolute top-0 bottom-0" style={{ left: `${todayPct}%`, width: 2, background: '#DC2626', zIndex: 2 }}>
                  <div style={{ position: 'absolute', top: -16, left: -14, fontSize: 9, color: '#DC2626', fontWeight: 600, whiteSpace: 'nowrap' }}>Today</div>
                </div>
              )}

              {/* Bar */}
              {hasBar && (
                <div className="absolute top-2.5 flex items-center" style={{
                  left: `${startPct}%`,
                  width: `${endPct - startPct}%`,
                  height: 28, borderRadius: 6,
                  background: theme.color + '22',
                  overflow: 'hidden',
                }}>
                  <div className="h-full rounded-l-md" style={{
                    width: `${Math.min(theme.progress_pct, 100)}%`,
                    background: theme.color,
                    opacity: 0.7,
                  }} />
                  <span className="absolute inset-0 flex items-center justify-center" style={{
                    fontSize: 10, fontWeight: 600, color: '#0F172A',
                  }}>{theme.progress_pct}%</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Rows without dates */}
      {noDates.map(theme => (
        <div
          key={theme.id}
          onClick={() => onSelect(theme)}
          className="flex cursor-pointer transition-colors"
          style={{ borderBottom: '1px solid #F1F5F9', height: 48 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div className="shrink-0 flex items-center gap-2 min-w-0" style={{ width: 220, padding: '0 12px' }}>
            <div className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: theme.color }} />
            <span className="truncate" style={{ fontSize: 12, fontWeight: 500, color: '#0F172A' }}>{theme.title}</span>
          </div>
          <div className="flex-1 flex items-center justify-center" style={{ borderLeft: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>No dates set</span>
          </div>
        </div>
      ))}

      {themes.length === 0 && (
        <div className="flex items-center justify-center" style={{ height: 120, color: '#94A3B8', fontSize: 13 }}>
          No themes to display on timeline.
        </div>
      )}
    </div>
  );
}
