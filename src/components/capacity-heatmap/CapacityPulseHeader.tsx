/**
 * Capacity Pulse Header - Animated breathing header with health status
 * Catalyst V5 compliant
 */

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrgStats } from '@/types/capacity-heatmap';
import { getHealthColor, getHealthGradient } from '@/lib/capacity-heatmap/utils';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';

interface CapacityPulseHeaderProps {
  stats: OrgStats;
  className?: string;
}

export const CapacityPulseHeader = memo(function CapacityPulseHeader({
  stats,
  className
}: CapacityPulseHeaderProps) {
  const healthColor = getHealthColor(stats.healthStatus);
  const healthGradient = getHealthGradient(stats.healthStatus);
  
  const statusLabel = useMemo(() => {
    const labels = {
      critical: 'Critical Attention Needed',
      stressed: 'Capacity Stressed',
      healthy: 'Healthy Utilization',
      underutilized: 'Capacity Available',
    };
    return labels[stats.healthStatus];
  }, [stats.healthStatus]);
  
  const TrendIcon = stats.trend === 'up' ? TrendingUp : stats.trend === 'down' ? TrendingDown : Minus;
  
  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-xl p-6",
        "border border-border/50",
        "bg-gradient-to-br from-background to-muted/30",
        className
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background pulse */}
      <motion.div
        className="absolute inset-0 opacity-10"
        style={{ background: healthGradient }}
        animate={{
          opacity: [0.05, 0.15, 0.05],
        }}
        transition={{
          duration: 2 / stats.pulseRate,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <div className="relative flex items-center justify-between">
        {/* Left: Pulse indicator and title */}
        <div className="flex items-center gap-4">
          <motion.div
            className="relative"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2 / stats.pulseRate,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${healthColor}15` }}
            >
              <Activity 
                className="w-8 h-8" 
                style={{ color: healthColor }}
              />
            </div>
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: healthColor }}
              animate={{
                scale: [1, 1.5],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 1.5 / stats.pulseRate,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          </motion.div>
          
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Capacity Pulse
              {stats.conflictCount > 0 && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: `${CATALYST_COLORS.danger}15`,
                    color: CATALYST_COLORS.danger 
                  }}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {stats.conflictCount} conflicts
                </span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ 
                  backgroundColor: `${healthColor}15`,
                  color: healthColor 
                }}
              >
                {statusLabel}
              </span>
            </p>
          </div>
        </div>
        
        {/* Right: Key metrics */}
        <div className="flex items-center gap-8">
          {/* Overall Utilization */}
          <div className="text-center">
            <div 
              className="text-3xl font-bold"
              style={{ color: healthColor }}
            >
              {stats.overallUtilization}%
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
              <TrendIcon 
                className="w-3 h-3" 
                style={{ 
                  color: stats.trend === 'stable' 
                    ? CATALYST_COLORS.primary 
                    : stats.trend === 'up' 
                      ? CATALYST_COLORS.warning 
                      : CATALYST_COLORS.teal 
                }}
              />
              {stats.trendPercentage}% vs last period
            </div>
          </div>
          
          {/* Total Resources */}
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground flex items-center justify-center gap-1">
              <Users className="w-6 h-6 text-muted-foreground" />
              {stats.totalResources}
            </div>
            <div className="text-xs text-muted-foreground">
              Total Resources
            </div>
          </div>
          
          {/* Available Capacity */}
          <div className="text-center">
            <div 
              className="text-3xl font-bold"
              style={{ color: CATALYST_COLORS.teal }}
            >
              {Math.round(stats.availableCapacity / stats.totalResources)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Avg Available
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
