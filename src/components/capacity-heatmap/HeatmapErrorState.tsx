/**
 * Error State for Capacity Heatmap
 * Shows error message with retry button
 */

import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeatmapErrorStateProps {
  error: Error | string | null;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function HeatmapErrorState({ error, onRetry, isRetrying }: HeatmapErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error || 'An unexpected error occurred';
  const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                         errorMessage.toLowerCase().includes('fetch') ||
                         errorMessage.toLowerCase().includes('connection');

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Error icon */}
      <motion.div
        className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {isNetworkError ? (
          <WifiOff className="w-8 h-8 text-destructive" />
        ) : (
          <AlertCircle className="w-8 h-8 text-destructive" />
        )}
      </motion.div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {isNetworkError ? 'Connection Problem' : 'Failed to Load Data'}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground text-center max-w-md mb-4">
        {isNetworkError 
          ? "We couldn't connect to the server. Please check your internet connection and try again."
          : "Something went wrong while loading capacity data. Please try again."
        }
      </p>

      {/* Technical error (collapsed by default) */}
      <details className="text-xs text-muted-foreground mb-6 max-w-md">
        <summary className="cursor-pointer hover:text-foreground">Technical details</summary>
        <pre className="mt-2 p-2 bg-muted rounded text-left overflow-auto max-h-24">
          {errorMessage}
        </pre>
      </details>

      {/* Retry button */}
      <Button 
        onClick={onRetry} 
        disabled={isRetrying}
        size="lg"
      >
        {isRetrying ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Retrying...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </>
        )}
      </Button>

      {/* Additional help */}
      <p className="mt-6 text-xs text-muted-foreground">
        If the problem persists, please contact support.
      </p>
    </motion.div>
  );
}
