// ============================================================
// RESULTS STATE COMPONENT - COMPLETE REDESIGN
// Three-column: Input Summary | Results Tree | Item Detail
// ============================================================

import React, { useState, useMemo } from 'react';
import { 
  Check, RefreshCw, Plus, Download, Upload, ChevronRight, ChevronDown,
  X, Search, Maximize2, FileSpreadsheet, FileText, FileJson, Loader2,
  AlertTriangle, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore, type Generation, selectItemCounts } from '@/stores/requirementAssistStore';
import { useShallow } from 'zustand/react/shallow';
import { ResultsTreeItem } from './ResultsTreeItem';
import { PublishConfirmModal } from '../PublishConfirmModal';
import { PublishSummaryModal } from '../PublishSummaryModal';
import { generateDisplayId, isPublishable } from '@/utils/requirementAssistDisplayId';
import { exportToExcel, exportToCSV, exportToJSON } from '@/utils/requirementAssistExport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

// ============================================================
// FILTER TAB COMPONENT
// ============================================================
function FilterTab({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
      )}
    >
      {children}
    </button>
  );
}

// ============================================================
// ITEM DETAIL PANEL COMPONENT
// ============================================================
function ItemDetailPanel({ 
  item, 
  onClose 
}: { 
  item: any; 
  onClose: () => void;
}) {
  const badgeColors: Record<string, string> = {
    epic: 'bg-violet-100 text-violet-700',
    feature: 'bg-teal-100 text-teal-700',
    story: 'bg-emerald-100 text-emerald-700'
  };

  const confidence = Math.round((item.confidenceScore || 0.85) * 100);

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-700">Item Details</span>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ID & Type */}
        <div className="mb-4">
          <span className={cn(
            "px-2.5 py-1 text-xs font-bold rounded-lg font-mono",
            badgeColors[item.itemType]
          )}>
            {item.displayId}
          </span>
          <span className="ml-2 text-xs text-slate-400 capitalize">{item.itemType}</span>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-900 mb-4">{item.title}</h3>

        {/* Description */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Description
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {item.description || 'No description provided'}
          </p>
        </div>

        {/* Acceptance Criteria (for stories) */}
        {item.itemType === 'story' && item.acceptanceCriteria && item.acceptanceCriteria.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Acceptance Criteria
            </p>
            <div className="space-y-2">
              {item.acceptanceCriteria.map((ac: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{ac}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confidence */}
        <div className="p-3 bg-slate-50 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Confidence</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className={cn(
                "text-sm font-bold",
                confidence >= 90 ? "text-emerald-600" : 
                confidence >= 80 ? "text-amber-600" : "text-red-600"
              )}>
                {confidence}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PUBLISH MODAL COMPONENT
// ============================================================
function PublishModal({ 
  open, 
  onClose, 
  onConfirm,
  counts, 
  programName, 
  projectName,
  isPublishing
}: { 
  open: boolean; 
  onClose: () => void;
  onConfirm: () => void;
  counts: { epics: number; features: number; stories: number };
  programName: string;
  projectName: string;
  isPublishing: boolean;
}) {
  const totalItems = counts.epics + counts.features + counts.stories;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publish to Backlog</DialogTitle>
          <DialogDescription>{totalItems} items will be published</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Program Backlog */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-slate-900">Program Backlog</p>
              <p className="text-xs text-slate-500">Epics & Features → {programName}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-bold rounded">
                {counts.epics}E
              </span>
              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-bold rounded">
                {counts.features}F
              </span>
            </div>
          </div>

          {/* Project Backlog */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-slate-900">Project Backlog</p>
              <p className="text-xs text-slate-500">Stories → {projectName}</p>
            </div>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">
              {counts.stories}S
            </span>
          </div>

          {/* Warning */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <p className="text-sm text-amber-800">This action cannot be undone</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isPublishing}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={isPublishing}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>Publish {totalItems} Items</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MAIN RESULTS STATE COMPONENT
// ============================================================
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
    updateWorkItem,
    expandAll,
    collapseAll,
    selectAllItems,
    deselectAllItems,
    selectItem,
    selectedItemId,
    expandedIds,
    toggleExpanded
  } = useStore();
  
  const counts = useStore(useShallow(selectItemCounts));
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
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

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return workItems.find(i => i.id === selectedItemId) || null;
  }, [selectedItemId, workItems]);

  // Counts for filter tabs
  const epics = workItems.filter(i => i.itemType === 'epic');
  const features = workItems.filter(i => i.itemType === 'feature');
  const stories = workItems.filter(i => i.itemType === 'story');

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
    setShowPublishModal(true);
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
      setShowPublishModal(false);
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
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">Generation Complete</h1>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full font-mono">
                  {generation.displayId}
                </span>
              </div>
              <p className="text-xs text-slate-500">Review and publish work items to backlog</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onRegenerate} className="h-9">
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
          <Button onClick={onNew} className="h-9 bg-gradient-to-r from-blue-600 to-indigo-600">
            <Plus className="w-4 h-4 mr-2" />
            New Generation
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Input Summary Panel */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
          <div className="h-12 px-4 flex items-center border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">Input Summary</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Destination */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Destination
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">{programName}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="font-medium">{projectName}</span>
              </div>
            </div>

            {/* Input Text */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Requirements
              </p>
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
                {generation.inputText}
              </div>
            </div>

            {/* Generated Counts */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Generated
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-violet-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-violet-600">{generation.epicCount}</p>
                  <p className="text-xs text-violet-500">Epics</p>
                </div>
                <div className="p-3 bg-teal-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-teal-600">{generation.featureCount}</p>
                  <p className="text-xs text-teal-500">Features</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-emerald-600">{generation.storyCount}</p>
                  <p className="text-xs text-emerald-500">Stories</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Results Tree Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="h-12 px-5 flex items-center justify-between border-b border-slate-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search items..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-48 pl-9 text-sm"
                />
              </div>
              
              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                <FilterTab active={filterType === 'all'} onClick={() => setFilterType('all')}>
                  All ({workItems.length})
                </FilterTab>
                <FilterTab active={filterType === 'epic'} onClick={() => setFilterType('epic')}>
                  Epics ({epics.length})
                </FilterTab>
                <FilterTab active={filterType === 'feature'} onClick={() => setFilterType('feature')}>
                  Features ({features.length})
                </FilterTab>
                <FilterTab active={filterType === 'story'} onClick={() => setFilterType('story')}>
                  Stories ({stories.length})
                </FilterTab>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll} className="h-8 text-xs">
                <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={selectAllItems} className="h-8 text-xs">
                <Checkbox className="w-3.5 h-3.5 mr-1.5" />
                Select All
              </Button>
            </div>
          </div>

          {/* Tree */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
            <div className="space-y-3">
              {filteredTree.map((epic, i) => (
                <ResultsTreeItem
                  key={epic.id}
                  item={epic}
                  allItems={workItems}
                  programCode={programCode}
                  projectCode={projectCode}
                  level={0}
                  onItemClick={(item) => selectItem(item.id)}
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="h-16 px-5 flex items-center justify-between border-t border-slate-200 bg-white flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-violet-100 text-violet-700 text-xs font-bold rounded-lg">
                  {counts.epics} Epics
                </span>
                <span className="px-3 py-1.5 bg-teal-100 text-teal-700 text-xs font-bold rounded-lg">
                  {counts.features} Features
                </span>
                <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">
                  {counts.stories} Stories
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <span className="text-sm text-slate-600">
                <span className="font-bold text-slate-900">{counts.selected}</span> of {workItems.length} selected
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Export Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  disabled={!hasItems}
                  className="h-10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                  <ChevronDown className={cn("w-4 h-4 ml-2 transition-transform", isExportOpen && "rotate-180")} />
                </Button>

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
              <Button
                onClick={handlePublishClick}
                disabled={!hasItems || counts.selected === 0 || isPublishing}
                className="h-10 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Publish Selected
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Item Detail Panel */}
        {selectedItem && (
          <ItemDetailPanel 
            item={selectedItem} 
            onClose={() => selectItem(null)}
          />
        )}
      </div>

      {/* Publish Modal */}
      <PublishModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onConfirm={handleConfirmPublish}
        counts={{
          epics: selectedItems.filter(i => i.itemType === 'epic').length,
          features: selectedItems.filter(i => i.itemType === 'feature').length,
          stories: selectedItems.filter(i => i.itemType === 'story').length
        }}
        programName={programName}
        projectName={projectName}
        isPublishing={isPublishing}
      />

      {/* Legacy Modals for compatibility */}
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
