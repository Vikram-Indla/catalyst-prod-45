/**
 * Enhanced Heatmap Legend - Includes contract status indicators
 * Catalyst V5 compliant - matches reference design
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';

interface EnhancedHeatmapLegendProps {
  className?: string;
}

export const EnhancedHeatmapLegend = memo(function EnhancedHeatmapLegend({
  className
}: EnhancedHeatmapLegendProps) {
  return (
    <motion.div
      className={cn(
        "flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg border border-border",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Contract Status Legend */}
      <div className="flex items-center gap-6">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Contract Status:
        </span>
        
        <div className="flex items-center gap-4">
          <ContractStatusItem 
            color="#be123c" 
            label="<30d" 
            pulse 
          />
          <ContractStatusItem 
            color="#ca8a04" 
            label="30-60d" 
          />
          <ContractStatusItem 
            color="#0d9488" 
            label="60+d" 
          />
          <ContractStatusItem 
            color="hsl(var(--muted-foreground))" 
            label="Permanent" 
            muted
          />
        </div>
      </div>
      
      {/* Hover hint */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-lg">🖱️</span>
        <span>Hover cells for allocation details</span>
      </div>
    </motion.div>
  );
});

interface ContractStatusItemProps {
  color: string;
  label: string;
  pulse?: boolean;
  muted?: boolean;
}

function ContractStatusItem({ color, label, pulse, muted }: ContractStatusItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      <motion.div
        className={cn(
          "w-4 h-4 rounded-full flex-shrink-0",
          muted && "opacity-50"
        )}
        style={{ 
          backgroundColor: `${color}20`,
          boxShadow: `0 0 0 2px ${color}`,
        }}
        animate={pulse ? { 
          scale: [1, 1.1, 1],
        } : {}}
        transition={pulse ? { duration: 1, repeat: Infinity } : {}}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
