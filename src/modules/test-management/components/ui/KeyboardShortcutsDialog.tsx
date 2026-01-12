/**
 * KeyboardShortcutsDialog - Modal showing available keyboard shortcuts
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Keyboard, Command, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutItem {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'G', ctrl: true, description: 'Go to My Work' },
      { key: 'T', ctrl: true, shift: true, description: 'Go to Test Cases' },
      { key: 'C', ctrl: true, shift: true, description: 'Go to Cycles' },
      { key: 'D', ctrl: true, shift: true, description: 'Go to Defects' },
      { key: 'R', ctrl: true, shift: true, description: 'Go to Reports' },
      { key: '/', ctrl: true, description: 'Open Global Search' },
      { key: '?', shift: true, description: 'Show Keyboard Shortcuts' },
    ],
  },
  {
    title: 'Test Case List',
    shortcuts: [
      { key: 'N', ctrl: true, description: 'Create new test case' },
      { key: 'E', ctrl: true, description: 'Edit selected case' },
      { key: 'Delete', description: 'Delete selected case(s)' },
      { key: 'A', ctrl: true, description: 'Select all cases' },
      { key: 'C', ctrl: true, description: 'Copy selected case(s)' },
      { key: 'X', ctrl: true, description: 'Cut selected case(s)' },
      { key: 'V', ctrl: true, description: 'Paste case(s)' },
      { key: '↑', description: 'Select previous case' },
      { key: '↓', description: 'Select next case' },
      { key: 'Space', description: 'Toggle case selection' },
    ],
  },
  {
    title: 'Test Execution',
    shortcuts: [
      { key: 'P', ctrl: true, description: 'Mark step as Passed' },
      { key: 'F', ctrl: true, description: 'Mark step as Failed' },
      { key: 'B', ctrl: true, description: 'Mark step as Blocked' },
      { key: 'S', ctrl: true, description: 'Skip current step' },
      { key: '↓', ctrl: true, description: 'Go to next step' },
      { key: '↑', ctrl: true, description: 'Go to previous step' },
      { key: 'Enter', ctrl: true, description: 'Complete and go to next case' },
      { key: 'Escape', description: 'Exit execution mode' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { key: 'S', ctrl: true, description: 'Save current item' },
      { key: 'Z', ctrl: true, description: 'Undo last action' },
      { key: 'Z', ctrl: true, shift: true, description: 'Redo last action' },
      { key: 'Escape', description: 'Close dialog/modal' },
    ],
  },
];

function KeyBadge({ keyName, variant = 'default' }: { keyName: string; variant?: 'default' | 'modifier' }) {
  const isArrow = keyName === '↑' || keyName === '↓' || keyName === '←' || keyName === '→';
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-mono text-xs px-1.5 py-0.5 min-w-[24px] justify-center',
        variant === 'modifier' && 'bg-muted'
      )}
    >
      {isArrow ? (
        keyName === '↑' ? <ArrowUp className="h-3 w-3" /> :
        keyName === '↓' ? <ArrowDown className="h-3 w-3" /> :
        keyName
      ) : keyName}
    </Badge>
  );
}

function ShortcutDisplay({ shortcut }: { shortcut: ShortcutItem }) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-foreground">{shortcut.description}</span>
      <div className="flex items-center gap-1">
        {shortcut.ctrl && (
          <>
            <KeyBadge keyName={isMac ? '⌘' : 'Ctrl'} variant="modifier" />
            <span className="text-muted-foreground text-xs">+</span>
          </>
        )}
        {shortcut.shift && (
          <>
            <KeyBadge keyName="⇧" variant="modifier" />
            <span className="text-muted-foreground text-xs">+</span>
          </>
        )}
        {shortcut.alt && (
          <>
            <KeyBadge keyName={isMac ? '⌥' : 'Alt'} variant="modifier" />
            <span className="text-muted-foreground text-xs">+</span>
          </>
        )}
        <KeyBadge keyName={shortcut.key} />
      </div>
    </div>
  );
}

export function KeyboardShortcutsDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShowShortcuts = () => setIsOpen(true);
    window.addEventListener('tm:show-shortcuts', handleShowShortcuts);
    return () => window.removeEventListener('tm:show-shortcuts', handleShowShortcuts);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {shortcutGroups.map((group, groupIndex) => (
              <div key={group.title}>
                {groupIndex > 0 && <Separator className="mb-4" />}
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.shortcuts.map((shortcut, index) => (
                    <ShortcutDisplay 
                      key={`${group.title}-${index}`} 
                      shortcut={shortcut} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-center gap-2 pt-4 border-t text-xs text-muted-foreground">
          <span>Press</span>
          <div className="flex items-center gap-1">
            <KeyBadge keyName="⇧" variant="modifier" />
            <span>+</span>
            <KeyBadge keyName="?" />
          </div>
          <span>anytime to show this dialog</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsDialog;
