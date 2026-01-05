/**
 * Context Panel Component
 * Side panel with Traceability, Properties, AI, History tabs
 */

import React from 'react';
import { Link2, Settings, Sparkles, History } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
  missingCoverageCount = 0,
  onLinkItem,
  onGenerateSteps,
  onImproveDescription,
  historyEntries = [],
  versions = [],
}: ContextPanelProps) {
  return (
    <div className="w-[360px] shrink-0 bg-background border-l border-border flex flex-col overflow-hidden">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as ContextTab)} className="flex flex-col flex-1">
        <TabsList className="w-full h-auto p-0 bg-muted/50 border-b border-border rounded-none">
          <TabsTrigger
            value="traceability"
            className={cn(
              'flex-1 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary',
              'data-[state=active]:bg-background data-[state=active]:text-primary',
              'text-xs font-medium'
            )}
          >
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            Trace
            {missingCoverageCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[9px]">
                {missingCoverageCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="properties"
            className={cn(
              'flex-1 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary',
              'data-[state=active]:bg-background data-[state=active]:text-primary',
              'text-xs font-medium'
            )}
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Props
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className={cn(
              'flex-1 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary',
              'data-[state=active]:bg-background data-[state=active]:text-primary',
              'text-xs font-medium'
            )}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            AI
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className={cn(
              'flex-1 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary',
              'data-[state=active]:bg-background data-[state=active]:text-primary',
              'text-xs font-medium'
            )}
          >
            <History className="h-3.5 w-3.5 mr-1.5" />
            History
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="traceability" className="m-0">
              <TraceabilityTab onLinkItem={onLinkItem} />
            </TabsContent>

            <TabsContent value="properties" className="m-0">
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
            </TabsContent>

            <TabsContent value="ai" className="m-0">
              <AIAssistTab
                onGenerateSteps={onGenerateSteps}
                onImproveDescription={onImproveDescription}
              />
            </TabsContent>

            <TabsContent value="history" className="m-0">
              <HistoryTab
                entries={historyEntries}
                versions={versions}
              />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
