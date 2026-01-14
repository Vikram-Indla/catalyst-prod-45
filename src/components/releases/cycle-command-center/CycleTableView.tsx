/**
 * Table View - Comprehensive assignment table with inline editing
 */

import React from 'react';
import { AssignmentTableView } from '@/components/test-cycles/assignment-table';

interface CycleTableViewProps {
  cycleId: string;
  testCases: any[];
  isLoading: boolean;
  statusFilter: string | null;
  onStatusFilter: (status: string | null) => void;
}

export function CycleTableView({ cycleId }: CycleTableViewProps) {
  return <AssignmentTableView cycleId={cycleId} />;
}
