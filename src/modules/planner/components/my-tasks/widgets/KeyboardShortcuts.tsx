// ============================================================
// KEYBOARD SHORTCUTS WIDGET
// Planner V9: Keyboard shortcuts reference panel
// ============================================================

import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutItem {
  label: string;
  keys: string[];
}

interface KeyboardShortcutsProps {
  className?: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { label: 'Quick Add Task', keys: ['Q'] },
  { label: 'Search / Command', keys: ['⌘', 'K'] },
  { label: 'Mark Complete', keys: ['X'] },
  { label: 'Focus Mode', keys: ['F'] },
  { label: 'Navigate Up/Down', keys: ['J', 'K'] },
];

export function KeyboardShortcuts({ className }: KeyboardShortcutsProps) {
  return (
    <div className={cn('rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Keyboard className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Keyboard Shortcuts
        </h3>
      </div>

      {/* Shortcuts List */}
      <div className="space-y-2">
        {SHORTCUTS.map((shortcut) => (
          <div 
            key={shortcut.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-slate-600 dark:text-slate-300">
              {shortcut.label}
            </span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, idx) => (
                <kbd
                  key={idx}
                  className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs font-mono text-slate-600 dark:text-slate-300 min-w-[20px] text-center"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
