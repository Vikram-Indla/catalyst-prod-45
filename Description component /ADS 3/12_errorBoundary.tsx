/**
 * DescriptionErrorBoundary
 * 
 * React error boundary for description components.
 * Catches rendering errors, validation errors, and network failures.
 * 
 * Features:
 * - Graceful error UI
 * - Error logging
 * - Fallback to plain text
 * - Recovery option
 */

import React, { ReactNode } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button';
import InlineMessage from '@atlaskit/inline-message';

// ============================================================================
// ERROR BOUNDARY (React Class Component)
// ============================================================================

export interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallback?: ReactNode;
  level?: 'error' | 'warning';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Error boundary for description components
 * 
 * Usage:
 * ```tsx
 * <DescriptionErrorBoundary>
 *   <DescriptionEditor {...props} />
 * </DescriptionErrorBoundary>
 * ```
 */
export class DescriptionErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState((state) => ({
      ...state,
      errorInfo,
    }));

    // Log to console in dev
    if (process.env.NODE_ENV === 'development') {
      console.error('[DescriptionErrorBoundary] Caught error:', error);
      console.error('[DescriptionErrorBoundary] Error info:', errorInfo);
    }

    // Call optional callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const level = this.props.level || 'error';
      const type = level === 'error' ? 'danger' : 'warning';

      return (
        <div
          style={{
            padding: token('space.200'),
            backgroundColor:
              level === 'error'
                ? token('color.background.danger')
                : token('color.background.warning'),
            border: `1px solid ${
              level === 'error'
                ? token('color.border.danger')
                : token('color.border.warning')
            }`,
            borderRadius: token('border.radius.100'),
          }}
        >
          {this.props.fallback ? (
            this.props.fallback
          ) : (
            <>
              <InlineMessage
                type={type}
                title={
                  level === 'error'
                    ? 'Description could not load'
                    : 'Description encountered an issue'
                }
              >
                {this.state.error?.message || 'An unexpected error occurred.'}
              </InlineMessage>

              <div
                style={{
                  marginTop: token('space.100'),
                  display: 'flex',
                  gap: token('space.050'),
                }}
              >
                <Button
                  appearance="primary"
                  size="small"
                  onClick={this.handleReset}
                >
                  Try again
                </Button>

                {process.env.NODE_ENV === 'development' && (
                  <Button
                    appearance="default"
                    size="small"
                    onClick={() => {
                      console.error(this.state.error);
                      console.error(this.state.errorInfo);
                    }}
                  >
                    See details
                  </Button>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details
                  style={{
                    marginTop: token('space.100'),
                    fontSize: '12px',
                    color: token('color.text.subtlest'),
                  }}
                >
                  <summary style={{ cursor: 'pointer' }}>Stack trace</summary>
                  <pre
                    style={{
                      overflow: 'auto',
                      maxHeight: '200px',
                      backgroundColor: token('color.background.neutral'),
                      padding: token('space.050'),
                      borderRadius: token('border.radius.050'),
                      fontSize: '11px',
                    }}
                  >
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// HOOK VARIANT: For functional components
// ============================================================================

/**
 * useDescriptionErrorHandler
 * 
 * Functional alternative for try/catch in event handlers
 * 
 * Usage:
 * ```tsx
 * const { handleError, error, clearError } = useDescriptionErrorHandler();
 * 
 * const handleSave = async () => {
 *   try {
 *     await saveDescription(adf);
 *   } catch (err) {
 *     handleError(err);
 *   }
 * };
 * ```
 */
export function useDescriptionErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((err: any) => {
    const error = err instanceof Error ? err : new Error(String(err));
    setError(error);

    if (process.env.NODE_ENV === 'development') {
      console.error('[useDescriptionErrorHandler]', error);
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    hasError: error !== null,
  };
}

// ============================================================================
// ERROR TYPES & CLASSIFICATION
// ============================================================================

export enum DescriptionErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  STORAGE = 'storage',
  UNKNOWN = 'unknown',
}

/**
 * Classify error type for better UX messaging
 */
export function classifyDescriptionError(error: Error): DescriptionErrorType {
  const message = error.message.toLowerCase();

  if (message.includes('validation') || message.includes('invalid')) {
    return DescriptionErrorType.VALIDATION;
  }
  if (message.includes('network') || message.includes('fetch')) {
    return DescriptionErrorType.NETWORK;
  }
  if (message.includes('permission') || message.includes('unauthorized')) {
    return DescriptionErrorType.PERMISSION;
  }
  if (message.includes('not found') || message.includes('404')) {
    return DescriptionErrorType.NOT_FOUND;
  }
  if (
    message.includes('storage') ||
    message.includes('upload') ||
    message.includes('file')
  ) {
    return DescriptionErrorType.STORAGE;
  }

  return DescriptionErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message based on type
 */
export function getErrorMessage(errorType: DescriptionErrorType): string {
  const messages: Record<DescriptionErrorType, string> = {
    [DescriptionErrorType.VALIDATION]:
      'The description format is invalid. Please check your content.',
    [DescriptionErrorType.NETWORK]:
      'Network error. Please check your connection and try again.',
    [DescriptionErrorType.PERMISSION]:
      'You do not have permission to edit this description.',
    [DescriptionErrorType.NOT_FOUND]:
      'Description not found. It may have been deleted.',
    [DescriptionErrorType.STORAGE]:
      'Storage error. Please try uploading a smaller file.',
    [DescriptionErrorType.UNKNOWN]:
      'An unexpected error occurred. Please try again.',
  };

  return messages[errorType];
}

// ============================================================================
// ERROR FALLBACK COMPONENTS
// ============================================================================

/**
 * Fallback UI for missing description
 */
export const DescriptionNotFoundFallback: React.FC = () => (
  <div
    style={{
      padding: token('space.200'),
      backgroundColor: token('color.background.neutral'),
      borderRadius: token('border.radius.100'),
      textAlign: 'center',
      color: token('color.text.subtlest'),
    }}
  >
    <p style={{ margin: 0, fontSize: '14px' }}>
      📄 No description available
    </p>
    <p style={{ margin: token('space.050') + ' 0 0 0', fontSize: '12px' }}>
      This entity does not have a description yet.
    </p>
  </div>
);

/**
 * Fallback UI for permission denied
 */
export const PermissionDeniedFallback: React.FC = () => (
  <div
    style={{
      padding: token('space.200'),
      backgroundColor: token('color.background.warning'),
      border: `1px solid ${token('color.border.warning')}`,
      borderRadius: token('border.radius.100'),
      color: token('color.text.warning'),
    }}
  >
    <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
      🔒 Permission Denied
    </p>
    <p style={{ margin: token('space.050') + ' 0 0 0', fontSize: '12px' }}>
      You do not have permission to view or edit this description.
    </p>
  </div>
);

/**
 * Fallback UI for loading error
 */
export const LoadingErrorFallback: React.FC<{ retry?: () => void }> = ({
  retry,
}) => (
  <div
    style={{
      padding: token('space.200'),
      backgroundColor: token('color.background.danger'),
      border: `1px solid ${token('color.border.danger')}`,
      borderRadius: token('border.radius.100'),
      color: token('color.text.danger'),
    }}
  >
    <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
      ⚠️ Failed to Load
    </p>
    <p style={{ margin: token('space.050') + ' 0 0 0', fontSize: '12px' }}>
      The description could not be loaded. Please try again.
    </p>
    {retry && (
      <Button
        appearance="danger"
        size="small"
        onClick={retry}
        style={{ marginTop: token('space.100') }}
      >
        Retry
      </Button>
    )}
  </div>
);

// ============================================================================
// ASYNC ERROR HANDLER (for promises)
// ============================================================================

/**
 * useAsyncError
 * 
 * Handle errors from async operations in functional components
 */
export function useAsyncError() {
  const [error, setError] = React.useState<Error | null>(null);

  const throwAsyncError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) throw error;
  }, [error]);

  return throwAsyncError;
}

// ============================================================================
// TESTING HELPERS
// ============================================================================

/**
 * Simulate error in component (for testing error boundary)
 */
export const ErrorTrigger: React.FC<{ error: Error }> = ({ error }) => {
  throw error;
};

/**
 * Test component that throws on demand
 */
export const ConditionalErrorTrigger: React.FC<{
  shouldThrow: boolean;
  error?: Error;
}> = ({ shouldThrow, error = new Error('Test error') }) => {
  if (shouldThrow) {
    throw error;
  }
  return <div>No error</div>;
};
