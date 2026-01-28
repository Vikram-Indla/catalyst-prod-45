/**
 * Caty V4 — KPI Tiles Component
 * Clickable tiles showing Critical, Warning, and Total counts
 */

import { cn } from '@/lib/utils';
import { CatySparkline } from './CatySparkline';

interface KPITileData {
  type: 'critical' | 'warning' | 'total';
  value: number;
  label: string;
  trend?: number;
  sparklineData?: number[];
}

interface CatyKPITilesProps {
  critical: number;
  warning: number;
  total: number;
  criticalTrend?: number;
  warningTrend?: number;
  onKpiClick: (type: 'critical' | 'warning' | 'total') => void;
}

export function CatyKPITiles({ 
  critical, 
  warning, 
  total, 
  criticalTrend = 0,
  warningTrend = 0,
  onKpiClick 
}: CatyKPITilesProps) {
  const tiles: KPITileData[] = [
    { 
      type: 'critical', 
      value: critical, 
      label: 'Critical',
      trend: criticalTrend,
      sparklineData: [2, 3, 2, 4, 3, 2, critical] // Mock trend data
    },
    { 
      type: 'warning', 
      value: warning, 
      label: 'Warning',
      trend: warningTrend,
      sparklineData: [4, 5, 3, 4, 6, 5, warning]
    },
    { 
      type: 'total', 
      value: total, 
      label: 'Total',
      sparklineData: [total - 5, total - 3, total - 2, total - 1, total, total + 1, total]
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'total': return '👥';
      default: return '📊';
    }
  };

  const getSparklineColor = (type: string) => {
    switch (type) {
      case 'critical': return 'var(--caty-status-critical)';
      case 'warning': return 'var(--caty-status-warning)';
      case 'total': return 'var(--caty-status-total)';
      default: return 'currentColor';
    }
  };

  return (
    <div className="caty-kpi-grid" role="group" aria-label="Capacity metrics">
      {tiles.map((tile) => (
        <button
          key={tile.type}
          className={cn("caty-kpi-tile", tile.type)}
          onClick={() => onKpiClick(tile.type)}
          role="button"
          tabIndex={0}
          aria-label={`${tile.value} ${tile.label} resources. Click to view details.`}
          onKeyDown={(e) => e.key === 'Enter' && onKpiClick(tile.type)}
        >
          {/* Trend badge */}
          {tile.trend !== undefined && tile.trend !== 0 && (
            <span className={cn("caty-kpi-trend", tile.trend > 0 ? "up" : "down")}>
              {tile.trend > 0 ? '↑' : '↓'} {Math.abs(tile.trend)}
            </span>
          )}
          
          <span className="caty-kpi-icon" aria-hidden="true">{getIcon(tile.type)}</span>
          <span className="caty-kpi-value caty-count-up">{tile.value}</span>
          <span className="caty-kpi-label">{tile.label}</span>
          
          {/* Sparkline */}
          {tile.sparklineData && (
            <CatySparkline 
              data={tile.sparklineData} 
              color={getSparklineColor(tile.type)}
            />
          )}
        </button>
      ))}
    </div>
  );
}
