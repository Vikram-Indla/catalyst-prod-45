/**
 * MISSING WIRING BANNER
 * Displays a warning banner when required handlers are undefined
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MissingWiringBannerProps {
  missingHandlers: string[];
  componentName: string;
}

export function MissingWiringBanner({ missingHandlers, componentName }: MissingWiringBannerProps) {
  // Only show in development
  if (process.env.NODE_ENV !== 'development' || missingHandlers.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4 bg-status-error/10 border-status-error/30">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-status-error">Missing Wiring Detected</AlertTitle>
      <AlertDescription className="text-status-error/80">
        <p className="mb-2">
          The following handlers are not properly wired in <code className="bg-status-error/20 px-1 rounded">{componentName}</code>:
        </p>
        <ul className="list-disc list-inside text-sm">
          {missingHandlers.map((handler) => (
            <li key={handler}>{handler}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Hook to check for missing handlers and return banner props
 */
export function useMissingWiringCheck(
  handlers: Record<string, unknown>,
  componentName: string
): { missingHandlers: string[]; hasMissing: boolean } {
  const missingHandlers = Object.entries(handlers)
    .filter(([_, value]) => value === undefined || value === null)
    .map(([key]) => key);

  return {
    missingHandlers,
    hasMissing: missingHandlers.length > 0,
  };
}
