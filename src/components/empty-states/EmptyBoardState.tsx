// =====================================================
// EMPTY BOARD STATE
// Shown when board has no features
// =====================================================

import React from 'react';
import { Kanban, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyBoardStateProps {
  projectId: string;
  onCreateFeature?: () => void;
}

export function EmptyBoardState({ projectId, onCreateFeature }: EmptyBoardStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[rgba(37,99,235,0.1)] flex items-center justify-center">
          <Kanban className="w-8 h-8 text-[var(--ds-text-brand,#2563eb)]" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold mb-2">No Features Yet</h2>
        
        {/* Description */}
        <p className="text-muted-foreground mb-6">
          Your board is empty. Create your first feature to start tracking work 
          through your workflow stages.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button 
            onClick={onCreateFeature}
            className="bg-[var(--ds-text-brand,#2563eb)] hover:bg-[var(--ds-background-brand-bold-hovered,#1d4ed8)] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Feature
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>

        {/* Tips */}
        <div className="mt-8 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 text-left">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            QUICK TIPS
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Drag cards between columns to update status</li>
            <li>• Click cards to view full details</li>
            <li>• Use filters to focus on specific work</li>
            <li>• Watch for WIP limits to avoid bottlenecks</li>
          </ul>
        </div>
      </div>
    </div>
  );
}