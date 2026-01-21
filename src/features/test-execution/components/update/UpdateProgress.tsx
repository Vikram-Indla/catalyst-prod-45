/**
 * Module 3C-3: Update Progress Component
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import type { BatchUpdateStatus } from '../../types/batch-update';

interface UpdateProgressProps {
  status: BatchUpdateStatus;
  progress: number;
  totalRecords: number;
}

export function UpdateProgress({ status, progress, totalRecords }: UpdateProgressProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'executing':
      case 'validating':
        return <Loader2 className="w-12 h-12 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'failed':
        return <XCircle className="w-12 h-12 text-destructive" />;
      default:
        return <RefreshCw className="w-12 h-12 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Preparing update...';
      case 'validating':
        return 'Validating changes...';
      case 'executing':
        return `Updating ${totalRecords} test cases...`;
      case 'completed':
        return 'Update completed!';
      case 'failed':
        return 'Update failed';
      case 'rolled_back':
        return 'Changes rolled back';
      default:
        return 'Starting update...';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      {/* Status Icon */}
      <div
        className={cn(
          'flex items-center justify-center w-24 h-24 rounded-full',
          status === 'executing' && 'bg-primary/10',
          status === 'validating' && 'bg-primary/10',
          status === 'completed' && 'bg-green-500/10',
          status === 'failed' && 'bg-destructive/10',
          status === 'pending' && 'bg-muted'
        )}
      >
        {getStatusIcon()}
      </div>

      {/* Status Text */}
      <div className="text-center">
        <p className="text-lg font-medium">{getStatusText()}</p>
        {(status === 'executing' || status === 'validating') && (
          <p className="text-sm text-muted-foreground mt-1">
            Please wait while we apply your changes
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {(status === 'executing' || status === 'validating' || status === 'pending') && (
        <div className="w-full max-w-md space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-center text-sm text-muted-foreground">
            {progress}% complete
          </p>
        </div>
      )}
    </div>
  );
}
