/**
 * WorkListPanelIntegration — Full work list panel (F1.20)
 *
 * Orchestrates header, filters, grouped list, and create modal.
 */
import React, { memo, useState, useCallback } from 'react';
import { useItemSelection } from '@/hooks/useItemSelection';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useCreateKeyboardShortcut } from '@/hooks/useCreateKeyboardShortcut';
import { WorkListHeader } from './WorkListHeader';
import { WorkListFilters } from './WorkListFilters';
import { GroupedWorkList } from './GroupedWorkList';
import { CreateModal } from './CreateModal';
import { WorkListLoadingState } from './WorkListStates';

export interface WorkListPanelIntegrationProps {
  items: Array<{
    id: string;
    key: string;
    summary: string;
    issueType: string;
    status: string;
  }>;
  isLoading?: boolean;
}

export const WorkListPanelIntegration = memo(function WorkListPanelIntegration({
  items,
  isLoading = false,
}: WorkListPanelIntegrationProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredItems = items.filter((item) => {
    const search = searchTerm.toLowerCase();
    return (
      item.key.toLowerCase().includes(search) ||
      item.summary.toLowerCase().includes(search)
    );
  });

  const { activeItemId, selectItem } = useItemSelection(
    filteredItems.map(item => ({
      id: item.key,
      dbId: item.id,
      jiraKey: item.key,
    })),
    { urlParam: 'issue' }
  );
  const { isCompact } = useResponsiveLayout(900);

  const openCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  useCreateKeyboardShortcut(openCreateModal);

  const handleCreateSubmit = (data: {
    issueType: string;
    summary: string;
    description: string;
  }) => {
    // TODO: Create issue via API
    setIsCreateModalOpen(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#FFFFFF',
      }}
    >
      <WorkListHeader
        itemCount={filteredItems.length}
        onCreateClick={openCreateModal}
      />

      <WorkListFilters
        searchTerm={searchTerm}
        activeFilterCount={searchTerm ? 1 : 0}
        onChange={setSearchTerm}
        onClearFilters={() => setSearchTerm('')}
      />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <WorkListLoadingState />
        ) : (
          <GroupedWorkList
            items={filteredItems}
            selectedKey={activeItemId}
            onSelectItem={(key) => selectItem(key)}
          />
        )}
      </div>

      <CreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
      />
    </div>
  );
});
