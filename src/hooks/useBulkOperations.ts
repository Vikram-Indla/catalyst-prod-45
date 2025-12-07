// useBulkOperations - Hook for executing bulk operations on entities
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BulkOperationSummary, BulkOperationResult } from '@/components/bulk-operations/types';

interface UseBulkOperationsOptions {
  queryKey: string[];
  softDelete?: boolean;
}

export function useBulkOperations({
  queryKey,
  softDelete = true,
}: UseBulkOperationsOptions) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Bulk Edit - Update multiple fields for selected items (for business_requests)
  const bulkEdit = useCallback(async (
    ids: string[],
    items: Array<{ id: string; title?: string; request_key?: string }>,
    fieldsToUpdate: Record<string, any>
  ): Promise<BulkOperationSummary> => {
    setIsProcessing(true);
    const results: BulkOperationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      // Process each item individually to capture per-item errors
      for (const item of items) {
        try {
          const { error } = await supabase
            .from('business_requests')
            .update(fieldsToUpdate)
            .eq('id', item.id);

          if (error) {
            results.push({
              id: item.id,
              title: item.title || item.request_key,
              status: 'failed',
              reason: error.message,
            });
            failureCount++;
          } else {
            results.push({
              id: item.id,
              title: item.title || item.request_key,
              status: 'success',
            });
            successCount++;
          }
        } catch (err: any) {
          results.push({
            id: item.id,
            title: item.title || item.request_key,
            status: 'failed',
            reason: err.message || 'Unknown error',
          });
          failureCount++;
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey });

      return {
        total: ids.length,
        successCount,
        failureCount,
        skippedCount: 0,
        results,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [queryKey, queryClient]);

  // Bulk Transition - Change workflow status for selected items
  const bulkTransition = useCallback(async (
    ids: string[],
    items: Array<{ id: string; title?: string; request_key?: string; process_step?: string }>,
    targetStatus: string,
    _comment?: string
  ): Promise<BulkOperationSummary> => {
    setIsProcessing(true);
    const results: BulkOperationResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    try {
      for (const item of items) {
        try {
          // Skip if already in target status
          if (item.process_step === targetStatus) {
            results.push({
              id: item.id,
              title: item.title || item.request_key,
              status: 'skipped',
              reason: 'Already in target status',
            });
            skippedCount++;
            continue;
          }

          const { error } = await supabase
            .from('business_requests')
            .update({ process_step: targetStatus })
            .eq('id', item.id);

          if (error) {
            results.push({
              id: item.id,
              title: item.title || item.request_key,
              status: 'failed',
              reason: error.message,
            });
            failureCount++;
          } else {
            results.push({
              id: item.id,
              title: item.title || item.request_key,
              status: 'success',
            });
            successCount++;
          }
        } catch (err: any) {
          results.push({
            id: item.id,
            title: item.title || item.request_key,
            status: 'failed',
            reason: err.message || 'Unknown error',
          });
          failureCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey });

      return {
        total: ids.length,
        successCount,
        failureCount,
        skippedCount,
        results,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [queryKey, queryClient]);

  // Bulk Delete - Soft or hard delete selected items
  const bulkDelete = useCallback(async (
    ids: string[],
    items: Array<{ id: string; title?: string; request_key?: string }>
  ): Promise<BulkOperationSummary> => {
    setIsProcessing(true);
    const results: BulkOperationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      for (const item of items) {
        try {
          let error;
          
          if (softDelete) {
            // Soft delete - set deleted_at timestamp
            const { error: updateError } = await supabase
              .from('business_requests')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', item.id);
            error = updateError;
          } else {
            // Hard delete
            const { error: deleteError } = await supabase
              .from('business_requests')
              .delete()
              .eq('id', item.id);
            error = deleteError;
          }

          if (error) {
            results.push({
              id: item.id,
              title: item.title || item.request_key,
              status: 'failed',
              reason: error.message,
            });
            failureCount++;
          } else {
            results.push({
              id: item.id,
              title: item.title || item.request_key,
              status: 'success',
            });
            successCount++;
          }
        } catch (err: any) {
          results.push({
            id: item.id,
            title: item.title || item.request_key,
            status: 'failed',
            reason: err.message || 'Unknown error',
          });
          failureCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey });

      return {
        total: ids.length,
        successCount,
        failureCount,
        skippedCount: 0,
        results,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [softDelete, queryKey, queryClient]);

  return {
    bulkEdit,
    bulkTransition,
    bulkDelete,
    isProcessing,
  };
}
