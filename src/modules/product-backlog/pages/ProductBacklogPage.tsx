/**
 * Product Backlog Page - Executive Table view for Business Requests
 * Uses unified IndustryHeaderToolbarV2 component
 */

import React, { useState, useMemo } from 'react';
import { useBusinessRequests } from '@/hooks/useBusinessRequests';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { ExecutiveTable } from '../components/ExecutiveTable';
import { IndustryHeaderToolbarV2 } from '@/shared/components/IndustryHeaderToolbarV2';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function ProductBacklogPage() {
  const queryClient = useQueryClient();
  const { data: businessRequests = [], isLoading } = useBusinessRequests();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [scoringFilter, setScoringFilter] = useState<'all' | 'scored' | 'unscored'>('all');
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);

  // Transform business requests to match ExecutiveTable format
  const tableData = useMemo(() => {
    let data = businessRequests.map((br: any) => ({
      id: br.request_key || br.id?.slice(0, 8) || '—',
      _dbId: br.id,
      summary: br.title || '—',
      processStep: br.process_step?.toLowerCase().replace(/ /g, '_') || 'new_request',
      score: br.business_score ?? null,
      rank: br.rank ?? null,
      department: br.department?.toLowerCase().replace(/ /g, '_') || null,
      platform: br.delivery_platform?.toLowerCase().replace(/ /g, '_') || null,
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
    };

    const dbField = fieldMap[field] || field;
    
    const { error } = await supabase
      .from('business_requests')
      .update({ [dbField]: value })
      .eq('id', dbId);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
  };

  const handleDuplicate = async (requestId: string) => {
    const dbId = getDbIdFromDisplayId(requestId);
    if (!dbId) return;

    const originalRequest = businessRequests.find((br: any) => br.id === dbId);
    if (!originalRequest) return;

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

  // Unified header component
  const headerElement = (
    <IndustryHeaderToolbarV2
      title="Business Requests"
      countText={`${tableData.length}`}
      activeView="list"
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      scoringFilter={scoringFilter}
      onScoringFilterChange={setScoringFilter}
      onColumnsConfig={() => setColumnsDialogOpen(true)}
      onExport={() => {
        // Export CSV
        const headers = ['Request ID', 'Summary', 'Status', 'Score', 'Rank', 'Department', 'Platform', 'Created'];
        const csvRows = [headers.join(',')];
        tableData.forEach(row => {
          csvRows.push([
            row.id,
            `"${(row.summary || '').replace(/"/g, '""')}"`,
            row.processStep,
            row.score ?? '',
            row.rank ?? '',
            row.department ?? '',
            row.platform ?? '',
            row.createdAt ?? ''
          ].join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'business-requests.csv';
        a.click();
        URL.revokeObjectURL(url);
      }}
    />
  );

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
        externalHeader={headerElement}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        columnsDialogOpen={columnsDialogOpen}
        onColumnsDialogChange={setColumnsDialogOpen}
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
