import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: 'Global',
    items: [
      { keys: ['⌘', 'K'], description: 'Open search' },
      { keys: ['⌘', '⇧', 'C'], description: 'Create test case' },
      { keys: ['⌘', '⇧', 'S'], description: 'Create test set' },
      { keys: ['⌘', '⇧', 'Y'], description: 'Create test cycle' },
      { keys: ['⌘', '/'], description: 'Show shortcuts' },
    ],
  },
  {
    category: 'Navigation',
    items: [
      { keys: ['⌘', '1-6'], description: 'Switch tabs' },
      { keys: ['⌘', '['], description: 'Go back' },
      { keys: ['⌘', ']'], description: 'Go forward' },
    ],
  },
  {
    category: 'List Actions',
    items: [
      { keys: ['J'], description: 'Move down' },
      { keys: ['K'], description: 'Move up' },
      { keys: ['Enter'], description: 'Open selected' },
      { keys: ['Space'], description: 'Select checkbox' },
      { keys: ['⇧', '?'], description: 'Show help' },
    ],
  },
];

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <span className="text-sm">{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, keyIndex) => (
                          <kbd
                            key={keyIndex}
                            className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
