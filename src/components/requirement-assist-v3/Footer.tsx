// ============================================================
// FOOTER COMPONENT
// Stats, export, and publish actions
// ============================================================

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore, selectItemCounts } from '@/stores/requirementAssistStore';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileJson,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function Footer() {
  const { workItems, generation } = useStore();
  const counts = useStore(useShallow(selectItemCounts));
  
  const hasItems = workItems.length > 0;

  const handleExport = (format: 'excel' | 'csv' | 'json') => {
    // TODO: Implement export
    toast.success(`Exporting as ${format.toUpperCase()}...`);
  };

  const handlePublish = () => {
    // TODO: Implement publish
    toast.success('Publishing to backlog...');
  };

  return (
    <footer className="h-12 bg-white border-t border-slate-200 flex items-center justify-between px-4 flex-shrink-0">
      {/* Left - Stats */}
      <div className="flex items-center gap-4 text-sm">
        {hasItems ? (
          <>
            <StatBadge label="Epics" count={counts.epics} color="bg-purple-100 text-purple-700" />
            <StatBadge label="Features" count={counts.features} color="bg-blue-100 text-blue-700" />
            <StatBadge label="Stories" count={counts.stories} color="bg-green-100 text-green-700" />
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              <strong className="text-slate-700">{counts.selected}</strong> selected
            </span>
          </>
        ) : (
          <span className="text-slate-400">No items generated</span>
        )}
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {/* Export Dropdown */}
        <div className="relative group">
          <button
            disabled={!hasItems}
            className="h-8 px-3 flex items-center gap-2 text-sm text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          
          {/* Dropdown Menu */}
          <div className="absolute bottom-full right-0 mb-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <button
              onClick={() => handleExport('excel')}
              className="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export as Excel
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export as CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
            >
              <FileJson className="w-4 h-4" />
              Export as JSON
            </button>
          </div>
        </div>

        {/* Publish Button */}
        <button
          onClick={handlePublish}
          disabled={!hasItems || counts.selected === 0}
          className="h-8 px-4 flex items-center gap-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" />
          Publish to Backlog
        </button>
      </div>
    </footer>
  );
}

function StatBadge({ 
  label, 
  count, 
  color 
}: { 
  label: string; 
  count: number; 
  color: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${color}`}>
      {count} {label}
    </span>
  );
}
