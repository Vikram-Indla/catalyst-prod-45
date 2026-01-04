/**
 * Heatmap Summary Dashboard - Capacity Utilization gauge with Risks/Opportunities
 * Catalyst V5 compliant - matches reference design
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, AlertCircle, CheckCircle, TrendingDown, Battery } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';
import type { OrgStats, HeatmapResource } from '@/types/capacity-heatmap';

interface HeatmapSummaryDashboardProps {
  stats: OrgStats;
  resources: HeatmapResource[];
  year: number;
  className?: string;
}

export const HeatmapSummaryDashboard = memo(function HeatmapSummaryDashboard({
  stats,
  resources,
  year,
  className
}: HeatmapSummaryDashboardProps) {
  // Calculate additional metrics
  const overAllocatedCount = resources.filter(r => 
    r.monthlyUtilization.some(u => u.percentage > 100)
  ).length;
  
  const expiringContractsCount = resources.filter(r => 
    r.contractStatus && (r.contractStatus.status === 'critical' || r.contractStatus.status === 'warning')
  ).length;
  
  const conflictsCount = stats.conflictCount;
  
  // Opportunities
  const availableNowCount = resources.filter(r => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentUtil = r.monthlyUtilization.find(u => 
      u.month.getMonth() === currentMonth && u.month.getFullYear() === currentYear
    );
    return currentUtil && currentUtil.percentage < 50 && !currentUtil.isLocked;
  }).length;
  
  const freeingUpCount = resources.filter(r => r.trend === 'down').length;
  
  const underFiftyCount = resources.filter(r => r.averageUtilization < 50).length;
  
  // Utilization gauge
  const utilizationPercent = stats.overallUtilization;
  const gaugeWidth = Math.min(100, utilizationPercent);
  
  return (
    <motion.div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm overflow-hidden",
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Capacity Utilization Gauge */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Capacity Utilization
              </h3>
              <span className="text-xs text-muted-foreground">
                Delivery • {year}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Gauge */}
              <div className="flex-1">
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ 
                      backgroundColor: utilizationPercent > 100 ? CATALYST_COLORS.danger : CATALYST_COLORS.primary,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${gaugeWidth}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
              
              {/* Percentage */}
              <span 
                className="text-3xl font-bold tabular-nums"
                style={{ 
                  color: utilizationPercent > 100 ? CATALYST_COLORS.danger : CATALYST_COLORS.primary 
                }}
              >
                {utilizationPercent}%
              </span>
            </div>
            
            {/* Scale legend */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: `${CATALYST_COLORS.teal}40` }} />
                <div className="w-3 h-3 rounded-sm bg-blue-200" />
                <div className="w-3 h-3 rounded-sm bg-blue-400" />
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CATALYST_COLORS.primary }} />
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CATALYST_COLORS.danger }} />
              </div>
              <span>0% → 100% → Over</span>
              <span className="ml-3 px-1.5 py-0.5 bg-muted rounded text-[9px]">
                ▧ Locked
              </span>
            </div>
          </div>
          
          {/* Risks Panel */}
          <div className="lg:col-span-3 space-y-2">
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Risks
            </h4>
            <div className="space-y-1.5">
              <RiskItem
                icon={<AlertTriangle className="w-4 h-4" />}
                label="Over-allocated"
                count={overAllocatedCount}
                color={CATALYST_COLORS.danger}
              />
              <RiskItem
                icon={<Clock className="w-4 h-4" />}
                label="Expiring Contracts"
                count={expiringContractsCount}
                color={CATALYST_COLORS.warning}
              />
              <RiskItem
                icon={<AlertCircle className="w-4 h-4" />}
                label="Conflicts"
                count={conflictsCount}
                color={CATALYST_COLORS.warning}
              />
            </div>
          </div>
          
          {/* Opportunities Panel */}
          <div className="lg:col-span-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Opportunities
            </h4>
            <div className="space-y-1.5">
              <OpportunityItem
                icon={<CheckCircle className="w-4 h-4" />}
                label="Available Now"
                count={availableNowCount}
                color={CATALYST_COLORS.teal}
              />
              <OpportunityItem
                icon={<TrendingDown className="w-4 h-4" />}
                label="Freeing Up (Q2)"
                count={freeingUpCount}
                color={CATALYST_COLORS.teal}
              />
              <OpportunityItem
                icon={<Battery className="w-4 h-4" />}
                label="Under 50%"
                count={underFiftyCount}
                color={CATALYST_COLORS.primary}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

interface RiskItemProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}

function RiskItem({ icon, label, count, color }: RiskItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span style={{ color }}>{icon}</span>
        <span>{label}</span>
      </div>
      <span 
        className="text-lg font-bold tabular-nums"
        style={{ color: count > 0 ? color : 'var(--muted-foreground)' }}
      >
        {count}
      </span>
    </div>
  );
}

interface OpportunityItemProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}

function OpportunityItem({ icon, label, count, color }: OpportunityItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span style={{ color }}>{icon}</span>
        <span>{label}</span>
      </div>
      <span 
        className="text-lg font-bold tabular-nums"
        style={{ color: count > 0 ? color : 'var(--muted-foreground)' }}
      >
        {count}
      </span>
    </div>
  );
}
