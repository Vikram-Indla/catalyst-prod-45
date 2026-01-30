// ============================================================================
// HOOK: useTaskBoardModal — Modal state management
// ============================================================================

import { useState, useCallback } from 'react';
import { Task } from '../types';

interface UseTaskBoardModalReturn {
  isOpen: boolean;
  selectedTask: Task | null;
  openModal: (task: Task) => void;
  closeModal: () => void;
}

export const useTaskBoardModal = (): UseTaskBoardModalReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const openModal = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Delay clearing task to allow close animation
    setTimeout(() => setSelectedTask(null), 200);
  }, []);

  return {
    isOpen,
    selectedTask,
    openModal,
    closeModal
  };
};

export default useTaskBoardModal;
