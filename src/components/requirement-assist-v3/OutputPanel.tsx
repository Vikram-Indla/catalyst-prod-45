// ============================================================
// OUTPUT PANEL COMPONENT
// Right side of the split workspace
// ============================================================

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore, selectItemCounts } from '@/stores/requirementAssistStore';
import { GeneratingOverlay } from './GeneratingOverlay';
import { WorkItemTree } from './WorkItemTree';
import { DetailPanel } from './DetailPanel';
import { EmptyState } from './EmptyState';
import { GenerationSummary } from './GenerationSummary';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

export function OutputPanel() {
  const { 
    workItems, 
    isGenerating, 
    filterType,
    searchQuery,
    generation,
    projects,
    projectId,
    setFilterType,
    setSearchQuery,
    expandAll,
    collapseAll,
  } = useStore();
  
  const counts = useStore(useShallow(selectItemCounts));
  const hasItems = workItems.length > 0;
  
  // Get selected project name for summary
  const selectedProject = projects.find(p => p.id === projectId);
  const projectName = selectedProject?.name || '';

  return (
    <div className="relative flex flex-col bg-slate-50 overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Output
        </span>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!hasItems || isGenerating}
              className="w-40 h-8 pl-8 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary disabled:opacity-50"
            />
          </div>
          
          {/* Filter Tabs */}
          <FilterTabs 
            active={filterType} 
            onChange={setFilterType} 
            counts={counts}
            disabled={!hasItems || isGenerating}
          />
          
          {/* Expand/Collapse */}
          <div className="flex border border-slate-200 rounded-md overflow-hidden">
            <button
              onClick={expandAll}
              disabled={!hasItems}
              className="p-1.5 hover:bg-slate-100 disabled:opacity-50"
              title="Expand all"
            >
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={collapseAll}
              disabled={!hasItems}
              className="p-1.5 hover:bg-slate-100 disabled:opacity-50 border-l border-slate-200"
              title="Collapse all"
            >
              <ChevronUp className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>
      
      {/* FIX #7: Generation Summary Header */}
      {hasItems && generation && !isGenerating && (
        <GenerationSummary
          generationId={generation.displayId}
          projectName={projectName}
          counts={{
            epics: counts.epics,
            features: counts.features,
            stories: counts.stories,
          }}
        />
      )}
      
      {/* Panel Body */}
      <div className="flex-1 overflow-hidden relative">
        {isGenerating ? (
          <GeneratingOverlay />
        ) : hasItems ? (
          <WorkItemTree />
        ) : (
          <EmptyState />
        )}
      </div>
      
      {/* Detail Panel (Slide-over) */}
      <DetailPanel />
    </div>
  );
}

// ============================================================
// FILTER TABS SUB-COMPONENT
// ============================================================

interface FilterTabsProps {
  active: 'all' | 'epic' | 'feature' | 'story';
  onChange: (type: 'all' | 'epic' | 'feature' | 'story') => void;
  counts: {
    total: number;
    epics: number;
    features: number;
    stories: number;
  };
  disabled: boolean;
}

function FilterTabs({ active, onChange, counts, disabled }: FilterTabsProps) {
  const tabs = [
    { id: 'all' as const, label: 'All', count: counts.total },
    { id: 'epic' as const, label: 'Epics', count: counts.epics },
    { id: 'feature' as const, label: 'Features', count: counts.features },
    { id: 'story' as const, label: 'Stories', count: counts.stories },
  ];

  return (
    <div className="flex gap-0.5 p-0.5 bg-slate-100 rounded-md">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          disabled={disabled}
          className={`
            px-2 py-1 text-xs font-medium rounded transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${active === tab.id 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
            }
          `}
        >
          {tab.label}
          {tab.count > 0 && (
            <span className={`ml-1 ${active === tab.id ? 'text-slate-500' : 'text-slate-400'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
