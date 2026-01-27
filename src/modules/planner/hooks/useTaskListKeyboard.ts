/**
 * Task List Keyboard Navigation Hook - Planner V9
 * j/k navigation, Enter to open, x to select, Escape to clear
 */

import { useEffect, useCallback } from 'react';
import type { TaskListTask } from './useTaskList';

interface UseTaskListKeyboardOptions {
  tasks: TaskListTask[];
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onOpenTask: (task: TaskListTask) => void;
  onEditTask?: (task: TaskListTask) => void;
  enabled?: boolean;
}

export function useTaskListKeyboard({
  tasks,
  focusedIndex,
  setFocusedIndex,
  selectedIds,
  onSelectionChange,
  onOpenTask,
  onEditTask,
  enabled = true,
}: UseTaskListKeyboardOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Skip if typing in input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(Math.min(focusedIndex + 1, tasks.length - 1));
        break;

      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(Math.max(focusedIndex - 1, 0));
        break;

      case 'Enter':
        e.preventDefault();
        if (tasks[focusedIndex]) {
          onOpenTask(tasks[focusedIndex]);
        }
        break;

      case 'e':
        e.preventDefault();
        if (tasks[focusedIndex] && onEditTask) {
          onEditTask(tasks[focusedIndex]);
        }
        break;

      case 'x':
        e.preventDefault();
        if (tasks[focusedIndex]) {
          const task = tasks[focusedIndex];
          const newSelection = new Set(selectedIds);
          if (newSelection.has(task.id)) {
            newSelection.delete(task.id);
          } else {
            newSelection.add(task.id);
          }
          onSelectionChange(newSelection);
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (selectedIds.size > 0) {
          onSelectionChange(new Set());
        }
        break;

      case 'a':
        // Select all with Ctrl/Cmd+A
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (selectedIds.size === tasks.length) {
            onSelectionChange(new Set());
          } else {
            onSelectionChange(new Set(tasks.map(t => t.id)));
          }
        }
        break;
    }
  }, [enabled, focusedIndex, tasks, selectedIds, setFocusedIndex, onSelectionChange, onOpenTask, onEditTask]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < tasks.length) {
      const row = document.querySelector(`[data-task-index="${focusedIndex}"]`);
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex, tasks.length]);
}
