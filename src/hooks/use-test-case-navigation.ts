/**
 * useTestCaseNavigation — Navigate between test cases with keyboard
 * REFACTORED: No longer uses mock data, relies on passed-in test case IDs
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseTestCaseNavigationOptions {
  currentId: string;
  /** Array of test case IDs for navigation (from real data) */
  testCaseIds?: string[];
  enabled?: boolean;
}

export function useTestCaseNavigation({ 
  currentId, 
  testCaseIds = [],
  enabled = true 
}: UseTestCaseNavigationOptions) {
  const navigate = useNavigate();

  const { currentIndex, prevId, nextId } = useMemo(() => {
    const index = testCaseIds.findIndex(id => id === currentId);
    return {
      currentIndex: index,
      prevId: index > 0 ? testCaseIds[index - 1] : null,
      nextId: index < testCaseIds.length - 1 ? testCaseIds[index + 1] : null,
    };
  }, [currentId, testCaseIds]);

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
    totalCount: testCaseIds.length,
    prevId,
    nextId,
    goToPrev,
    goToNext,
    goToList,
    hasPrev: !!prevId,
    hasNext: !!nextId,
  };
}
