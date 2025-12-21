/**
 * Product Backlog Page - Uses CatalystEnterpriseTable for Business Requests
 * Uses PageChrome for consistent header
 * Shares state with Kanban view via useIndustryViewStore
 */

import React, { useState, useMemo } from 'react';
import { useBusinessRequests } from '@/hooks/useBusinessRequests';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { ProductBacklogEnterpriseTable } from '../components/ProductBacklogEnterpriseTable';
import { DemandBulkActionsBar } from '@/components/demand/DemandBulkActionsBar';
import { DemandBulkStatusModal } from '@/components/demand/DemandBulkStatusModal';
import { DemandBulkDeleteModal } from '@/components/demand/DemandBulkDeleteModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PageChrome } from '@/components/layout/PageChrome';
import { useIndustryViewStore } from '@/stores/useIndustryViewStore';

export default function ProductBacklogPage() {
  const queryClient = useQueryClient();
  
  // Shared state from store
  const { 
    searchQuery, 
    setSearchQuery, 
    scoringFilter, 
    setScoringFilter
  } = useIndustryViewStore();
  
  // Use the shared query with search
  const { data: businessRequests = [], isLoading } = useBusinessRequests(searchQuery);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  // Bulk action modals
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

  // Transform business requests to match table format
  const tableData = useMemo(() => {
    let data = businessRequests.map((br: any) => ({
      id: br.request_key || br.id?.slice(0, 8) || '—',
      _dbId: br.id,
      summary: br.title || '—',
      processStep: br.process_step?.toLowerCase().replace(/ /g, '_') || 'new_request',
      score: br.business_score ?? null,
      autoPriority: br.priority_tier || 'unscored',
      rank: br.rank ?? null,
      reporter: br.requestor_name || null,
      assignee: br.assignee_name || br.assignee || null,
      assigneeId: br.assignee || null,
      department: br.department || null,
      businessOwner: br.business_owner || null,
      businessAsk: br.start_date?.split('T')[0] || null,
      kickoff: br.impl_start_date?.split('T')[0] || null,
      targetComplete: br.impl_target_end_date?.split('T')[0] || null,
      deliveryTrack: br.delivery_track || null,
      platform: br.delivery_platform || null,
      quarter: br.planned_quarter?.[0] || null,
      createdAt: br.created_at?.split('T')[0] || null,
      updatedAt: br.updated_at?.split('T')[0] || null,
    }));
    
    // Apply scoring filter
    if (scoringFilter === 'scored') {
      data = data.filter(row => row.score !== null);
    } else if (scoringFilter === 'unscored') {
      data = data.filter(row => row.score === null);
    }
    
    return data;
  }, [businessRequests, scoringFilter]);

  const getDbIdFromDisplayId = (displayId: string) => {
    const originalRequest = businessRequests.find((br: any) => 
      (br.request_key || br.id?.slice(0, 8)) === displayId
    );
    return originalRequest?.id || null;
  };

  const handleOpenFullView = (requestId: string) => {
    const dbId = getDbIdFromDisplayId(requestId);
    if (dbId) {
      setSelectedRequestId(dbId);
    }
  };

  const handleFieldUpdate = async (requestId: string, field: string, value: any) => {
    const dbId = getDbIdFromDisplayId(requestId);
    if (!dbId) return;

    const fieldMap: Record<string, string> = {
      processStep: 'process_step',
      department: 'department',
      platform: 'delivery_platform',
      summary: 'title',
    };

    const dbField = fieldMap[field] || field;
    
    const { error } = await supabase
      .from('business_requests')
      .update({ [dbField]: value })
      .eq('id', dbId);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
  };

  const handleItemSelect = (itemId: string, selected: boolean) => {
    if (selected) {
      setSelectedRows(prev => [...prev, itemId]);
    } else {
      setSelectedRows(prev => prev.filter(id => id !== itemId));
    }
  };

  // Bulk status update handler
  const handleBulkStatusUpdate = async (newStatus: string) => {
    const dbIds = selectedRows.map(getDbIdFromDisplayId).filter(Boolean);
    if (dbIds.length === 0) return;

    const { error } = await supabase
      .from('business_requests')
      .update({ process_step: newStatus })
      .in('id', dbIds);

    if (error) {
      toast.error('Failed to update status');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    setSelectedRows([]);
    toast.success(`Updated ${dbIds.length} request(s)`);
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    const dbIds = selectedRows.map(getDbIdFromDisplayId).filter(Boolean);
    if (dbIds.length === 0) return;

    const { error } = await supabase
      .from('business_requests')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', dbIds);

    if (error) {
      toast.error('Failed to delete requests');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    setSelectedRows([]);
    toast.success(`Deleted ${dbIds.length} request(s)`);
  };

  return (
    <PageChrome>
      <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="flex-1 p-4 overflow-auto">
          <ProductBacklogEnterpriseTable
            items={tableData}
            isLoading={isLoading}
            selectedItems={selectedRows}
            onItemClick={handleOpenFullView}
            onItemSelect={handleItemSelect}
            onFieldUpdate={handleFieldUpdate}
          />
        </div>

        {/* Bulk Actions Bar */}
        <DemandBulkActionsBar
          selectedCount={selectedRows.length}
          onClear={() => setSelectedRows([])}
          onUpdateStatus={() => setBulkStatusModalOpen(true)}
          onDelete={() => setBulkDeleteModalOpen(true)}
        />

        {/* Bulk Status Update Modal */}
        <DemandBulkStatusModal
          isOpen={bulkStatusModalOpen}
          onClose={() => setBulkStatusModalOpen(false)}
          onConfirm={handleBulkStatusUpdate}
          selectedCount={selectedRows.length}
        />

        {/* Bulk Delete Modal */}
        <DemandBulkDeleteModal
          isOpen={bulkDeleteModalOpen}
          onClose={() => setBulkDeleteModalOpen(false)}
          onConfirm={handleBulkDelete}
          selectedCount={selectedRows.length}
        />

        <BusinessRequestDrawer
          isOpen={!!selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
          requestId={selectedRequestId}
          onRequestChange={() => queryClient.invalidateQueries({ queryKey: ['business-requests'] })}
        />

        <CreateBusinessRequestModal 
          isOpen={createModalOpen} 
          onClose={() => setCreateModalOpen(false)} 
        />
      </div>
    </PageChrome>
  );
}
