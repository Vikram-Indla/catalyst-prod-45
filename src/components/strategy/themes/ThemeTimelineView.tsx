/**
 * ThemeTimelineView — 12-month horizontal Gantt with threshold progress colors
 */
import type { StrategicTheme } from '@/types/strategic-themes';
import { STATUS_CONFIG, deriveHealthStatus, getProgressColor } from './theme-utils';

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

  const withDates = themes.filter(t => t.start_date && t.target_completion);
  const noDates = themes.filter(t => !t.start_date || !t.target_completion);

  return (
    <div className="rounded-xl border overflow-hidden bg-white dark:bg-[var(--ds-surface, #0A0A0A)] border-slate-200 dark:border-[var(--ds-border, #2E2E2E)]">
      {/* Header */}
      <div className="flex border-b border-slate-200 dark:border-[var(--ds-border, #2E2E2E)]">
        <div className="shrink-0 flex items-center bg-slate-50 dark:bg-[var(--ds-surface-overlay, #1F1F1F)]" style={{ width: 220, height: 50, padding: '8px 12px' }}>
          <span className="text-[10.5px] font-semibold text-slate-400 dark:text-[var(--ds-text-subtlest, #878787)] uppercase tracking-wide">Theme</span>
        </div>
        <div className="flex-1 grid bg-slate-50 dark:bg-[var(--ds-surface-overlay, #1F1F1F)]" style={{ gridTemplateColumns: `repeat(12, 1fr)` }}>
          {MONTHS.map((m, i) => (
            <div key={m} className="flex items-center justify-center text-[10.5px] font-medium text-slate-400 dark:text-[var(--ds-text-subtlest, #878787)] border-l border-slate-100 dark:border-[var(--ds-surface-overlay, #1F1F1F)]" style={{
              height: 50,
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
        const progressColor = getProgressColor(theme.progress_pct);

        return (
          <div
            key={theme.id}
            onClick={() => onSelect(theme)}
            className="flex cursor-pointer transition-colors border-b border-slate-100 dark:border-[var(--ds-surface-overlay, #1F1F1F)] hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay, #1F1F1F)]"
            style={{ height: 48 }}
          >
            {/* Label */}
            <div className="shrink-0 flex items-center gap-2 min-w-0" style={{ width: 220, padding: '8px 12px' }}>
              <div className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: theme.color }} />
              <span className="truncate text-xs font-medium text-slate-900 dark:text-[var(--ds-text, #EDEDED)]" title={theme.title}>{theme.title}</span>
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5" style={{ fontSize: 9, fontWeight: 500, background: sc.bg, color: sc.text }}>
                <span className="rounded-full" style={{ width: 4, height: 4, background: sc.dot }} />
                {sc.label}
              </span>
            </div>

            {/* Timeline area */}
            <div className="flex-1 relative border-l border-slate-200 dark:border-[var(--ds-border, #2E2E2E)]">
              {/* Month gridlines + alternating shading */}
              {MONTHS.map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-l border-dashed border-slate-100 dark:border-[var(--ds-surface-overlay, #1F1F1F)]" style={{
                  left: `${(i / 12) * 100}%`,
                  width: `${100 / 12}%`,
                  background: i % 2 === 0 ? 'rgba(248,250,252,0.5)' : 'transparent',
                }} />
              ))}

              {/* Today marker */}
              {todayPct !== null && (
                <div className="absolute top-0 bottom-0" style={{ left: `${todayPct}%`, width: 2, background: 'var(--ds-text-danger, #DC2626)', zIndex: 2 }}>
                  <div style={{ position: 'absolute', top: -16, left: -14, fontSize: 9, color: 'var(--ds-text-danger, #DC2626)', fontWeight: 600, whiteSpace: 'nowrap' }}>Today</div>
                </div>
              )}

              {/* Bar */}
              {hasBar && (
                <div className="absolute top-2.5 flex items-center" style={{
                  left: `${startPct}%`,
                  width: `${endPct - startPct}%`,
                  height: 28, borderRadius: 6,
                  background: theme.color + '18',
                  overflow: 'hidden',
                }}>
                  <div className="h-full rounded-l-md" style={{
                    width: `${Math.min(theme.progress_pct, 100)}%`,
                    background: progressColor,
                    opacity: 0.75,
                  }} />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-900 dark:text-[var(--ds-text, #EDEDED)]">{theme.progress_pct}%</span>
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
          className="flex cursor-pointer transition-colors border-b border-slate-100 dark:border-[var(--ds-surface-overlay, #1F1F1F)] hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay, #1F1F1F)]"
          style={{ height: 48 }}
        >
          <div className="shrink-0 flex items-center gap-2 min-w-0" style={{ width: 220, padding: '8px 12px' }}>
            <div className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: theme.color }} />
            <span className="truncate text-xs font-medium text-slate-900 dark:text-[var(--ds-text, #EDEDED)]">{theme.title}</span>
          </div>
          <div className="flex-1 flex items-center justify-center border-l border-slate-200 dark:border-[var(--ds-border, #2E2E2E)]">
            <span className="text-[11px] text-slate-400 dark:text-[var(--ds-text-subtlest, #878787)]">No dates set</span>
          </div>
        </div>
      ))}

      {themes.length === 0 && (
        <div className="flex items-center justify-center text-[13px] text-slate-400 dark:text-[var(--ds-text-subtlest, #878787)]" style={{ height: 120 }}>
          No themes to display on timeline.
        </div>
      )}
    </div>
  );
}
