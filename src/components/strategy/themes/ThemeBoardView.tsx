/**
 * ThemeBoardView — Kanban-style card grid with Linear-style badges
 */
import type { StrategicTheme } from '@/types/strategic-themes';
import {
  STATUS_CONFIG, STATUS_CONFIG_DARK, deriveHealthStatus, formatBudget,
  getInitials, getAvatarColor, getProgressColor, DK,
} from './theme-utils';

interface Props {
  themes: StrategicTheme[];
  onSelect: (theme: StrategicTheme) => void;
  isDark?: boolean;
}

export function ThemeBoardView({ themes, onSelect, isDark = false }: Props) {
  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
      {themes.map((theme, i) => {
        const health = deriveHealthStatus(theme);
        const sc = isDark ? STATUS_CONFIG_DARK[health] : STATUS_CONFIG[health];
        const progressColor = getProgressColor(theme.progress_pct);

        return (
          <div
            key={theme.id}
            onClick={() => onSelect(theme)}
            className="rounded-xl border cursor-pointer overflow-hidden"
            style={{
              background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--bg-app)',
              borderColor: isDark ? 'var(--ds-border, var(--ds-border, #2E2E2E))' : 'var(--divider)',
              transition: 'transform 200ms ease, box-shadow 200ms ease',
              animation: `fadeUp 300ms ease ${i * 60}ms both`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = isDark
                ? '0 8px 25px -5px rgba(0,0,0,0.3)'
                : '0 8px 25px -5px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Color accent bar */}
            <div style={{ height: 4, background: theme.color }} />

            <div style={{ padding: 16 }}>
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate" style={{ fontSize: 14, fontWeight: 600, color: isDark ? DK.t1 : 'var(--fg-1)', marginBottom: 2 }}>{theme.title}</h3>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 10, color: isDark ? DK.t3 : 'var(--fg-4)', fontFamily: 'monospace' }}>FY{theme.fiscal_year}</span>
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: sc.bg, color: sc.text }}>
                      <span className="rounded-full" style={{ width: 5, height: 5, background: sc.dot }} />
                      {sc.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {theme.description && (
                <p style={{
                  fontSize: 12, color: isDark ? DK.t2 : 'var(--fg-3)', marginBottom: 12,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', lineHeight: 1.5,
                }}>{theme.description}</p>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Goals', value: theme.goal_count },
                  { label: 'KRs', value: theme.kr_count },
                  { label: 'Budget', value: formatBudget(theme.planned_budget) },
                ].map(m => (
                  <div key={m.label} className="rounded-md text-center" style={{ background: isDark ? 'var(--ds-border, var(--ds-border, #292929))' : 'var(--bg-1)', padding: '6px 0' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: isDark ? DK.t1 : 'var(--fg-1)' }}>{m.value}</p>
                    <p style={{ fontSize: 10, color: isDark ? DK.t3 : 'var(--fg-3)' }}>{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Progress + Owner */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 mr-3">
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: isDark ? 'var(--ds-border-bold, var(--ds-border-bold, #454545))' : 'var(--divider)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(theme.progress_pct, 100)}%`, background: progressColor }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? DK.t2 : 'var(--fg-2)' }}>{theme.progress_pct}%</span>
                </div>
                {theme.owner_name && (
                  <div className="shrink-0 rounded-full flex items-center justify-center" style={{
                    width: 24, height: 24, background: getAvatarColor(theme.owner_name),
                    fontSize: 9, fontWeight: 700, color: 'var(--ds-text-inverse, #FFFFFF)',
                  }} title={theme.owner_name}>
                    {getInitials(theme.owner_name)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {themes.length === 0 && (
        <div className="col-span-full flex items-center justify-center rounded-xl border" style={{ height: 200, borderColor: isDark ? 'var(--ds-border, var(--ds-border, #2E2E2E))' : 'var(--divider)', color: isDark ? DK.t3 : 'var(--fg-4)', fontSize: 13 }}>
          No themes match the current filters.
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
