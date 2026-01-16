/**
 * StepView - Main step execution area with centered card
 */

import { motion, AnimatePresence } from 'framer-motion';
import { StepCard } from './StepCard';
import type { StepDisplay, StepResult, Evidence } from '../../stores/executionStore';

interface StepViewProps {
  step: StepDisplay;
  stepResult: StepResult | null;
  onPass: () => void;
  onFail: () => void;
  onBlocked: () => void;
  onAddNote: () => void;
  onAddEvidence: () => void;
  onRemoveEvidence: (id: string) => void;
}

export function StepView({
  step,
  stepResult,
  onPass,
  onFail,
  onBlocked,
  onAddNote,
  onAddEvidence,
  onRemoveEvidence,
}: StepViewProps) {
  return (
    <div className="flex-1 flex items-start justify-center py-8 px-6 overflow-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[700px]"
        >
          <StepCard
            step={step}
            evidence={stepResult?.evidence || []}
            hasNote={!!stepResult?.note}
            onPass={onPass}
            onFail={onFail}
            onBlocked={onBlocked}
            onAddNote={onAddNote}
            onAddEvidence={onAddEvidence}
            onRemoveEvidence={onRemoveEvidence}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
