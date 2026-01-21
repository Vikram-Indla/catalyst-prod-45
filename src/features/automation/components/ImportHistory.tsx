/**
 * Module 5A-2: Import History Component
 */

import React, { useEffect, memo } from 'react';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useImportHistory } from '../hooks/useResultImport';
import { format } from 'date-fns';
import type { ImportJobStatus } from '../types/import';

interface ImportHistoryProps {
  connectorId: string;
}

const STATUS_ICONS: Record<ImportJobStatus, React.ReactNode> = {
  completed: <CheckCircle className="w-4 h-4 text-primary" />,
  failed: <XCircle className="w-4 h-4 text-destructive" />,
  processing: <Clock className="w-4 h-4 text-warning animate-spin" />,
  pending: <Clock className="w-4 h-4 text-muted-foreground" />
};

const STATUS_VARIANTS: Record<ImportJobStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  failed: 'destructive',
  processing: 'secondary',
  pending: 'outline'
};

export const ImportHistory = memo(function ImportHistory({
  connectorId
}: ImportHistoryProps) {
  const { imports, isLoading, fetchHistory } = useImportHistory(connectorId);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No import history</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2">
        {imports.map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
          >
            {STATUS_ICONS[job.status]}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  {job.source_file_name || 'Manual Import'}
                </span>
                <Badge variant={STATUS_VARIANTS[job.status]} className="text-xs">
                  {job.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(job.created_at), 'MMM d, yyyy h:mm a')}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-medium">
                {job.imported_count} / {job.total_count}
              </div>
              <div className="text-xs text-muted-foreground">
                {job.mapped_count} mapped
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
});
