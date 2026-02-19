/**
 * ThemeListView — Enterprise data table for strategic themes
 */
import type { StrategicTheme } from '@/types/strategic-themes';
import {
  STATUS_CONFIG, BSC_CONFIG, deriveHealthStatus,
  formatBudget, getInitials, getAvatarColor, shortId,
} from './theme-utils';

interface Props {
  themes: StrategicTheme[];
  onSelect: (theme: StrategicTheme) => void;
}

export function ThemeListView({ themes, onSelect }: Props) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
      {/* Header */}
      <div
        className="grid items-center gap-0"
        style={{
          gridTemplateColumns: '36px 2.4fr 100px 100px 80px 80px 110px 120px 100px',
          height: 36, background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 12px',
        }}
      >
        <div><input type="checkbox" style={{ width: 14, height: 14, accentColor: '#2563EB' }} /></div>
        {['Theme', 'Status', 'Progress', 'Goals', 'KRs', 'Budget (SAR)', 'Owner', 'BSC'].map(h => (
          <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      {themes.map(theme => {
        const health = deriveHealthStatus(theme);
        const sc = STATUS_CONFIG[health];
        const bsc = theme.bsc_perspective ? BSC_CONFIG[theme.bsc_perspective] : null;

        return (
          <div
            key={theme.id}
            onClick={() => onSelect(theme)}
            className="grid items-center gap-0 cursor-pointer transition-colors"
            style={{
              gridTemplateColumns: '36px 2.4fr 100px 100px 80px 80px 110px 120px 100px',
              height: 44,
              borderBottom: '1px solid #F1F5F9',
              padding: '0 12px',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Checkbox */}
            <div onClick={e => e.stopPropagation()}>
              <input type="checkbox" style={{ width: 14, height: 14, accentColor: '#2563EB' }} />
            </div>

            {/* Theme */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0 rounded-full" style={{ width: 10, height: 10, background: theme.color }} />
              <span className="truncate" style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>{theme.title}</span>
              <span className="shrink-0" style={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace' }}>{shortId(theme.id)}</span>
            </div>

            {/* Status pill */}
            <div>
              <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ fontSize: 11, fontWeight: 500, background: sc.bg, color: sc.text }}>
                {sc.label}
              </span>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: '#E2E8F0' }}>
                <div className="rounded-full h-full transition-all" style={{ width: `${Math.min(theme.progress_pct, 100)}%`, background: sc.dot }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#334155', minWidth: 28, textAlign: 'right' }}>{theme.progress_pct}%</span>
            </div>

            {/* Goals */}
            <div style={{ fontSize: 12, color: '#334155', textAlign: 'center' }}>{theme.goal_count}</div>

            {/* KRs */}
            <div style={{ fontSize: 12, color: '#334155', textAlign: 'center' }}>{theme.kr_count}</div>

            {/* Budget */}
            <div style={{ fontSize: 12, fontWeight: 500, color: '#334155' }}>{formatBudget(theme.planned_budget)}</div>

            {/* Owner */}
            <div className="flex items-center gap-1.5">
              {theme.owner_name ? (
                <>
                  <div className="shrink-0 rounded-full flex items-center justify-center" style={{
                    width: 22, height: 22, background: getAvatarColor(theme.owner_name),
                    fontSize: 9, fontWeight: 700, color: '#FFFFFF',
                  }}>
                    {getInitials(theme.owner_name)}
                  </div>
                  <span className="truncate" style={{ fontSize: 12, color: '#334155' }}>{theme.owner_name?.split(' ')[0]}</span>
                </>
              ) : (
                <span style={{ fontSize: 11, color: '#94A3B8' }}>Unassigned</span>
              )}
            </div>

            {/* BSC */}
            <div>
              {bsc ? (
                <span className="inline-flex rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: bsc.bg, color: bsc.text }}>
                  {bsc.label}
                </span>
              ) : (
                <span style={{ fontSize: 11, color: '#94A3B8' }}>—</span>
              )}
            </div>
          </div>
        );
      })}

      {themes.length === 0 && (
        <div className="flex items-center justify-center" style={{ height: 120, color: '#94A3B8', fontSize: 13 }}>
          No themes match the current filters.
        </div>
      )}
    </div>
  );
}
