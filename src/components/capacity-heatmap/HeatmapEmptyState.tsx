/**
 * Empty State for Capacity Heatmap
 * Shows illustration and CTAs when no resources exist
 */

import { motion } from 'framer-motion';
import { Users, Plus, Upload, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeatmapEmptyStateProps {
  onAddResource?: () => void;
  onImportData?: () => void;
}

export function HeatmapEmptyState({ onAddResource, onImportData }: HeatmapEmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Illustration */}
      <motion.div
        className="relative w-48 h-48 mb-8"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        {/* Background circle */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-primary/5" />
        
        {/* Icon grid representing empty heatmap */}
        <div className="absolute inset-4 flex items-center justify-center">
          <div className="grid grid-cols-4 gap-1.5 opacity-30">
            {Array.from({ length: 16 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-6 h-4 rounded-sm bg-muted-foreground/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 + (i % 4) * 0.15 }}
                transition={{ delay: 0.3 + i * 0.03 }}
              />
            ))}
          </div>
        </div>
        
        {/* Users icon overlay */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-10 h-10 text-primary" />
          </div>
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h3
        className="text-xl font-semibold text-foreground mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        No Resources Yet
      </motion.h3>

      {/* Description */}
      <motion.p
        className="text-muted-foreground text-center max-w-md mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Start building your capacity heatmap by adding team members and their allocations. 
        You can add resources individually or import from a spreadsheet.
      </motion.p>

      {/* CTAs */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button onClick={onAddResource} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Resource
        </Button>
        <Button variant="outline" onClick={onImportData} size="lg">
          <Upload className="w-4 h-4 mr-2" />
          Import Data
        </Button>
      </motion.div>

      {/* Secondary help */}
      <motion.div
        className="mt-8 flex items-center gap-6 text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>12-month rolling forecast</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          <span>Unlimited team members</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
