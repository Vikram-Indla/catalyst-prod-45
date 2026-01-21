// =====================================================
// RELEASE QUALITY DASHBOARD
// Main dashboard for release quality gates and readiness
// =====================================================

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  QualityGateEditor, 
  ReleaseTestSummaryPanel, 
  ReadinessStatusCard,
  ReadinessHistoryTable 
} from './quality-gates';
import { Shield, TestTube2, History, Settings } from 'lucide-react';

interface ReleaseQualityDashboardProps {
  releaseId: string;
  userId?: string;
}

export function ReleaseQualityDashboard({ releaseId, userId }: ReleaseQualityDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Top Section: Readiness + Test Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ReadinessStatusCard releaseId={releaseId} userId={userId} />
        </div>
        <div className="lg:col-span-2">
          <ReleaseTestSummaryPanel releaseId={releaseId} />
        </div>
      </div>

      {/* Tabs for Configuration and History */}
      <Tabs defaultValue="gates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gates" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Quality Gates
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Readiness History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gates">
          <QualityGateEditor releaseId={releaseId} />
        </TabsContent>

        <TabsContent value="history">
          <ReadinessHistoryTable releaseId={releaseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
