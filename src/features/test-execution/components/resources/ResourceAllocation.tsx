/**
 * Module 3B-4: Main resource allocation container component
 */

import React, { useState } from 'react';
import { useResourceAllocation } from '../../hooks/useResourceAllocation';
import { ResourceSummaryCards } from './ResourceSummaryCards';
import { EnvironmentList } from './EnvironmentList';
import { WorkerPoolGrid } from './WorkerPoolGrid';
import { ActiveAllocations } from './ActiveAllocations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Server, Users, Activity } from 'lucide-react';

interface ResourceAllocationProps {
  projectId: string;
}

export function ResourceAllocation({ projectId }: ResourceAllocationProps) {
  const {
    summary,
    environments,
    workerPools,
    activeAllocations,
    isLoading,
    deallocate,
  } = useResourceAllocation(projectId);

  const [selectedPoolId, setSelectedPoolId] = useState<string | undefined>();

  const handleRelease = async (runId: string) => {
    await deallocate({ runId });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <ResourceSummaryCards summary={summary ?? null} isLoading={isLoading} />

      {/* Tabbed Content */}
      <Tabs defaultValue="environments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="environments" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Environments
          </TabsTrigger>
          <TabsTrigger value="pools" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Worker Pools
          </TabsTrigger>
          <TabsTrigger value="allocations" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Active Allocations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="environments">
          <EnvironmentList
            environments={environments || []}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="pools">
          <WorkerPoolGrid
            pools={workerPools || []}
            isLoading={isLoading}
            selectedPoolId={selectedPoolId}
            onSelectPool={setSelectedPoolId}
          />
        </TabsContent>

        <TabsContent value="allocations">
          <ActiveAllocations
            allocations={activeAllocations || []}
            isLoading={isLoading}
            onRelease={handleRelease}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
