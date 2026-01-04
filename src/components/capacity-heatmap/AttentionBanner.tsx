/**
 * Attention Banner - Conflict alerts with quick actions
 * Catalyst V5 compliant
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ChevronRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Conflict } from '@/types/capacity-heatmap';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';
import { formatMonth } from '@/lib/capacity-heatmap/utils';

interface AttentionBannerProps {
  conflicts: Conflict[];
  onResolve: (conflict: Conflict) => void;
  onDismiss: () => void;
  className?: string;
}

export const AttentionBanner = memo(function AttentionBanner({
  conflicts,
  onResolve,
  onDismiss,
  className
}: AttentionBannerProps) {
  if (conflicts.length === 0) return null;
  
  const criticalConflicts = conflicts.filter(c => c.overBy > 20);
  const minorConflicts = conflicts.filter(c => c.overBy <= 20);
  
  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          "relative overflow-hidden rounded-lg border",
          "bg-gradient-to-r",
          className
        )}
        style={{
          borderColor: `${CATALYST_COLORS.danger}40`,
          background: `linear-gradient(90deg, ${CATALYST_COLORS.danger}08 0%, ${CATALYST_COLORS.warning}05 100%)`,
        }}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Animated warning stripe */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: CATALYST_COLORS.danger }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <motion.div
                className="mt-0.5 p-2 rounded-full"
                style={{ backgroundColor: `${CATALYST_COLORS.danger}15` }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <AlertTriangle 
                  className="w-5 h-5" 
                  style={{ color: CATALYST_COLORS.danger }}
                />
              </motion.div>
              
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {conflicts.length} Capacity Conflict{conflicts.length > 1 ? 's' : ''} Detected
                  {criticalConflicts.length > 0 && (
                    <span 
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{ 
                        backgroundColor: CATALYST_COLORS.danger,
                        color: 'white'
                      }}
                    >
                      {criticalConflicts.length} Critical
                    </span>
                  )}
                </h3>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  {conflicts.slice(0, 5).map((conflict, index) => (
                    <motion.button
                      key={conflict.id}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs",
                        "border border-border/50 bg-background/80",
                        "hover:bg-background hover:border-primary/50",
                        "transition-colors cursor-pointer"
                      )}
                      onClick={() => onResolve(conflict)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="font-medium">{conflict.resourceName}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{formatMonth(conflict.month)}</span>
                      <span 
                        className="font-bold"
                        style={{ color: CATALYST_COLORS.danger }}
                      >
                        +{conflict.overBy}%
                      </span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </motion.button>
                  ))}
                  
                  {conflicts.length > 5 && (
                    <span className="inline-flex items-center px-2 py-1 text-xs text-muted-foreground">
                      +{conflicts.length - 5} more
                    </span>
                  )}
                </div>
                
                {/* Quick action */}
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    style={{ 
                      backgroundColor: CATALYST_COLORS.primary,
                    }}
                    onClick={() => conflicts[0] && onResolve(conflicts[0])}
                  >
                    <Zap className="w-3 h-3" />
                    Resolve All with AI
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    AI can suggest optimal redistribution
                  </span>
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
