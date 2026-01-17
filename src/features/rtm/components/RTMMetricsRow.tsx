import { TrendingUp, TrendingDown, FileText, CheckCircle, AlertTriangle, XCircle, TestTube } from 'lucide-react';
import type { RTMMetrics, TrendDirection } from '../types';

interface Props {
  metrics: RTMMetrics;
}

const TrendBadge = ({ direction, value }: { direction: TrendDirection; value: number }) => (
  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${
    direction === 'up' ? 'bg-emerald-500/10 text-emerald-600' : 
    direction === 'down' ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'
  }`}>
    {direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
    {direction === 'up' ? '+' : '-'}{Math.abs(value)}
  </span>
);

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-0.5 h-6 mt-2">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{
            height: `${(v / max) * 100}%`,
            backgroundColor: i === data.length - 1 ? color : 'hsl(var(--muted))',
            minHeight: 4,
          }}
        />
      ))}
    </div>
  );
};

export const RTMMetricsRow = ({ metrics }: Props) => {
  const cards = [
    { label: 'Total Requirements', value: metrics.totalRequirements, trend: metrics.totalTrend, icon: FileText, color: '#2563eb', sparkline: metrics.sparklineData.total },
    { label: 'Fully Covered', value: metrics.fullyCovered, trend: metrics.coveredTrend, icon: CheckCircle, color: '#0d9488', sparkline: metrics.sparklineData.covered },
    { label: 'Partial Coverage', value: metrics.partiallyCovered, trend: metrics.partialTrend, icon: AlertTriangle, color: '#d97706', sparkline: metrics.sparklineData.partial },
    { label: 'Coverage Gaps', value: metrics.coverageGaps, trend: metrics.gapsTrend, icon: XCircle, color: '#ef4444', sparkline: metrics.sparklineData.gaps },
    { label: 'Linked Tests', value: metrics.linkedTests, trend: metrics.testsTrend, icon: TestTube, color: '#8b5cf6', sparkline: metrics.sparklineData.tests },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card border border-border rounded-xl p-4 hover:border-muted-foreground/30 hover:-translate-y-0.5 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: card.color }} />
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
              <card.icon className="w-5 h-5" style={{ color: card.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">{card.value}</span>
                <TrendBadge direction={card.trend.direction} value={card.trend.value} />
              </div>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{card.label}</p>
              <Sparkline data={card.sparkline} color={card.color} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
