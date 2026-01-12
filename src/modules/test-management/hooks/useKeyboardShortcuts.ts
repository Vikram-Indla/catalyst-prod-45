/**
 * useKeyboardShortcuts - Global keyboard shortcuts for Test Management
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  enabled?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts?: ShortcutConfig[];
}

// Default navigation shortcuts
const createDefaultShortcuts = (navigate: ReturnType<typeof useNavigate>): ShortcutConfig[] => [
  {
    key: 'g',
    ctrl: true,
    description: 'Go to My Work',
    action: () => navigate('/test-management/my-work'),
  },
  {
    key: 't',
    ctrl: true,
    shift: true,
    description: 'Go to Test Cases',
    action: () => navigate('/test-management/cases'),
  },
  {
    key: 'c',
    ctrl: true,
    shift: true,
    description: 'Go to Cycles',
    action: () => navigate('/test-management/cycles'),
  },
  {
    key: 'd',
    ctrl: true,
    shift: true,
    description: 'Go to Defects',
    action: () => navigate('/test-management/defects'),
  },
  {
    key: 'r',
    ctrl: true,
    shift: true,
    description: 'Go to Reports',
    action: () => navigate('/test-management/reports'),
  },
  {
    key: '/',
    ctrl: true,
    description: 'Open Global Search',
    action: () => {
      // Focus the global search input
      const searchInput = document.querySelector('[data-global-search]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    },
  },
  {
    key: '?',
    shift: true,
    description: 'Show Keyboard Shortcuts',
    action: () => {
      // Dispatch custom event to show shortcuts modal
      window.dispatchEvent(new CustomEvent('tm:show-shortcuts'));
    },
  },
];

// Execution-specific shortcuts
export const executionShortcuts: Omit<ShortcutConfig, 'action'>[] = [
  { key: 'p', ctrl: true, description: 'Mark step as Passed' },
  { key: 'f', ctrl: true, description: 'Mark step as Failed' },
  { key: 'b', ctrl: true, description: 'Mark step as Blocked' },
  { key: 's', ctrl: true, description: 'Skip current step' },
  { key: 'ArrowDown', ctrl: true, description: 'Go to next step' },
  { key: 'ArrowUp', ctrl: true, description: 'Go to previous step' },
  { key: 'Enter', ctrl: true, description: 'Complete and go to next case' },
  { key: 'Escape', description: 'Exit execution mode' },
];

// Case list shortcuts
export const caseListShortcuts: Omit<ShortcutConfig, 'action'>[] = [
  { key: 'n', ctrl: true, description: 'Create new test case' },
  { key: 'e', ctrl: true, description: 'Edit selected case' },
  { key: 'Delete', description: 'Delete selected case(s)' },
  { key: 'a', ctrl: true, description: 'Select all cases' },
  { key: 'c', ctrl: true, description: 'Copy selected case(s)' },
  { key: 'x', ctrl: true, description: 'Cut selected case(s)' },
  { key: 'v', ctrl: true, description: 'Paste case(s)' },
  { key: 'ArrowUp', description: 'Select previous case' },
  { key: 'ArrowDown', description: 'Select next case' },
  { key: 'Space', description: 'Toggle case selection' },
];

function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutConfig): boolean {
  const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
  const ctrlMatches = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
  const shiftMatches = !!shortcut.shift === event.shiftKey;
  const altMatches = !!shortcut.alt === event.altKey;

  return keyMatches && ctrlMatches && shiftMatches && altMatches;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, shortcuts: customShortcuts = [] } = options;
  const navigate = useNavigate();
  const shortcutsRef = useRef<ShortcutConfig[]>([]);

  // Combine default and custom shortcuts
  useEffect(() => {
    shortcutsRef.current = [
      ...createDefaultShortcuts(navigate),
      ...customShortcuts,
    ];
  }, [navigate, customShortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow escape in inputs
        if (event.key !== 'Escape') return;
      }

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;

        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          return;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
    allShortcuts: [
      ...createDefaultShortcuts(navigate),
      ...customShortcuts,
    ],
  };
}

// Hook for execution-specific shortcuts
export function useExecutionShortcuts(handlers: {
  onPass?: () => void;
  onFail?: () => void;
  onBlock?: () => void;
  onSkip?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: () => void;
  onExit?: () => void;
}) {
  const navigate = useNavigate();
  
  const shortcuts: ShortcutConfig[] = [
    { key: 'p', ctrl: true, description: 'Pass', action: handlers.onPass || (() => {}) },
    { key: 'f', ctrl: true, description: 'Fail', action: handlers.onFail || (() => {}) },
    { key: 'b', ctrl: true, description: 'Block', action: handlers.onBlock || (() => {}) },
    { key: 's', ctrl: true, description: 'Skip', action: handlers.onSkip || (() => {}) },
    { key: 'ArrowDown', ctrl: true, description: 'Next', action: handlers.onNext || (() => {}) },
    { key: 'ArrowUp', ctrl: true, description: 'Previous', action: handlers.onPrevious || (() => {}) },
    { key: 'Enter', ctrl: true, description: 'Complete', action: handlers.onComplete || (() => {}) },
    { key: 'Escape', description: 'Exit', action: handlers.onExit || (() => navigate(-1)) },
  ];

  return useKeyboardShortcuts({ shortcuts });
}

// Hook for case list shortcuts
export function useCaseListShortcuts(handlers: {
  onNew?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onSelectPrevious?: () => void;
  onSelectNext?: () => void;
  onToggleSelection?: () => void;
}) {
  const shortcuts: ShortcutConfig[] = [
    { key: 'n', ctrl: true, description: 'New', action: handlers.onNew || (() => {}) },
    { key: 'e', ctrl: true, description: 'Edit', action: handlers.onEdit || (() => {}) },
    { key: 'Delete', description: 'Delete', action: handlers.onDelete || (() => {}) },
    { key: 'a', ctrl: true, description: 'Select All', action: handlers.onSelectAll || (() => {}) },
    { key: 'c', ctrl: true, description: 'Copy', action: handlers.onCopy || (() => {}) },
    { key: 'x', ctrl: true, description: 'Cut', action: handlers.onCut || (() => {}) },
    { key: 'v', ctrl: true, description: 'Paste', action: handlers.onPaste || (() => {}) },
    { key: 'ArrowUp', description: 'Up', action: handlers.onSelectPrevious || (() => {}) },
    { key: 'ArrowDown', description: 'Down', action: handlers.onSelectNext || (() => {}) },
    { key: ' ', description: 'Toggle', action: handlers.onToggleSelection || (() => {}) },
  ];

  return useKeyboardShortcuts({ shortcuts });
}
