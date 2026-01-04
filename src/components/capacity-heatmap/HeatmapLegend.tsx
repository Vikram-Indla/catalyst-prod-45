/**
 * Heatmap Legend - Color scale with all 6 levels
 * Catalyst V5 compliant
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';
import { getUtilizationColor } from '@/lib/capacity-heatmap/utils';
import { useHeatmapStore } from '@/stores/capacity-heatmap-store';

interface HeatmapLegendProps {
  className?: string;
}

const LEGEND_ITEMS = [
  { label: '0%', sublabel: 'Available', value: 0 },
  { label: '1-40%', sublabel: 'Light', value: 20 },
  { label: '41-70%', sublabel: 'Moderate', value: 55 },
  { label: '71-85%', sublabel: 'Optimal', value: 78 },
  { label: '86-100%', sublabel: 'At Capacity', value: 93 },
  { label: '>100%', sublabel: 'Over-allocated', value: 120 },
];

export const HeatmapLegend = memo(function HeatmapLegend({
  className
}: HeatmapLegendProps) {
  const { viewMode, patternMode } = useHeatmapStore();
  
  return (
    <motion.div
      className={cn(
        "flex items-center gap-6 py-2",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <span className="text-xs font-medium text-muted-foreground">Legend:</span>
      
      <div className="flex items-center gap-4">
        {LEGEND_ITEMS.map((item, index) => {
          const colors = getUtilizationColor(item.value, viewMode);
          
          return (
            <motion.div
              key={item.label}
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.05 * index }}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-sm border border-border/50",
                  colors.pulse && "animate-pulse",
                  patternMode && "pattern-overlay"
                )}
                style={{ 
                  backgroundColor: colors.bg,
                }}
              >
                {patternMode && (
                  <svg className="w-full h-full opacity-30">
                    <pattern
                      id={`pattern-${index}`}
                      patternUnits="userSpaceOnUse"
                      width="4"
                      height="4"
                    >
                      {index === 0 && (
                        <circle cx="2" cy="2" r="0.5" fill="currentColor" />
                      )}
                      {index === 1 && (
                        <line x1="0" y1="4" x2="4" y2="0" stroke="currentColor" strokeWidth="0.5" />
                      )}
                      {index === 2 && (
                        <>
                          <line x1="0" y1="4" x2="4" y2="0" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="0" y1="2" x2="2" y2="0" stroke="currentColor" strokeWidth="0.5" />
                        </>
                      )}
                      {index === 3 && (
                        <>
                          <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="0" y1="0" x2="4" y2="0" stroke="currentColor" strokeWidth="0.5" />
                        </>
                      )}
                      {index === 4 && (
                        <>
                          <line x1="2" y1="0" x2="2" y2="4" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="0" y1="2" x2="4" y2="2" stroke="currentColor" strokeWidth="0.5" />
                        </>
                      )}
                      {index === 5 && (
                        <>
                          <line x1="0" y1="0" x2="4" y2="4" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="4" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="0.5" />
                        </>
                      )}
                    </pattern>
                    <rect width="100%" height="100%" fill={`url(#pattern-${index})`} />
                  </svg>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground leading-none">
                  {item.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  {item.sublabel}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Conflict indicator */}
      <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-border">
        <motion.div
          className="w-5 h-5 rounded-sm flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: CATALYST_COLORS.danger }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          !
        </motion.div>
        <span className="text-xs text-muted-foreground">Conflict</span>
      </div>
    </motion.div>
  );
});
