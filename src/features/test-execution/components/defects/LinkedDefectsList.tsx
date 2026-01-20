/**
 * Module 3A-4: Linked Defects List Component
 * Displays all defects linked to a step result
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Loader2 } from 'lucide-react';
import { DefectCard } from './DefectCard';
import type { LinkedDefect } from '../../types/defect-linking';

interface LinkedDefectsListProps {
  defects: LinkedDefect[];
  isLoading: boolean;
  isUnlinking: boolean;
  onUnlink: (defectId: string) => void;
}

export function LinkedDefectsList({
  defects,
  isLoading,
  isUnlinking,
  onUnlink,
}: LinkedDefectsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (defects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Bug className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          No defects linked to this step
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {defects.map((defect) => (
          <motion.div
            key={defect.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <DefectCard
              defect={defect}
              showUnlink
              isUnlinking={isUnlinking}
              onUnlink={() => onUnlink(defect.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
