// ============================================================
// RESULTS STATE COMPONENT
// Split view with input reference on left, results tree on right
// ============================================================

import React, { useState } from 'react';
import { 
  ChevronRight, 
  RefreshCw, 
  Plus, 
  Download, 
  Upload, 
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FileJson,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore, type Generation, selectItemCounts } from '@/stores/requirementAssistStore';
import { useShallow } from 'zustand/react/shallow';
import { ResultsTreeItem } from './ResultsTreeItem';
import { PublishConfirmModal } from '../PublishConfirmModal';
import { PublishSummaryModal } from '../PublishSummaryModal';
import { generateDisplayId, isPublishable } from '@/utils/requirementAssistDisplayId';
import { exportToExcel, exportToCSV, exportToJSON } from '@/utils/requirementAssistExport';
import toast from 'react-hot-toast';

interface ResultsStateProps {
  generation: Generation;
  onRegenerate: () => void;
  onNew: () => void;
}

interface PublishedItem {
  key: string;
  type: string;
  title: string;
  programId?: string;
  projectId?: string;
}

export function ResultsState({ generation, onRegenerate, onNew }: ResultsStateProps) {
  const { 
    workItems, 
    workItemsTree, 
    programs, 
    projects, 
    programId, 
    projectId, 
    filterType, 
    setFilterType,
    updateWorkItem 
  } = useStore();
  
  const counts = useStore(useShallow(selectItemCounts));
  
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [publishedItems, setPublishedItems] = useState<PublishedItem[]>([]);
  const [publishedAt, setPublishedAt] = useState('');

  const selectedProgram = programs.find(p => p.id === programId);
  const selectedProject = projects.find(p => p.id === projectId);
  const programCode = selectedProgram?.code || 'PRG';
  const projectCode = selectedProject?.code || 'PRJ';
  const programName = selectedProgram?.name || 'Not selected';
  const projectName = selectedProject?.name || 'Not selected';

  const selectedItems = workItems.filter(item => item.isSelected && isPublishable(item));
  const hasItems = workItems.length > 0;

  const handleExport = async (format: 'excel' | 'csv' | 'json') => {
    const itemsToExport = selectedItems.length > 0 ? selectedItems : workItems.filter(i => isPublishable(i));
    const filename = `requirement-assist-${generation.displayId || 'export'}`;

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
    } catch {
      toast.error('Export failed. Please try again.');
    }
    setIsExportOpen(false);
  };

  const handlePublishClick = () => {
    if (selectedItems.length === 0) {
      toast.error('Select items to publish');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const typeCounters = { epic: 0, feature: 0, story: 0 };
      const published: PublishedItem[] = [];
      
      for (const item of selectedItems) {
        const itemType = item.itemType as 'epic' | 'feature' | 'story';
        typeCounters[itemType] = (typeCounters[itemType] || 0) + 1;
        
        const permanentId = generateDisplayId(itemType, programCode, projectCode, typeCounters[itemType]);
        
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
      
      setPublishedItems(published);
      setPublishedAt(new Date().toLocaleString());
      setShowConfirmModal(false);
      setShowSummaryModal(true);
      
      toast.success(`Published ${published.length} items to backlog`);
    } catch {
      toast.error('Publish failed. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Filter items based on type
  const filteredTree = filterType === 'all' 
    ? workItemsTree 
    : workItemsTree.filter(item => item.itemType === filterType);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-900">Requirement Assist</h1>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-600">
            {generation.displayId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            className="h-9 px-4 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
          <button
            onClick={onNew}
            className="h-9 px-4 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      </header>

      {/* Split View */}
      <main className="flex-1 min-h-0 grid grid-cols-2 overflow-hidden">
        {/* Left Panel - Input Reference */}
        <div className="border-r border-slate-200 bg-white overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Input</h3>
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                <span className="font-medium">{programName}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="font-medium">{projectName}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-700 leading-relaxed max-h-64 overflow-y-auto">
                {generation.inputText}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Generated</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  <span className="text-sm font-semibold text-slate-900">{generation.epicCount}</span>
                  <span className="text-sm text-slate-500">Epics</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  <span className="text-sm font-semibold text-slate-900">{generation.featureCount}</span>
                  <span className="text-sm text-slate-500">Feat</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-semibold text-slate-900">{generation.storyCount}</span>
                  <span className="text-sm text-slate-500">Stories</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Results Tree */}
        <div className="overflow-y-auto bg-white">
          {/* Filter Tabs */}
          <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-1">
            {(['all', 'epic', 'feature', 'story'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  filterType === type 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
              </button>
            ))}
          </div>

          {/* Tree Items */}
          <div className="p-4 space-y-1">
            {filteredTree.map(item => (
              <ResultsTreeItem
                key={item.id}
                item={item}
                allItems={workItems}
                programCode={programCode}
                projectCode={projectCode}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 bg-white border-t border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
        {/* Left: Stats */}
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white">
            {counts.epics} Epics
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-teal-500 to-teal-600 text-white">
            {counts.features} Features
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500 to-green-600 text-white">
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
              className={cn(
                "h-9 px-4 flex items-center gap-2 text-sm font-medium border border-slate-200 rounded-lg transition-all",
                hasItems 
                  ? "text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300" 
                  : "text-slate-400 bg-slate-50 cursor-not-allowed"
              )}
            >
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className={cn("w-4 h-4 transition-transform", isExportOpen && "rotate-180")} />
            </button>

            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
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
            className={cn(
              "h-9 px-5 flex items-center gap-2 text-sm font-semibold rounded-lg transition-all",
              hasItems && counts.selected > 0 && !isPublishing
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-md"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Publish
              </>
            )}
          </button>
        </div>
      </footer>

      {/* Modals */}
      <PublishConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmPublish}
        selectedItems={selectedItems}
        programName={programName}
        projectName={projectName}
        isPublishing={isPublishing}
      />
      
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
