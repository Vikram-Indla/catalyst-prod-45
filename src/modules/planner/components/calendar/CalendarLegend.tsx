// ============================================================
// CALENDAR LEGEND
// Workstream color legend and priority indicators
// ============================================================

import { PRIORITY_CONFIG } from '../../types';

interface WorkstreamLegendItem {
  name: string;
  color: string;
}

interface CalendarLegendProps {
  workstreams?: WorkstreamLegendItem[];
}

export function CalendarLegend({ workstreams = [] }: CalendarLegendProps) {
  const priorities = [
    { key: 'critical', label: 'Critical' },
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' },
  ] as const;

  return (
    <div className="px-4 py-3 border-t border-border bg-surface-1 flex items-center justify-between">
      {/* Workstream Colors */}
      {workstreams.length > 0 && (
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Workstreams:</span>
          <div className="flex items-center gap-3">
            {workstreams.map((ws) => (
              <div key={ws.name} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-sm border-l-[3px]"
                  style={{ 
                    borderLeftColor: ws.color,
                    backgroundColor: `${ws.color}15`
                  }}
                />
                <span className="text-xs text-text-secondary">{ws.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Indicators */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Priority:</span>
        <div className="flex items-center gap-3">
          {priorities.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: PRIORITY_CONFIG[key].color }}
              />
              <span className="text-xs text-text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
