/**
 * Bulk Operations Hook
 * TC-356 to TC-400: Bulk select, delete, download operations
 */

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Evidence } from '../types';

export interface BulkOperationsState {
  selectedIds: Set<string>;
  isSelectMode: boolean;
  isBulkDeleting: boolean;
  isBulkDownloading: boolean;
  bulkProgress: { current: number; total: number } | null;
}

export function useBulkOperations(evidence: Evidence[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Selected evidence items
  const selectedEvidence = useMemo(() => 
    evidence.filter(e => selectedIds.has(e.id)),
    [evidence, selectedIds]
  );

  // Toggle select mode
  const toggleSelectMode = useCallback(() => {
    setIsSelectMode(prev => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  // Toggle single selection
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select all
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(evidence.map(e => e.id)));
  }, [evidence]);

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Toggle all (select/deselect)
  const toggleAll = useCallback(() => {
    if (selectedIds.size === evidence.length) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [selectedIds.size, evidence.length, selectAll, deselectAll]);

  // Bulk delete
  const bulkDelete = useCallback(async (): Promise<boolean> => {
    if (selectedIds.size === 0) {
      toast.error('No items selected');
      return false;
    }

    setIsBulkDeleting(true);
    setBulkProgress({ current: 0, total: selectedIds.size });

    try {
      const ids = Array.from(selectedIds);
      let successCount = 0;

      for (let i = 0; i < ids.length; i++) {
        const { error } = await supabase
          .from('test_evidence')
          .update({ 
            is_deleted: true, 
            deleted_at: new Date().toISOString() 
          })
          .eq('id', ids[i]);

        if (!error) {
          successCount++;
        }
        setBulkProgress({ current: i + 1, total: ids.length });
      }

      if (successCount > 0) {
        toast.success(`${successCount} item(s) deleted`);
        setSelectedIds(new Set());
        setIsSelectMode(false);
      }

      return successCount === ids.length;
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Failed to delete some items');
      return false;
    } finally {
      setIsBulkDeleting(false);
      setBulkProgress(null);
    }
  }, [selectedIds]);

  // Bulk download
  const bulkDownload = useCallback(async (): Promise<void> => {
    if (selectedIds.size === 0) {
      toast.error('No items selected');
      return;
    }

    setIsBulkDownloading(true);
    setBulkProgress({ current: 0, total: selectedIds.size });

    try {
      const items = selectedEvidence;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Get signed URL and download
        if (item.url) {
          const link = document.createElement('a');
          link.href = item.url;
          link.download = item.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Small delay between downloads to prevent browser blocking
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        setBulkProgress({ current: i + 1, total: items.length });
      }

      toast.success(`${items.length} file(s) downloaded`);
    } catch (error) {
      console.error('Bulk download failed:', error);
      toast.error('Failed to download some files');
    } finally {
      setIsBulkDownloading(false);
      setBulkProgress(null);
    }
  }, [selectedIds, selectedEvidence]);

  // Get selected count
  const selectedCount = selectedIds.size;
  const totalCount = evidence.length;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount;

  return {
    // State
    selectedIds,
    selectedEvidence,
    isSelectMode,
    isBulkDeleting,
    isBulkDownloading,
    bulkProgress,
    selectedCount,
    totalCount,
    isAllSelected,
    isPartiallySelected,
    // Actions
    toggleSelectMode,
    toggleSelection,
    selectAll,
    deselectAll,
    toggleAll,
    bulkDelete,
    bulkDownload,
  };
}
