/**
 * Evidence Error Handling Hook
 * TC-296 to TC-315: Comprehensive error handling and recovery
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface EvidenceError {
  id: string;
  code: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: Record<string, unknown>;
  retryable: boolean;
  retryCount: number;
}

interface UseEvidenceErrorHandlingOptions {
  maxRetries?: number;
  retryDelay?: number;
  onCriticalError?: (error: EvidenceError) => void;
}

export function useEvidenceErrorHandling({
  maxRetries = 3,
  retryDelay = 1000,
  onCriticalError
}: UseEvidenceErrorHandlingOptions = {}) {
  const [errors, setErrors] = useState<EvidenceError[]>([]);
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const generateErrorId = () => `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addError = useCallback((
    code: string,
    message: string,
    severity: ErrorSeverity = 'error',
    context?: Record<string, unknown>,
    retryable = true
  ): EvidenceError => {
    const error: EvidenceError = {
      id: generateErrorId(),
      code,
      message,
      severity,
      timestamp: new Date(),
      context,
      retryable,
      retryCount: 0
    };

    setErrors(prev => [...prev, error]);

    // Show toast based on severity
    switch (severity) {
      case 'info':
        toast.info(message);
        break;
      case 'warning':
        toast.warning(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'critical':
        toast.error(message, { duration: 10000 });
        onCriticalError?.(error);
        break;
    }

    return error;
  }, [onCriticalError]);

  const clearError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
    const timeout = retryTimeouts.current.get(errorId);
    if (timeout) {
      clearTimeout(timeout);
      retryTimeouts.current.delete(errorId);
    }
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
    retryTimeouts.current.clear();
  }, []);

  const retryOperation = useCallback(async <T>(
    errorId: string,
    operation: () => Promise<T>
  ): Promise<T | null> => {
    const error = errors.find(e => e.id === errorId);
    if (!error || !error.retryable) return null;

    if (error.retryCount >= maxRetries) {
      addError(
        'MAX_RETRIES_EXCEEDED',
        `Maximum retries exceeded for: ${error.message}`,
        'critical',
        { originalError: error },
        false
      );
      return null;
    }

    // Update retry count
    setErrors(prev => prev.map(e => 
      e.id === errorId ? { ...e, retryCount: e.retryCount + 1 } : e
    ));

    // Exponential backoff
    const delay = retryDelay * Math.pow(2, error.retryCount);
    
    await new Promise(resolve => {
      const timeout = setTimeout(resolve, delay);
      retryTimeouts.current.set(errorId, timeout);
    });

    try {
      const result = await operation();
      clearError(errorId);
      toast.success('Operation succeeded on retry');
      return result;
    } catch (err) {
      return null;
    }
  }, [errors, maxRetries, retryDelay, addError, clearError]);

  const handleUploadError = useCallback((error: unknown, fileName: string) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('network') || message.includes('timeout')) {
      return addError('NETWORK_ERROR', `Network error uploading ${fileName}`, 'error', { fileName }, true);
    }
    if (message.includes('size') || message.includes('too large')) {
      return addError('FILE_TOO_LARGE', `File ${fileName} exceeds size limit`, 'warning', { fileName }, false);
    }
    if (message.includes('type') || message.includes('format')) {
      return addError('INVALID_FORMAT', `Invalid file format: ${fileName}`, 'warning', { fileName }, false);
    }
    
    return addError('UPLOAD_ERROR', `Failed to upload ${fileName}: ${message}`, 'error', { fileName, error: message }, true);
  }, [addError]);

  const handleProcessingError = useCallback((error: unknown, operation: string) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return addError('PROCESSING_ERROR', `${operation} failed: ${message}`, 'error', { operation }, true);
  }, [addError]);

  return {
    errors,
    hasErrors: errors.length > 0,
    hasCriticalErrors: errors.some(e => e.severity === 'critical'),
    addError,
    clearError,
    clearAllErrors,
    retryOperation,
    handleUploadError,
    handleProcessingError
  };
}
