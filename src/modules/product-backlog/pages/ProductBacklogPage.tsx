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
      priority: br.urgency?.toLowerCase() || 'medium',
      score: br.business_score ?? null,
      rank: br.rank ?? null,
      department: br.department?.toLowerCase().replace(/ /g, '_') || null,
      platform: br.delivery_platform?.toLowerCase().replace(/ /g, '_') || null,
      dueDate: br.end_date || null,
      createdAt: br.created_at?.split('T')[0] || null,
      updatedAt: br.updated_at?.split('T')[0] || null,
    }));
  }, [businessRequests]);

  const handleOpenFullView = (requestId: string) => {
    // Find the actual DB id from the display id
    const request = tableData.find(r => r.id === requestId);
    if (request) {
      const originalRequest = businessRequests.find((br: any) => 
        (br.request_key || br.id?.slice(0, 8)) === requestId
      );
      if (originalRequest) {
        setSelectedRequestId(originalRequest.id);
      }
    }
  };

  const handleFieldUpdate = async (requestId: string, field: string, value: any) => {
    // Find the actual DB id
    const request = tableData.find(r => r.id === requestId);
    if (!request) return;
    
    const originalRequest = businessRequests.find((br: any) => 
      (br.request_key || br.id?.slice(0, 8)) === requestId
    );
    if (!originalRequest) return;

    // Map field names back to DB column names
    const fieldMap: Record<string, string> = {
      processStep: 'process_step',
      priority: 'urgency',
      department: 'department',
      platform: 'delivery_platform',
      dueDate: 'end_date',
    };

    const dbField = fieldMap[field] || field;
    
    const { error } = await supabase
      .from('business_requests')
      .update({ [dbField]: value })
      .eq('id', originalRequest.id);

    if (error) {
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
