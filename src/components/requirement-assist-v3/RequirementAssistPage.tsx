// ============================================================
// REQUIREMENT ASSIST PAGE
// Main container component with Header, Main Grid, and Footer
// ============================================================

import React, { useState } from 'react';
import { Header } from './Header';
import { InputPanel } from './InputPanel';
import { OutputPanel } from './OutputPanel';
import { PublishConfirmModal } from './PublishConfirmModal';
import { PublishSummaryModal } from './PublishSummaryModal';
import { useKeyboardShortcuts, usePrograms } from '@/hooks/requirement-assist';
import { useStore, selectItemCounts } from '@/stores/requirementAssistStore';
import { useShallow } from 'zustand/react/shallow';
import { generateDisplayId, isPublishable } from '@/utils/requirementAssistDisplayId';
import { 
  Download, 
  Upload, 
  ChevronDown, 
  FileSpreadsheet, 
  FileText, 
  FileJson,
  Loader2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToExcel, exportToCSV, exportToJSON } from '@/utils/requirementAssistExport';

interface PublishedItem {
  key: string;
  type: string;
  title: string;
  programId?: string;
  projectId?: string;
}

export function RequirementAssistPage() {
  // Initialize hooks
  useKeyboardShortcuts();
  usePrograms();

  const { workItems, generation, programs, projects, programId, projectId, updateWorkItem } = useStore();
  const counts = useStore(useShallow(selectItemCounts));
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Publish modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [publishedItems, setPublishedItems] = useState<PublishedItem[]>([]);
  const [publishedAt, setPublishedAt] = useState('');

  // FIX #3: Only include publishable items (no PRD, not already published)
  const selectedItems = workItems.filter(item => item.isSelected && isPublishable(item));
  const hasItems = workItems.length > 0;
  
  // Get program and project names for modals
  const selectedProgram = programs.find(p => p.id === programId);
  const selectedProject = projects.find(p => p.id === projectId);
  const programName = selectedProgram?.name || 'Not selected';
  const projectName = selectedProject?.name || 'Not selected';
  const programCode = selectedProgram?.code || 'PRG';
  const projectCode = selectedProject?.code || 'PRJ';

  const handleExport = async (format: 'excel' | 'csv' | 'json') => {
    const itemsToExport = selectedItems.length > 0 ? selectedItems : workItems.filter(i => isPublishable(i));
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

  // FIX #5: Show confirmation modal before publish
  const handlePublishClick = () => {
    if (selectedItems.length === 0) {
      toast.error('Select items to publish');
      return;
    }
    setShowConfirmModal(true);
  };

  // FIX #4 & #6: Actual publish with state tracking and summary
  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    
    try {
      // Simulate publish API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // FIX #2: Generate proper display IDs
      // Epics/Features use programCode, Stories use projectCode
      const typeCounters = { epic: 0, feature: 0, story: 0 };
      const published: PublishedItem[] = [];
      
      for (const item of selectedItems) {
        const itemType = item.itemType as 'epic' | 'feature' | 'story';
        typeCounters[itemType] = (typeCounters[itemType] || 0) + 1;
        
        // Pass itemType first, then programCode, projectCode, sequence
        const permanentId = generateDisplayId(itemType, programCode, projectCode, typeCounters[itemType]);
        
        // FIX #4: Mark item as published
        updateWorkItem(item.id, {
          isPublished: true,
          displayId: permanentId,
        });
        
        published.push({
          key: permanentId,
          type: itemType,
          title: item.title,
          programId: programId || '',
          projectId: projectId || '',
        });
      }
      
      // Prepare summary modal data
      setPublishedItems(published);
      setPublishedAt(new Date().toLocaleString());
      
      // Close confirm modal, show summary modal
      setShowConfirmModal(false);
      setShowSummaryModal(true);
      
      toast.success(`Published ${published.length} items to backlog`);
    } catch (error) {
      toast.error('Publish failed. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <Header />
      
      {/* Main Content - 2 Column Split */}
      <main className="flex-1 min-h-0 grid grid-cols-2 overflow-hidden">
        {/* Input Panel (Left) */}
        <InputPanel />
        
        {/* Output Panel (Right) */}
        <OutputPanel />
      </main>
      
      {/* Footer - Fixed at bottom */}
      <footer className="h-14 bg-white border-t border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
        {/* Left: Stats */}
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm shadow-violet-500/30">
            {counts.epics} Epics
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-sm shadow-teal-500/30">
            {counts.features} Features
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm shadow-emerald-500/30">
            {counts.stories} Stories
          </span>
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <span className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-900">{counts.selected}</strong> selected
          </span>
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
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-1">
                    <button
                      onClick={() => handleExport('excel')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">Export as Excel</div>
                        <div className="text-xs text-slate-400">.xlsx</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">Export as CSV</div>
                        <div className="text-xs text-slate-400">.csv</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleExport('json')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <FileJson className="w-4 h-4 text-orange-600" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">Export as JSON</div>
                        <div className="text-xs text-slate-400">.json</div>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Publish Button */}
          <button
            onClick={handlePublishClick}
            disabled={!hasItems || counts.selected === 0 || isPublishing}
            className={`
              h-9 px-5 flex items-center gap-2 text-sm font-semibold
              rounded-lg transition-all
              ${hasItems && counts.selected > 0 && !isPublishing
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
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
      
      {/* FIX #5: Publish Confirmation Modal */}
      <PublishConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmPublish}
        selectedItems={selectedItems}
        programName={programName}
        projectName={projectName}
        isPublishing={isPublishing}
      />
      
      {/* FIX #6: Publish Summary Modal */}
      <PublishSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        publishedItems={publishedItems}
        programName={programName}
        projectName={projectName}
        programId={programId || ''}
        projectId={projectId || ''}
        publishedAt={publishedAt}
      />
    </div>
  );
}