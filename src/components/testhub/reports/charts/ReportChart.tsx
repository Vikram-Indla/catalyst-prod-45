/**
 * ReportChart — thin ADS-themed wrappers over recharts for the Reports hub.
 * Feature: CAT-REPORTS-HUB-20260703-001 (S1.4).
 *
 * All colors come from adsChartTheme (ADS tokens only — GLOBAL COLOR LAW).
 * Grid, axis, tooltip and legend styling is applied once here so report
 * bodies never touch raw recharts theming again.
 */
import React from 'react';
import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ADS_SERIES, ADS_CHART } from '@/lib/charts/adsChartTheme';

/** Axis tick styling shared by every wrapper (and inline composed charts). */
export const ADS_AXIS_TICK = { fontSize: 11, fill: ADS_CHART.axisText } as const;

/** Tooltip container styling shared by every wrapper. */
export const ADS_TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
  background: ADS_CHART.tooltipBg,
  border: '1px solid var(--ds-border)',
  color: ADS_CHART.tooltipText,
  borderRadius: 3,
};

export interface ReportChartSeries {
  /** Data key of this series in each datum. */
  dataKey: string;
  /** Legend / tooltip label. Defaults to dataKey. */
  name?: string;
  /** ADS token color. Defaults to ADS_SERIES rotation. */
  color?: string;
  /** Bar stacking group (bar charts only). */
  stackId?: string;
}

type Datum = Record<string, unknown>;

export interface ReportChartProps {
  data: Datum[];
  series: ReportChartSeries[];
  xKey: string;
  height?: number;
  /** Y-axis domain, e.g. [0, 100] for percentage charts. */
  yDomain?: [number, number];
  /** Y-axis unit suffix, e.g. '%'. */
  yUnit?: string;
  /** X-axis tick formatter (e.g. date formatting). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  xTickFormatter?: (value: any) => string;
  /** Tooltip value formatter. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter?: (value: any, name?: any) => [string, string] | string;
  /** Tooltip label formatter (e.g. date formatting). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipLabelFormatter?: (label: any) => string;
  /** Render the legend. Default true. */
  showLegend?: boolean;
}

function seriesColor(s: ReportChartSeries, i: number): string {
  return s.color ?? ADS_SERIES[i % ADS_SERIES.length];
}

function CommonAxes({
  xKey, yDomain, yUnit, xTickFormatter, layout,
}: Pick<ReportChartProps, 'xKey' | 'yDomain' | 'yUnit' | 'xTickFormatter'> & { layout?: 'horizontal' | 'vertical' }) {
  if (layout === 'vertical') {
    return (
      <>
        <XAxis type="number" tick={ADS_AXIS_TICK} />
        <YAxis dataKey={xKey} type="category" tick={ADS_AXIS_TICK} width={80} />
      </>
    );
  }
  return (
    <>
      <XAxis dataKey={xKey} tick={ADS_AXIS_TICK} tickFormatter={xTickFormatter} />
      <YAxis domain={yDomain} unit={yUnit} tick={ADS_AXIS_TICK} />
    </>
  );
}

function CommonDecor({
  tooltipFormatter, tooltipLabelFormatter, showLegend,
}: Pick<ReportChartProps, 'tooltipFormatter' | 'tooltipLabelFormatter' | 'showLegend'>) {
  return (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke={ADS_CHART.grid} />
      <Tooltip
        contentStyle={ADS_TOOLTIP_CONTENT_STYLE}
        formatter={tooltipFormatter}
        labelFormatter={tooltipLabelFormatter}
      />
      {showLegend !== false && <Legend />}
    </>
  );
}

export function ReportLineChart(props: ReportChartProps) {
  const { data, series, height = 260 } = props;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          {CommonDecor(props)}
          {CommonAxes(props)}
          {series.map((s, i) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name ?? s.dataKey}
              stroke={seriesColor(s, i)}
              strokeWidth={2}
              dot={{ r: 4 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportBarChart(
  props: ReportChartProps & {
    layout?: 'horizontal' | 'vertical';
    /** Per-datum bar color (single-series charts only, e.g. status bars). */
    getBarColor?: (datum: Datum, index: number) => string;
  },
) {
  const { data, series, height = 260, layout, getBarColor } = props;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={layout}>
          {CommonDecor(props)}
          {CommonAxes({ ...props, layout })}
          {series.map((s, i) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name ?? s.dataKey}
              stackId={s.stackId}
              fill={seriesColor(s, i)}
              isAnimationActive={false}
            >
              {series.length === 1 && getBarColor
                ? data.map((d, di) => <Cell key={di} fill={getBarColor(d, di)} />)
                : null}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportAreaChart(props: ReportChartProps) {
  const { data, series, height = 260 } = props;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          {CommonDecor(props)}
          {CommonAxes(props)}
          {series.map((s, i) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name ?? s.dataKey}
              stroke={seriesColor(s, i)}
              fill={seriesColor(s, i)}
              fillOpacity={0.2}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportPieChart({
  data,
  dataKey = 'value',
  nameKey = 'name',
  height = 260,
  outerRadius = 100,
  getColor,
  showLegend = false,
}: {
  data: Datum[];
  dataKey?: string;
  nameKey?: string;
  height?: number;
  outerRadius?: number;
  /** Per-slice ADS color. Defaults to ADS_SERIES rotation. */
  getColor?: (datum: Datum, index: number) => string;
  showLegend?: boolean;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={outerRadius}
            dataKey={dataKey}
            nameKey={nameKey}
            label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={getColor ? getColor(d, i) : ADS_SERIES[i % ADS_SERIES.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={ADS_TOOLTIP_CONTENT_STYLE} />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
