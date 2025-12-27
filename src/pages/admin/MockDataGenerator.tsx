/**
 * Mock Data Generator - Admin Module
 * Generate, load, and clean demo data safely
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MockDataHeader } from '@/components/admin/mock-data/MockDataHeader';
import { RunSetupSection } from '@/components/admin/mock-data/RunSetupSection';
import { ConfigurationWizard } from '@/components/admin/mock-data/ConfigurationWizard';
import { ProgressPanel } from '@/components/admin/mock-data/ProgressPanel';
import { PreviewSection } from '@/components/admin/mock-data/PreviewSection';
import { CleanupSection } from '@/components/admin/mock-data/CleanupSection';
import { RunHistorySection } from '@/components/admin/mock-data/RunHistorySection';
import { useMockDataRuns } from '@/hooks/useMockDataRuns';

export default function MockDataGenerator() {
  const [activeTab, setActiveTab] = useState('setup');
  const {
    runs,
    currentRun,
    isLoading,
    createRun,
    updateConfig,
    generatePreview,
    loadData,
    cleanup,
    selectRun,
    refreshRuns,
  } = useMockDataRuns();

  const showProgress = currentRun && ['generating', 'loading', 'cleaning', 'parsing'].includes(currentRun.status);

  return (
    <div className="min-h-screen bg-background">
      <MockDataHeader />
      
      <div className="p-6 space-y-6">
        {/* Progress Panel - Always visible when jobs run */}
        {showProgress && currentRun && (
          <ProgressPanel
            progress={currentRun.progress}
            currentStep={currentRun.current_step || ''}
            status={currentRun.status}
          />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="config" disabled={!currentRun}>Configure</TabsTrigger>
            <TabsTrigger value="preview" disabled={!currentRun || currentRun.status !== 'previewing'}>Preview</TabsTrigger>
            <TabsTrigger value="cleanup" disabled={!currentRun || currentRun.status !== 'loaded'}>Cleanup</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="mt-6">
            <RunSetupSection
              onCreateRun={async (data) => {
                await createRun(data);
                setActiveTab('config');
              }}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            {currentRun && (
              <ConfigurationWizard
                run={currentRun}
                onSaveConfig={updateConfig}
                onGeneratePreview={async () => {
                  await generatePreview();
                  setActiveTab('preview');
                }}
                isLoading={isLoading}
              />
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            {currentRun && (
              <PreviewSection
                runId={currentRun.id}
                onLoad={async () => {
                  await loadData();
                  setActiveTab('cleanup');
                }}
                isLoading={isLoading}
              />
            )}
          </TabsContent>

          <TabsContent value="cleanup" className="mt-6">
            {currentRun && (
              <CleanupSection
                run={currentRun}
                onCleanup={cleanup}
                isLoading={isLoading}
              />
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <RunHistorySection
              runs={runs}
              onSelectRun={(run) => {
                selectRun(run);
                if (run.status === 'previewing') {
                  setActiveTab('preview');
                } else if (run.status === 'loaded') {
                  setActiveTab('cleanup');
                } else {
                  setActiveTab('config');
                }
              }}
              onRefresh={refreshRuns}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
