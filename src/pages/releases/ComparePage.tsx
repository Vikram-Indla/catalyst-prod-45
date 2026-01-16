/**
 * Release Compare Page
 * Route: /releases/compare
 */

import React, { useMemo } from 'react';
import { ReleaseCompare, ComparedRelease, ReleaseOption, CompareHealthLevel } from '@/features/release-compare';

// Mock data for releases - in production this would come from API
const mockReleases: ComparedRelease[] = [
  {
    id: 'rel-26-01-01',
    version: 'REL-26.01.01',
    name: 'Investment Portal Q1',
    status: 'in_progress',
    targetDate: '2026-01-22',
    daysRemaining: 10,
    metrics: {
      healthScore: 72,
      healthLevel: 'at_risk',
      healthTrend: { value: 3, direction: 'down' },
      testProgress: { executed: 130, total: 156, percentage: 83 },
      passRate: { passed: 169, executed: 186, percentage: 91 },
      testBreakdown: { passed: 169, failed: 12, blocked: 5, notRun: 37 },
      defects: { blocker: 1, critical: 2, major: 4, minor: 3, total: 10 },
      qualityGates: { passing: 4, failing: 2, pending: 0, total: 6 },
      workItems: { total: 24, complete: 18, inProgress: 4 },
    },
  },
  {
    id: 'rel-26-02-01',
    version: 'REL-26.02.01',
    name: 'Licensing Module v2',
    status: 'in_progress',
    targetDate: '2026-02-15',
    daysRemaining: 30,
    metrics: {
      healthScore: 45,
      healthLevel: 'critical',
      healthTrend: { value: 8, direction: 'down' },
      testProgress: { executed: 38, total: 84, percentage: 45 },
      passRate: { passed: 52, executed: 67, percentage: 78 },
      testBreakdown: { passed: 52, failed: 10, blocked: 5, notRun: 46 },
      defects: { blocker: 3, critical: 4, major: 6, minor: 2, total: 15 },
      qualityGates: { passing: 2, failing: 3, pending: 1, total: 6 },
      workItems: { total: 18, complete: 8, inProgress: 6 },
    },
  },
  {
    id: 'rel-26-01-02',
    version: 'REL-26.01.02',
    name: 'Security Patch',
    status: 'testing',
    targetDate: '2026-01-19',
    daysRemaining: 7,
    metrics: {
      healthScore: 94,
      healthLevel: 'healthy',
      healthTrend: { value: 2, direction: 'up' },
      testProgress: { executed: 45, total: 48, percentage: 94 },
      passRate: { passed: 44, executed: 45, percentage: 98 },
      testBreakdown: { passed: 44, failed: 1, blocked: 0, notRun: 3 },
      defects: { blocker: 0, critical: 0, major: 1, minor: 1, total: 2 },
      qualityGates: { passing: 6, failing: 0, pending: 0, total: 6 },
      workItems: { total: 6, complete: 6, inProgress: 0 },
    },
  },
  {
    id: 'rel-26-03-01',
    version: 'REL-26.03.01',
    name: 'Mobile App Update',
    status: 'planning',
    targetDate: '2026-03-15',
    daysRemaining: 58,
    metrics: {
      healthScore: 85,
      healthLevel: 'healthy',
      healthTrend: { value: 0, direction: 'flat' },
      testProgress: { executed: 0, total: 120, percentage: 0 },
      passRate: { passed: 0, executed: 0, percentage: 0 },
      testBreakdown: { passed: 0, failed: 0, blocked: 0, notRun: 120 },
      defects: { blocker: 0, critical: 0, major: 0, minor: 0, total: 0 },
      qualityGates: { passing: 2, failing: 0, pending: 4, total: 6 },
      workItems: { total: 32, complete: 0, inProgress: 5 },
    },
  },
  {
    id: 'rel-25-12-01',
    version: 'REL-25.12.01',
    name: 'Year-End Release',
    status: 'released',
    targetDate: '2025-12-20',
    daysRemaining: 0,
    metrics: {
      healthScore: 98,
      healthLevel: 'healthy',
      healthTrend: { value: 0, direction: 'flat' },
      testProgress: { executed: 200, total: 200, percentage: 100 },
      passRate: { passed: 198, executed: 200, percentage: 99 },
      testBreakdown: { passed: 198, failed: 2, blocked: 0, notRun: 0 },
      defects: { blocker: 0, critical: 0, major: 0, minor: 2, total: 2 },
      qualityGates: { passing: 6, failing: 0, pending: 0, total: 6 },
      workItems: { total: 45, complete: 45, inProgress: 0 },
    },
  },
];

export default function ComparePage() {
  const availableReleases: ReleaseOption[] = useMemo(() => 
    mockReleases.map(r => ({
      id: r.id,
      version: r.version,
      name: r.name,
    })),
    []
  );
  
  return (
    <div className="h-full overflow-auto bg-slate-50">
      <ReleaseCompare
        availableReleases={availableReleases}
        releases={mockReleases}
      />
    </div>
  );
}
