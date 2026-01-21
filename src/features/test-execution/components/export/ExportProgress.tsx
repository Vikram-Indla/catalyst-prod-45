/**
 * Module 3C-2: Export Progress Component
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, Download } from 'lucide-react';
import type { ExportStatus } from '../../types/batch-export';

interface ExportProgressProps {
  status: ExportStatus;
  progress: number;
  format: string;
}

export function ExportProgress({ status, progress, format }: ExportProgressProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-12 h-12 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'failed':
        return <XCircle className="w-12 h-12 text-destructive" />;
      default:
        return <Download className="w-12 h-12 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Preparing export...';
      case 'processing':
        return `Exporting to ${format.toUpperCase()}...`;
      case 'completed':
        return 'Export completed!';
      case 'failed':
        return 'Export failed';
      default:
        return 'Starting export...';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      {/* Status Icon */}
      <div
        className={cn(
          'flex items-center justify-center w-24 h-24 rounded-full',
          status === 'processing' && 'bg-primary/10',
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
        {status === 'processing' && (
          <p className="text-sm text-muted-foreground mt-1">
            Please wait while we generate your file
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {(status === 'processing' || status === 'pending') && (
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
