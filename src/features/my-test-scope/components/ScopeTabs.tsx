/**
 * Scope Tabs Navigation
 * Tab navigation for My Test Scope views
 */

import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCheck, Bug, Zap, Network, BarChart3 } from 'lucide-react';
import type { TestScopeTab } from '../types';

interface ScopeTabsProps {
  activeTab: TestScopeTab;
  onTabChange: (tab: TestScopeTab) => void;
  counts: {
    tests: number;
    defects: number;
    incidents: number;
  };
}

export function ScopeTabs({ activeTab, onTabChange, counts }: ScopeTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TestScopeTab)}>
      <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-none border-b border-border">
        <TabsTrigger value="tests" className="gap-2 data-[state=active]:bg-background">
          <FileCheck className="h-4 w-4" />
          My Tests
          <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">{counts.tests}</span>
        </TabsTrigger>
        <TabsTrigger value="defects" className="gap-2 data-[state=active]:bg-background">
          <Bug className="h-4 w-4" />
          Linked Defects
          <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">{counts.defects}</span>
        </TabsTrigger>
        <TabsTrigger value="incidents" className="gap-2 data-[state=active]:bg-background">
          <Zap className="h-4 w-4" />
          Incidents
          <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">{counts.incidents}</span>
        </TabsTrigger>
        <TabsTrigger value="traceability" className="gap-2 data-[state=active]:bg-background">
          <Network className="h-4 w-4" />
          Traceability
        </TabsTrigger>
        <TabsTrigger value="workload" className="gap-2 data-[state=active]:bg-background">
          <BarChart3 className="h-4 w-4" />
          Workload
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
