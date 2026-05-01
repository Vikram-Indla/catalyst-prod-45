// =====================================================
// EMPTY TIMELINE STATE
// Shown when timeline has no features with dates
// =====================================================

import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyTimelineStateProps {
  projectId: string;
  onCreateFeature?: () => void;
}

export function EmptyTimelineState({ projectId, onCreateFeature }: EmptyTimelineStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[rgba(37,99,235,0.15)] flex items-center justify-center">
          <Calendar className="w-8 h-8 text-[var(--ds-text-brand,#2563eb)]" />
        </div>

        <h2 className="text-xl font-semibold mb-2">No Timeline Data</h2>
        
        <p className="text-gray-500 mb-6">
          Your timeline is empty. Add features with planned dates to visualize 
          your roadmap on the timeline.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button 
            onClick={onCreateFeature}
            className="bg-[var(--ds-text-brand,#2563eb)] hover:bg-[var(--ds-background-brand-bold-hovered,#1d4ed8)] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Feature
          </Button>
        </div>

        <div className="mt-8 p-4 rounded-lg bg-gray-50 text-left">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
            QUICK TIPS
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Set planned start and end dates on features</li>
            <li>• Group features by release for better organization</li>
            <li>• Use zoom controls to adjust time scale</li>
            <li>• Click "Today" to navigate to current date</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
