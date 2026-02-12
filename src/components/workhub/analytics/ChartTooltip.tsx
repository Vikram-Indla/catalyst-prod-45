/**
 * ChartTooltip — Reusable dark tooltip for recharts
 * Phase 11
 */

import { CHART_TOOLTIP_STYLE } from '@/lib/workhub/chartConfig';

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div style={CHART_TOOLTIP_STYLE}>
      {label && (
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{label}</div>
      )}
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: entry.color || entry.fill,
              flexShrink: 0,
            }}
          />
          <span>{entry.name}: <strong>{entry.value}</strong></span>
        </div>
      ))}
    </div>
  );
}
