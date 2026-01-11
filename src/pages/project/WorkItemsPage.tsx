/**
 * WorkItemsPage — Main page for viewing generated work items
 * Route: /projects/:projectId/work-items or /generations/:generationId/work-items
 */

import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { WorkItemsList } from '@/components/work-items/WorkItemsList';

export default function WorkItemsPage() {
  const { projectId, generationId } = useParams<{ projectId?: string; generationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Support both route params and query params for generationId
  const effectiveGenerationId = generationId || searchParams.get('generationId');

  const handleItemClick = (itemId: string) => {
    // Navigate to detail view (to be implemented)
    console.log('Opening work item:', itemId);
  };

  if (!effectiveGenerationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-lg font-medium">No generation selected</p>
        <p className="text-sm">Select a generation to view work items</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <WorkItemsList 
        generationId={effectiveGenerationId} 
        onItemClick={handleItemClick}
      />
    </div>
  );
}
