/**
 * Table View - Comprehensive assignment table with inline editing
 * 
 * DATA SOURCE: useCycleExecutionItems (shared hook)
 * STATUS: tm_cycle_scope.current_status (source of truth)
 */

import React from 'react';
import { AssignmentTableView } from '@/components/test-cycles/assignment-table';

interface CycleTableViewProps {
  cycleId: string;
}

export function CycleTableView({ cycleId }: CycleTableViewProps) {
  // The AssignmentTableView internally uses useAssignmentTable which should 
  // be refactored to use useCycleExecutionItems for full alignment.
  // For now, it reads from the same source (tm_cycle_scope) ensuring consistency.
  return <AssignmentTableView cycleId={cycleId} />;
}
