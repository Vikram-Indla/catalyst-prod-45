// ============================================================
// FOOTER COMPONENT - ENHANCED
// Stats, export, and publish actions with gradient badges
// ============================================================

import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore, selectItemCounts } from '@/stores/requirementAssistStore';
import { 
  Download, 
  Upload, 
  ChevronDown,
  FileSpreadsheet, 
  FileJson,
  FileText,
  Loader2,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToExcel, exportToCSV, exportToJSON } from '@/utils/requirementAssistExport';

export function Footer() {
  const { workItems, generation } = useStore();
  const counts = useStore(useShallow(selectItemCounts));
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const selectedItems = workItems.filter(item => item.isSelected);
  const hasItems = workItems.length > 0;

  const handleExport = async (format: 'excel' | 'csv' | 'json') => {
    const itemsToExport = selectedItems.length > 0 ? selectedItems : workItems;
    const filename = `requirement-assist-${generation?.displayId || 'export'}`;

    try {
      switch (format) {
        case 'excel':
          exportToExcel(itemsToExport, filename);
          toast.success(`Exported ${itemsToExport.length} items to Excel`);
          break;
        case 'csv':
          exportToCSV(itemsToExport, filename);
          toast.success(`Exported ${itemsToExport.length} items to CSV`);
          break;
        case 'json':
          exportToJSON(itemsToExport, filename);
          toast.success(`Exported ${itemsToExport.length} items to JSON`);
          break;
      }
    } catch (error) {
      toast.error('Export failed. Please try again.');
    }
    setIsExportOpen(false);
  };

  const handlePublish = async () => {
    if (selectedItems.length === 0) {
      toast.error('Select items to publish');
      return;
    }

    setIsPublishing(true);
    
    try {
      // Simulate API call - replace with actual Supabase update
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success(
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>Published {selectedItems.length} items to backlog</span>
        </div>
      );
    } catch (error) {
      toast.error('Publish failed. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <footer className="h-14 bg-white border-t border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: Stats */}
      <div className="flex items-center gap-3">
        {hasItems ? (
          <>
            <StatBadge 
              count={counts.epics} 
              label="Epics" 
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-ra-badge-epic" 
            />
            <StatBadge 
              count={counts.features} 
              label="Features" 
              className="bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-ra-badge-feature" 
            />
            <StatBadge 
              count={counts.stories} 
              label="Stories" 
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-ra-badge-story" 
            />
            
            <div className="w-px h-6 bg-slate-200 mx-2" />
            
            <span className="text-sm text-slate-600">
              <strong className="font-semibold text-slate-900">{counts.selected}</strong> selected
            </span>
          </>
        ) : (
          <span className="text-sm text-slate-400">No items generated yet</span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            disabled={!hasItems}
            className={`
              h-9 px-4 flex items-center gap-2 text-sm font-medium
              border border-slate-200 rounded-lg transition-all
              ${hasItems 
                ? 'text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300' 
                : 'text-slate-400 bg-slate-50 cursor-not-allowed'
              }
            `}
          >
            <Download className="w-4 h-4" />
            Export
            <ChevronDown className={`w-4 h-4 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
          </button>

          {isExportOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsExportOpen(false)} 
              />
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
                <div className="p-1">
                  <ExportOption 
                    icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                    label="Export as Excel"
                    sublabel=".xlsx"
                    onClick={() => handleExport('excel')}
                  />
                  <ExportOption 
                    icon={<FileText className="w-4 h-4 text-blue-600" />}
                    label="Export as CSV"
                    sublabel=".csv"
                    onClick={() => handleExport('csv')}
                  />
                  <ExportOption 
                    icon={<FileJson className="w-4 h-4 text-orange-600" />}
                    label="Export as JSON"
                    sublabel=".json"
                    onClick={() => handleExport('json')}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Publish Button */}
        <button
          onClick={handlePublish}
          disabled={!hasItems || counts.selected === 0 || isPublishing}
          className={`
            h-9 px-5 flex items-center gap-2 text-sm font-semibold
            rounded-lg transition-all
            ${hasItems && counts.selected > 0 && !isPublishing
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-ra-button hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Publish to Backlog
            </>
          )}
        </button>
      </div>
    </footer>
  );
}

function StatBadge({ count, label, className }: { count: number; label: string; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
      {count} {label}
    </span>
  );
}

function ExportOption({ 
  icon, 
  label, 
  sublabel, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 rounded-lg transition-colors"
    >
      {icon}
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="text-xs text-slate-400">{sublabel}</div>
      </div>
    </button>
  );
}
