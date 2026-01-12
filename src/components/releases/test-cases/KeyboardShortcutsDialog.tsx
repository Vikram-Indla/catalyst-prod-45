/**
 * Keyboard Shortcuts Help Dialog
 * Displays all available keyboard shortcuts for the Test Cases module
 */

import { motion } from 'framer-motion';
import { Keyboard, Command, ArrowUp, ArrowDown, Search, Plus, Trash2, Copy, Edit, Eye, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutCategory {
  title: string;
  icon: React.ElementType;
  shortcuts: {
    keys: string[];
    description: string;
    icon?: React.ElementType;
  }[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Navigation',
    icon: ArrowUp,
    shortcuts: [
      { keys: ['↑', '↓'], description: 'Navigate through test cases' },
      { keys: ['j'], description: 'Move to next test case' },
      { keys: ['k'], description: 'Move to previous test case' },
      { keys: ['Enter'], description: 'Open selected test case' },
      { keys: ['Esc'], description: 'Clear selection / Close dialog' },
      { keys: ['g', 'h'], description: 'Go to home / list view' },
    ],
  },
  {
    title: 'Search & Filter',
    icon: Search,
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Focus search input', icon: Search },
      { keys: ['⌘', 'F'], description: 'Open advanced filters' },
      { keys: ['⌘', '/'], description: 'Clear all filters' },
    ],
  },
  {
    title: 'Actions',
    icon: Plus,
    shortcuts: [
      { keys: ['⌘', 'N'], description: 'Create new test case', icon: Plus },
      { keys: ['⌘', 'D'], description: 'Duplicate selected test case(s)', icon: Copy },
      { keys: ['⌘', 'E'], description: 'Edit selected test case', icon: Edit },
      { keys: ['⌘', 'Enter'], description: 'Execute selected test case(s)' },
      { keys: ['Delete'], description: 'Delete selected test case(s)', icon: Trash2 },
    ],
  },
  {
    title: 'Selection',
    icon: Command,
    shortcuts: [
      { keys: ['⌘', 'A'], description: 'Select all visible test cases' },
      { keys: ['Space'], description: 'Toggle selection on focused item' },
      { keys: ['Shift', 'Click'], description: 'Range select' },
      { keys: ['⌘', 'Click'], description: 'Multi-select / deselect' },
    ],
  },
  {
    title: 'Views & Panels',
    icon: Eye,
    shortcuts: [
      { keys: ['⌘', '1'], description: 'Switch to List view' },
      { keys: ['⌘', '2'], description: 'Switch to Grid view' },
      { keys: ['⌘', '3'], description: 'Switch to Kanban view' },
      { keys: ['⌘', 'I'], description: 'Toggle info panel' },
      { keys: ['?'], description: 'Show keyboard shortcuts (this dialog)' },
    ],
  },
];

const Key = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <kbd
    className={cn(
      "inline-flex items-center justify-center min-w-[24px] h-6 px-1.5",
      "text-xs font-medium font-mono",
      "bg-muted border border-border rounded shadow-sm",
      "text-foreground",
      className
    )}
  >
    {children}
  </kbd>
);

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              <Keyboard className="w-5 h-5" />
            </div>
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto -mx-6 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SHORTCUT_CATEGORIES.map((category, catIndex) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIndex * 0.05 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <category.icon className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">{category.title}</h3>
                </div>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {shortcut.icon && <shortcut.icon className="w-3.5 h-3.5" />}
                        <span>{shortcut.description}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center">
                            <Key>{key}</Key>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="mx-0.5 text-muted-foreground text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs">Pro Tip</Badge>
            <span>Press <Key>?</Key> anytime to show this dialog</span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Press <Key>Esc</Key> to close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
