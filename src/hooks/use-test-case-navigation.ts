/**
 * useTestCaseNavigation — Navigate between test cases with keyboard
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { testCasesData } from '@/data/testCasesData';

interface UseTestCaseNavigationOptions {
  currentId: string;
  enabled?: boolean;
}

export function useTestCaseNavigation({ currentId, enabled = true }: UseTestCaseNavigationOptions) {
  const navigate = useNavigate();

  const currentIndex = testCasesData.findIndex(tc => tc.id === currentId);
  const prevId = currentIndex > 0 ? testCasesData[currentIndex - 1].id : null;
  const nextId = currentIndex < testCasesData.length - 1 ? testCasesData[currentIndex + 1].id : null;

  const goToPrev = useCallback(() => {
    if (prevId) {
      navigate(`/releases/test-cases/${prevId}`);
    }
  }, [prevId, navigate]);

  const goToNext = useCallback(() => {
    if (nextId) {
      navigate(`/releases/test-cases/${nextId}`);
    }
  }, [nextId, navigate]);

  const goToList = useCallback(() => {
    navigate('/releases/test-cases');
  }, [navigate]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        goToList();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, goToPrev, goToNext, goToList]);

  return {
    currentIndex,
    totalCount: testCasesData.length,
    prevId,
    nextId,
    goToPrev,
    goToNext,
    goToList,
    hasPrev: !!prevId,
    hasNext: !!nextId,
  };
}
