/**
 * Empty state component for when no demands are available
 */

import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoadmapEmptyStateProps {
  onCreateClick: () => void;
  message?: string;
}

export function RoadmapEmptyState({ 
  onCreateClick, 
  message = 'No demands found' 
}: RoadmapEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[400px] bg-card border border-border rounded-lg">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <Calendar className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {message}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
        Create your first demand to start building your product roadmap.
        Demands can be scheduled on the timeline and tracked across quarters.
      </p>
      <Button 
        onClick={onCreateClick}
        className="gap-2"
      >
        <Plus className="w-4 h-4" />
        Create Demand
      </Button>
    </div>
  );
}
