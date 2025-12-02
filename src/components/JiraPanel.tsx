import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PanelHeader } from './jira-panel/PanelHeader';
import { CasesTab } from './jira-panel/CasesTab';
import { CyclesTab } from './jira-panel/CyclesTab';
import { useJiraPanelState } from '@/hooks/useJiraPanelState';
import { cn } from '@/lib/utils';

interface JiraPanelProps {
  workItemId: string;
  workItemType: 'story' | 'feature' | 'defect' | 'epic';
}

export function JiraPanel({ workItemId, workItemType }: JiraPanelProps) {
  const { state, setActiveTab, collapsePanel } = useJiraPanelState();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (!state.isOpen) return null;

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent('jira-panel-refresh'));
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleCreateCase = () => {
    // TODO: Open create case modal
    console.log('Create case');
  };

  const handleLinkCases = () => {
    // TODO: Open link cases modal
    console.log('Link cases');
  };

  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-full bg-background border-l shadow-xl z-50',
        'transition-all duration-300 ease-in-out'
      )}
      style={{ width: state.width }}
    >
      <div className="flex flex-col h-full">
        <PanelHeader
          onRefresh={handleRefresh}
          onCollapse={collapsePanel}
          onClose={collapsePanel}
          onSettingsClick={() => setShowSettings(true)}
          isRefreshing={isRefreshing}
        />

        <Tabs
          value={state.activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
          className="flex-1 flex flex-col"
        >
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="cases"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#c69c6d] data-[state=active]:shadow-none"
            >
              Cases
            </TabsTrigger>
            <TabsTrigger
              value="cycles"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#c69c6d] data-[state=active]:shadow-none"
            >
              Cycles
            </TabsTrigger>
            {workItemType === 'defect' && (
              <TabsTrigger
                value="executions"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#c69c6d] data-[state=active]:shadow-none"
              >
                Executions
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="cases" className="flex-1 m-0">
            <CasesTab
              workItemId={workItemId}
              onCreateCase={handleCreateCase}
              onLinkCases={handleLinkCases}
            />
          </TabsContent>

          <TabsContent value="cycles" className="flex-1 m-0">
            <CyclesTab workItemId={workItemId} />
          </TabsContent>

          {workItemType === 'defect' && (
            <TabsContent value="executions" className="flex-1 m-0">
              <div className="p-4 text-center text-muted-foreground">
                Executions tab - Coming soon
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
