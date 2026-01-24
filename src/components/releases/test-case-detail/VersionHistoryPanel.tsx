/**
 * Version History Panel — Slide-out panel for viewing version history
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TestCaseVersionHistory } from './TestCaseVersionHistory';

interface VersionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  testCaseId: string;
  currentVersion?: number;
}

export function VersionHistoryPanel({ isOpen, onClose, testCaseId, currentVersion }: VersionHistoryPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[400px] max-w-[90vw] bg-background border-l shadow-2xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-lg">Version History</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="h-[calc(100%-65px)]">
              <div className="p-4">
                <TestCaseVersionHistory 
                  testCaseId={testCaseId} 
                  currentVersion={currentVersion}
                />
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
