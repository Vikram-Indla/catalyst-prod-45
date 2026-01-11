/**
 * WorkItemsPage — Main page for Work Items module
 * Route: /projects/:projectId/work-items
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WorkItemsList } from '@/components/work-items/WorkItemsList';

export default function WorkItemsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const handleItemClick = (itemId: string) => {
    // Navigate to detail view (to be implemented in Phase 2)
    console.log('Opening work item:', itemId);
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full text-text-3">
        No project selected
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-1">
      <WorkItemsList 
        projectId={projectId} 
        onItemClick={handleItemClick}
      />
    </div>
  );
}
