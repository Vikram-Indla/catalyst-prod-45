import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface NavigationGuardState {
  hasUnsavedChanges: boolean;
  message?: string;
}

// Global state for unsaved changes
let globalGuardState: NavigationGuardState = {
  hasUnsavedChanges: false,
  message: 'You have unsaved changes. Are you sure you want to leave?',
};

export function setNavigationGuard(hasChanges: boolean, message?: string) {
  globalGuardState = {
    hasUnsavedChanges: hasChanges,
    message: message || globalGuardState.message,
  };
}

export function useNavigationGuard() {
  const { toast } = useToast();

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      globalGuardState.hasUnsavedChanges &&
      currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const shouldProceed = window.confirm(globalGuardState.message);
      
      if (shouldProceed) {
        // Reset guard and proceed
        setNavigationGuard(false);
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  // Warn on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (globalGuardState.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    setGuard: setNavigationGuard,
    hasUnsavedChanges: globalGuardState.hasUnsavedChanges,
  };
}
