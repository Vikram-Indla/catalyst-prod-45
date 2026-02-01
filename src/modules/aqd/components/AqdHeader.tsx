// Aqd¹⁰ Header Component - Unified V9 style matching Taskhub
import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface AqdHeaderProps {
  onCreateList: () => void;
  actions?: ReactNode;
}

export function AqdHeader({ onCreateList, actions }: AqdHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
          AQD<sup className="text-xs font-bold">10</sup>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Executive Priority Management
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        {actions}
        
        <Button
          onClick={onCreateList}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30"
        >
          <Plus className="w-4 h-4 mr-2" />
          New List
        </Button>
      </div>
    </div>
  );
}
