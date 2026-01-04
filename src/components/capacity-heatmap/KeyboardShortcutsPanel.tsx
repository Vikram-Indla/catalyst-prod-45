/**
 * Keyboard Shortcuts Panel - Help overlay
 * Catalyst V5 compliant
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHeatmapStore } from '@/stores/capacity-heatmap-store';
import { KEYBOARD_SHORTCUTS } from '@/hooks/use-keyboard-shortcuts';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';

interface KeyboardShortcutsPanelProps {
  className?: string;
}

export const KeyboardShortcutsPanel = memo(function KeyboardShortcutsPanel({
  className
}: KeyboardShortcutsPanelProps) {
  const { keyboardShortcutsOpen, toggleKeyboardShortcuts } = useHeatmapStore();
  
  return (
    <AnimatePresence>
      {keyboardShortcutsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleKeyboardShortcuts}
          />
          
          {/* Panel */}
          <motion.div
            className={cn(
              "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
              "w-full max-w-md p-6 rounded-xl",
              "bg-card border border-border shadow-2xl",
              className
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${CATALYST_COLORS.primary}15` }}
                >
                  <Keyboard className="w-5 h-5" style={{ color: CATALYST_COLORS.primary }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                  <p className="text-sm text-muted-foreground">Navigate faster with your keyboard</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleKeyboardShortcuts}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Shortcuts list */}
            <div className="space-y-1">
              {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                <motion.div
                  key={shortcut.key}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <span className="text-sm text-muted-foreground">
                    {shortcut.description}
                  </span>
                  <kbd 
                    className="px-2 py-1 text-xs font-mono rounded border border-border bg-muted"
                    style={{ minWidth: '40px', textAlign: 'center' }}
                  >
                    {shortcut.key}
                  </kbd>
                </motion.div>
              ))}
            </div>
            
            {/* Footer tip */}
            <div 
              className="mt-6 p-3 rounded-lg text-sm"
              style={{ backgroundColor: `${CATALYST_COLORS.teal}10` }}
            >
              <span style={{ color: CATALYST_COLORS.teal }}>💡 Tip:</span>
              <span className="text-muted-foreground ml-2">
                Press <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-muted mx-1">?</kbd> 
                anytime to show this panel
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
