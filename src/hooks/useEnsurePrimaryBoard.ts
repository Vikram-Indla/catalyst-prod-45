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

// Column objects use snake_case to match what the create_board() RPC reads
// via v_col->>'is_backlog' and v_col->>'is_done'.
interface RpcColumn { name: string; is_backlog: boolean; is_done: boolean }
interface PrimaryBoardConfig {
  primaryWorkItemType: string;
  columns: RpcColumn[];
}

const BOARD_CONFIG: Record<BoardMode, PrimaryBoardConfig> = {
  project: {
    primaryWorkItemType: 'Story',
    columns: [
      { name: 'In Requirements', is_backlog: true, is_done: false },
      { name: 'Ready for Dev', is_backlog: false, is_done: false },
      { name: 'In Development', is_backlog: false, is_done: false },
      { name: 'In Testing', is_backlog: false, is_done: false },
      { name: 'In UAT', is_backlog: false, is_done: false },
      { name: 'Done', is_backlog: false, is_done: true },
    ],
  },
  product: {
    primaryWorkItemType: 'Business Request',
    columns: [
      { name: 'New', is_backlog: true, is_done: false },
      { name: 'Demand Intake', is_backlog: false, is_done: false },
      { name: 'Analysis & Design', is_backlog: false, is_done: false },
      { name: 'Implementation', is_backlog: false, is_done: false },
      { name: 'Review & QA', is_backlog: false, is_done: false },
      { name: 'Done', is_backlog: false, is_done: true },
    ],
  },
  test: {
    primaryWorkItemType: 'QA Bug',
    columns: [
      { name: 'Draft', is_backlog: true, is_done: false },
      { name: 'In Review', is_backlog: false, is_done: false },
      { name: 'Approved', is_backlog: false, is_done: false },
      { name: 'Deprecated', is_backlog: false, is_done: true },
    ],
  },
  incident: {
    primaryWorkItemType: 'Production Incident',
    columns: [
      { name: 'Reported', is_backlog: true, is_done: false },
      { name: 'Under Investigation', is_backlog: false, is_done: false },
      { name: 'In Fix', is_backlog: false, is_done: false },
      { name: 'Monitoring', is_backlog: false, is_done: false },
      { name: 'Closed', is_backlog: false, is_done: true },
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
