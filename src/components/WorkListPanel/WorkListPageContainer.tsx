/**
 * WorkListPageContainer — Main page container (F1.24)
 *
 * Orchestrates data context, work list panel, and create modal.
 */
import React, { memo, useCallback, useState } from 'react';
import { useWorkListData } from '@/context/WorkListDataContext';
import { WorkListPanelIntegration } from './WorkListPanelIntegration';
import { CreateModal } from './CreateModal';
import { WorkListLoadingState } from './WorkListStates';

export const WorkListPageContainer = memo(function WorkListPageContainer() {
  const { items, isLoading, create, isCreating } = useWorkListData();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateSubmit = useCallback(
    (data: { issueType: string; summary: string; description: string }) => {
      create({
        summary: data.summary,
        issue_type: data.issueType,
        description: data.description,
      });
      setIsCreateModalOpen(false);
    },
    [create]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#FFFFFF',
      }}
    >
      {isLoading ? (
        <WorkListLoadingState />
      ) : (
        <WorkListPanelIntegration items={items} isLoading={false} />
      )}

      <CreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
      />
    </div>
  );
});
