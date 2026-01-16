/**
 * Compare Header Component
 * Title, description, and action buttons
 */

import React from 'react';
import { Download, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompareHeaderProps {
  onExport?: () => void;
  onSaveView?: () => void;
}

export function CompareHeader({ onExport, onSaveView }: CompareHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Release Compare</h1>
        <p className="text-sm text-slate-500 mt-1">
          Compare metrics, progress, and readiness across releases
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="text-slate-600"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveView}
          className="text-slate-600"
        >
          <Bookmark className="w-4 h-4 mr-2" />
          Save View
        </Button>
      </div>
    </div>
  );
}
