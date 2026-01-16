/**
 * DefectPrompt - Floating prompt that appears when a step is marked as failed
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DefectPromptProps {
  visible: boolean;
  onLogDefect: () => void;
  onDismiss: () => void;
}

export function DefectPrompt({ visible, onLogDefect, onDismiss }: DefectPromptProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-24 left-1/2 z-50"
        >
          <div className="bg-background border-2 border-red-200 dark:border-red-800 rounded-xl shadow-xl p-4 flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <Bug className="w-4 h-4 text-red-600" />
              </div>
              <span className="text-foreground font-medium">Step failed. Log a defect?</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-muted-foreground"
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={onLogDefect}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Bug className="w-4 h-4 mr-2" />
                Log Defect
              </Button>
            </div>
            
            <button
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
