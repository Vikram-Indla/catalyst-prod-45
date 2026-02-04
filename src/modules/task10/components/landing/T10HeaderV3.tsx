// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10HeaderV3
// Purpose: Landing page header matching dashboard style
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface T10HeaderV3Props {
  onNewList: () => void;
}

export function T10HeaderV3({ onNewList }: T10HeaderV3Props) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Task<sup>10</sup>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Priority Management
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          onClick={onNewList}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30"
        >
          <Plus className="w-4 h-4 mr-2" />
          New List
        </Button>
      </div>
    </div>
  );
}

export default T10HeaderV3;
