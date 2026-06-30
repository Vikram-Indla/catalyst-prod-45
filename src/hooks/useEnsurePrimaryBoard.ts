// CAT-BOARDS-REDESIGN-20260701-001
// Auto-provisions a "Primary Board" for contexts that have no default board yet.
// Called from ProductBoardManagerPage and ProjectBoardManagerPage after boards load.

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateBoard } from './useBoardMutations';
import { seedBoardStatusMappings } from './workhub/useCreateKanbanFromFilter';
import { supabase } from '@/integrations/supabase/client';
import type { BoardListItem } from '@/types/board';

type BoardMode = 'project' | 'product' | 'test' | 'incident';

interface PrimaryBoardConfig {
  primaryWorkItemType: string;
  columns: Array<{ name: string; isBacklog?: boolean; isDone?: boolean }>;
}

const BOARD_CONFIG: Record<BoardMode, PrimaryBoardConfig> = {
  project: {
    primaryWorkItemType: 'Story',
    columns: [
      { name: 'In Requirements', isBacklog: true, isDone: false },
      { name: 'Ready for Dev', isBacklog: false, isDone: false },
      { name: 'In Development', isBacklog: false, isDone: false },
      { name: 'In Testing', isBacklog: false, isDone: false },
      { name: 'In UAT', isBacklog: false, isDone: false },
      { name: 'Done', isBacklog: false, isDone: true },
    ],
  },
  product: {
    primaryWorkItemType: 'Business Request',
    columns: [
      { name: 'New', isBacklog: true, isDone: false },
      { name: 'Demand Intake', isBacklog: false, isDone: false },
      { name: 'Analysis & Design', isBacklog: false, isDone: false },
      { name: 'Implementation', isBacklog: false, isDone: false },
      { name: 'Review & QA', isBacklog: false, isDone: false },
      { name: 'Done', isBacklog: false, isDone: true },
    ],
  },
  test: {
    primaryWorkItemType: 'QA Bug',
    columns: [
      { name: 'Draft', isBacklog: true, isDone: false },
      { name: 'In Review', isBacklog: false, isDone: false },
      { name: 'Approved', isBacklog: false, isDone: false },
      { name: 'Deprecated', isBacklog: false, isDone: true },
    ],
  },
  incident: {
    primaryWorkItemType: 'Production Incident',
    columns: [
      { name: 'Reported', isBacklog: true, isDone: false },
      { name: 'Under Investigation', isBacklog: false, isDone: false },
      { name: 'In Fix', isBacklog: false, isDone: false },
      { name: 'Monitoring', isBacklog: false, isDone: false },
      { name: 'Closed', isBacklog: false, isDone: true },
    ],
  },
};

interface UseEnsurePrimaryBoardArgs {
  projectId: string | undefined;
  projectKey: string | undefined;
  boards: BoardListItem[];
  isLoading: boolean;
  mode: BoardMode;
}

export function useEnsurePrimaryBoard({
  projectId,
  projectKey,
  boards,
  isLoading,
  mode,
}: UseEnsurePrimaryBoardArgs) {
  const createBoard = useCreateBoard();
  const qc = useQueryClient();
  const provisioning = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!projectId) return;
    if (provisioning.current) return;
    if (boards.some(b => b.isDefault)) return;

    provisioning.current = true;
    const config = BOARD_CONFIG[mode];

    createBoard.mutateAsync({
      name: 'Primary Board',
      projectId,
      boardType: 'kanban',
      visibility: 'project',
      isDefault: true,
      primaryWorkItemType: config.primaryWorkItemType,
      columns: config.columns,
    }).then(async (result) => {
      if (result.boardId && projectKey) {
        await seedBoardStatusMappings(result.boardId, projectKey, supabase);
      }
      qc.invalidateQueries({ queryKey: ['boards', projectId] });
    }).catch((err) => {
      console.error('[useEnsurePrimaryBoard] failed to provision Primary Board:', err);
    }).finally(() => {
      provisioning.current = false;
    });
  }, [isLoading, projectId, boards, mode]);
}
