/**
 * Context Panel Component - Pixel Perfect Match
 * Side panel with Trace, Props, AI, History tabs - 320px width
 */

import React from 'react';
import { Link2, Settings, Sparkles, History, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TraceabilityTab } from './TraceabilityTab';
import { PropertiesTab } from './PropertiesTab';
import { AIAssistTab } from './AIAssistTab';
import { HistoryTab } from './HistoryTab';
import type { CaseStatus } from '../../../../api/types';

type ContextTab = 'traceability' | 'properties' | 'ai' | 'history';

interface ContextPanelProps {
  activeTab: ContextTab;
  onTabChange: (tab: ContextTab) => void;
  // Properties data
  status: CaseStatus;
  priorityId: string;
  typeId: string;
  folderId: string;
  estimatedTime: string;
  selectedLabels: string[];
  priorities: { id: string; name: string; color: string }[];
  caseTypes: { id: string; name: string }[];
  folders: { id: string; name: string }[];
  labels: { id: string; name: string; color: string }[];
  onStatusChange: (value: CaseStatus) => void;
  onPriorityChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onFolderChange: (value: string) => void;
  onEstimatedTimeChange: (value: string) => void;
  onLabelsChange: (labels: string[]) => void;
  // Traceability data
  missingCoverageCount?: number;
  onLinkItem?: () => void;
  // AI handlers
  onGenerateSteps?: (prompt: string) => Promise<void>;
  onImproveDescription?: () => Promise<void>;
  // History data
  historyEntries?: any[];
  versions?: any[];
}

const tabs = [
  { id: 'traceability' as ContextTab, icon: Link2, label: 'Trace' },
  { id: 'properties' as ContextTab, icon: Settings, label: 'Props' },
  { id: 'ai' as ContextTab, icon: Sparkles, label: 'AI' },
  { id: 'history' as ContextTab, icon: History, label: 'History' },
];

export function ContextPanel({
  activeTab,
  onTabChange,
  status,
  priorityId,
  typeId,
  folderId,
  estimatedTime,
  selectedLabels,
  priorities,
  caseTypes,
  folders,
  labels,
  onStatusChange,
  onPriorityChange,
  onTypeChange,
  onFolderChange,
  onEstimatedTimeChange,
  onLabelsChange,
  onLinkItem,
  onGenerateSteps,
  onImproveDescription,
  historyEntries = [],
  versions = [],
}: ContextPanelProps) {
  return (
    <aside
      className="flex flex-col border-l bg-white h-full shrink-0"
      style={{ width: '320px', minWidth: '320px', borderColor: '#e5e5e5' }}
    >
      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: '#e5e5e5' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-b-2',
                isActive
                  ? 'border-[#2563eb] text-[#2563eb]'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeTab === 'traceability' && (
            <div className="space-y-6">
              {/* Trace Hierarchy */}
              <div>
                <h4
                  className="font-semibold text-neutral-700 uppercase tracking-wide mb-3"
                  style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                >
                  TRACE HIERARCHY
                </h4>
                <div
                  className="rounded-lg border p-4 text-center"
                  style={{ borderColor: '#e5e5e5' }}
                >
                  <p className="text-sm text-neutral-500">No hierarchy defined</p>
                </div>
              </div>

              {/* AC Coverage */}
              <div>
                <h4
                  className="font-semibold text-neutral-700 uppercase tracking-wide mb-3"
                  style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                >
                  AC COVERAGE
                </h4>
                <div
                  className="rounded-lg border p-4 text-center"
                  style={{ borderColor: '#e5e5e5' }}
                >
                  <p className="text-sm text-neutral-500">No acceptance criteria linked</p>
                </div>
              </div>

              {/* Linked Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4
                    className="font-semibold text-neutral-700 uppercase tracking-wide"
                    style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                  >
                    LINKED ITEMS
                  </h4>
                  <button
                    onClick={onLinkItem}
                    className="text-[#2563eb] hover:text-[#1d4ed8] text-sm font-medium"
                  >
                    + Link
                  </button>
                </div>
                <div
                  className="rounded-lg border p-4"
                  style={{ borderColor: '#e5e5e5' }}
                >
                  <div className="flex items-center gap-2 text-neutral-500">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">Link to defect, story, or test case</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'properties' && (
            <PropertiesTab
              status={status}
              priorityId={priorityId}
              typeId={typeId}
              folderId={folderId}
              estimatedTime={estimatedTime}
              selectedLabels={selectedLabels}
              priorities={priorities}
              caseTypes={caseTypes}
              folders={folders}
              labels={labels}
              onStatusChange={onStatusChange}
              onPriorityChange={onPriorityChange}
              onTypeChange={onTypeChange}
              onFolderChange={onFolderChange}
              onEstimatedTimeChange={onEstimatedTimeChange}
              onLabelsChange={onLabelsChange}
            />
          )}

          {activeTab === 'ai' && (
            <AIAssistTab
              onGenerateSteps={onGenerateSteps}
              onImproveDescription={onImproveDescription}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              entries={historyEntries}
              versions={versions}
            />
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
