/**
 * Types for Add Test Cases to Cycle Dialog
 */

import { TMTestCase, TMFolder, TMCasePriority, TMCaseType } from '@/types/test-management';

export interface TestCaseFilters {
  search: string;
  folders: string[];
  types: string[];
  priorities: string[];
  statuses: string[];
  labels: string[];
  isAutomated: boolean | null;
}

export interface FolderNode {
  folder: TMFolder;
  testCases: TMTestCase[];
  children: FolderNode[];
  totalCount: number;
  selectableCount: number;
}

export interface SelectionStats {
  count: number;
  estimatedTime: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byFolder: Record<string, number>;
}

export interface UseTestCaseSelectionReturn {
  selectedIds: Set<string>;
  selectedTestCases: TMTestCase[];
  toggle: (id: string) => void;
  select: (id: string) => void;
  deselect: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  deselectMultiple: (ids: string[]) => void;
  selectAll: (ids: string[]) => void;
  selectFolder: (folderId: string, testCases: TMTestCase[]) => void;
  clear: () => void;
  count: number;
  estimatedTime: number;
  priorityBreakdown: SelectionStats['byPriority'];
  isSelected: (id: string) => boolean;
  isAlreadyInCycle: (id: string) => boolean;
}

export interface AddTestCasesToCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  cycleName: string;
  projectId: string;
  existingTestCaseIds: string[];
  onAdd: (testCaseIds: string[]) => Promise<void>;
}
