import { useState, useCallback } from 'react';
import { useInitiativesMock } from '@/hooks/useInitiativesMock';
import { InitiativeTable } from '@/components/initiatives/InitiativeTable';
import type { Initiative, InitiativeStatus, Density } from '@/types/initiative';

export default function InitiativeListingPage() {
  const { data, isLoading } = useInitiativesMock();
  const [density] = useState<Density>('standard');

  const handleRowClick = useCallback((initiative: Initiative) => {
    console.log('Row clicked:', initiative.initiative_key);
  }, []);

  const handleStatusChange = useCallback((id: string, status: InitiativeStatus) => {
    console.log('Status change:', id, status);
  }, []);

  const handleAssigneeChange = useCallback((id: string, assigneeId: string) => {
    console.log('Assignee change:', id, assigneeId);
  }, []);

  const handleFavoriteToggle = useCallback((id: string, isFavorited: boolean) => {
    console.log('Favorite toggle:', id, isFavorited);
  }, []);

  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    console.log('Selection:', selectedIds.length, 'rows');
  }, []);

  const handleSortChange = useCallback((sorting: { id: string; desc: boolean }[]) => {
    console.log('Sort:', sorting);
  }, []);

  const initiatives = data?.data ?? [];

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-zinc-900">Product Backlog</h1>
        <p className="text-[13px] text-zinc-500 mt-0.5">
          {initiatives.length} initiatives
        </p>
      </div>
      <InitiativeTable
        data={initiatives}
        loading={isLoading}
        density={density}
        onRowClick={handleRowClick}
        onStatusChange={handleStatusChange}
        onAssigneeChange={handleAssigneeChange}
        onFavoriteToggle={handleFavoriteToggle}
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
      />
    </div>
  );
}
