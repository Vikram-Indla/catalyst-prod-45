/**
 * Product Backlog Page - Executive Table view for Business Requests
 * Wired to existing Business Request data and drawer
 */

import React, { useState, useMemo } from 'react';
import { useBusinessRequests } from '@/hooks/useBusinessRequests';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { ExecutiveTable } from '../components/ExecutiveTable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function ProductBacklogPage() {
  const queryClient = useQueryClient();
  const { data: businessRequests = [], isLoading } = useBusinessRequests();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Transform business requests to match ExecutiveTable format
  const tableData = useMemo(() => {
    return businessRequests.map((br: any) => ({
      id: br.request_key || br.id?.slice(0, 8) || '—',
      _dbId: br.id, // Keep original DB id for updates
      summary: br.title || '—',
      processStep: br.process_step?.toLowerCase().replace(/ /g, '_') || 'new_request',
      score: br.business_score ?? null,
      rank: br.rank ?? null,
      department: br.department?.toLowerCase().replace(/ /g, '_') || null,
      platform: br.delivery_platform?.toLowerCase().replace(/ /g, '_') || null,
      createdAt: br.created_at?.split('T')[0] || null,
      updatedAt: br.updated_at?.split('T')[0] || null,
    }));
  }, [businessRequests]);

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

    // Map field names back to DB column names
    const fieldMap: Record<string, string> = {
      processStep: 'process_step',
      department: 'department',
      platform: 'delivery_platform',
    };

    const dbField = fieldMap[field] || field;
    
    const { error } = await supabase
      .from('business_requests')
      .update({ [dbField]: value })
      .eq('id', dbId);

    if (error) {
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
  };

  const handleDuplicate = async (requestId: string) => {
    const dbId = getDbIdFromDisplayId(requestId);
    if (!dbId) return;

    const originalRequest = businessRequests.find((br: any) => br.id === dbId);
    if (!originalRequest) return;

    // Create duplicate with "(Copy)" appended to title
    const { error } = await supabase
      .from('business_requests')
      .insert({
        title: `${originalRequest.title} (Copy)`,
        description: originalRequest.description,
        process_step: 'new_request',
        department: originalRequest.department,
        delivery_platform: originalRequest.delivery_platform,
        platform: originalRequest.platform,
        complexity: originalRequest.complexity,
        urgency: originalRequest.urgency,
        health: 'green',
      });

    if (error) {
      toast.error('Failed to duplicate request');
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    toast.success('Request duplicated successfully');
  };

  const handleDelete = async (requestId: string) => {
    const dbId = getDbIdFromDisplayId(requestId);
    if (!dbId) return;

    // Soft delete by setting deleted_at
    const { error } = await supabase
      .from('business_requests')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', dbId);

    if (error) {
      toast.error('Failed to delete request');
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
  };

  return (
    <div className="h-full flex flex-col">
      <ExecutiveTable
        data={tableData}
        isLoading={isLoading}
        onRowClick={(row) => handleOpenFullView(row.id)}
        onOpenFullView={handleOpenFullView}
        onFieldUpdate={handleFieldUpdate}
        onCreateNew={() => setCreateModalOpen(true)}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
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
  );
}
