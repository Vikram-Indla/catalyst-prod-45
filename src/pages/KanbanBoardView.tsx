/**
 * KanbanBoardView — Team / Program / Portfolio board (Phase 6).
 *
 * Routes served by this page:
 *   /team/:teamId/kanban-boards/:boardId
 *   /programs/:programId/kanban-boards/:boardId
 *   /kanban-boards/:boardId
 *
 * Migrated onto the canonical KanbanBoardShell. The bespoke 5-column flex
 * grid with its custom Card rendering and static filter placeholder has
 * been replaced by `<KanbanBoardShell adapter={...}/>`, reached through
 * `buildTeamProgramBoardAdapter`.
 *
 * Architectural twist vs. Phases 3–5
 *   This board's columns are *dynamic* — defined per-board in the
 *   `kanban_columns` table. The adapter therefore accepts the live
 *   column rows (from `useKanbanColumns`) and derives its
 *   `KanbanColumnDef[]` at render time. See the adapter docstring for
 *   the `status === column_id` identity contract.
 *
 * Preserved
 *   - Back button + "Board Setup" + "Lean Analytics" controls rendered
 *     above the canonical shell in a light, breadcrumb-free header row
 *     (parity with `/project-hub/BAU/backlog` — no breadcrumb, single
 *     title). The title itself is rendered by CatalystPageHeader inside
 *     the shell.
 *   - Loading + not-found + empty-board states (empty columns = CTA to
 *     Board Setup).
 *
 * New capability
 *   - Drag-drop between columns persists via `useMoveCard`.
 *   - Jira-parity toolbar: search, avatar stack, basic filter, group-by,
 *     density, view settings — free through the shell.
 *
 * Out of scope (deferred to Phase 9 / pixel-parity polish)
 *   - Swim lanes (KanbanBoardShell doesn't declaratively model them yet).
 *   - WIP-limit badges + red header colouring on overloaded columns
 *     (legacy UX; canonical shell uses neutral column headers).
 */
import { useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  useKanbanBoard,
  useKanbanColumns,
  useKanbanCards,
  useMoveCard,
} from '@/hooks/useKanbanBoards';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { KanbanBoardShell } from '@/components/kanban/KanbanBoardShell';
import { buildTeamProgramBoardAdapter } from '@/components/kanban/adapters/teamProgramBoardAdapter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Settings, BarChart3, ChevronDown } from 'lucide-react';

export default function KanbanBoardView() {
  const { boardId, teamId, programId } = useParams<{
    boardId: string;
    teamId?: string;
    programId?: string;
  }>();
  const navigate = useNavigate();
  const avatarsByName = useProfileAvatarsByName();

  /* ═════ Route scope — drives Back + Setup + Analytics paths. ═════ */
  const basePath = teamId
    ? `/team/${teamId}/kanban-boards`
    : programId
    ? `/programs/${programId}/kanban-boards`
    : '/kanban-boards';

  /* ═════ Data. ═════ */
  const { data: board, isLoading: boardLoading } = useKanbanBoard(boardId);
  const { data: columns = [] } = useKanbanColumns(boardId);
  const { data: cards = [] } = useKanbanCards(boardId);

  /* ═════ Page-owned filter + group-by state. ═════ */
  const [search, setSearch] = useState('');
  const [selAssignees, setSelAssignees] = useState<Set<string>>(new Set());
  const [filterSelected, setFilterSelected] = useState<Record<string, string[]>>({});
  const [groupBy, setGroupBy] = useState<string>('none');

  const onFilterChange = useCallback((categoryId: string, values: string[]) => {
    setFilterSelected(prev => ({ ...prev, [categoryId]: values }));
  }, []);
  const onClearFilters = useCallback(() => {
    setFilterSelected({});
    setSelAssignees(new Set());
    setSearch('');
  }, []);

  /* ═════ Move-card mutation (drag-drop persistence). ═════ */
  const moveCard = useMoveCard();
  const onMoveCard = useCallback(
    async (cardId: string, toColumnId: string) => {
      try {
        await moveCard.mutateAsync({ card_id: cardId, to_column_id: toColumnId });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to move card');
      }
    },
    [moveCard],
  );

  /* ═════ Build adapter. ═════ */
  const adapter = useMemo(() => {
    if (!board) return null;
    return buildTeamProgramBoardAdapter({
      board,
      columns,
      cards,
      avatarsByName,
      search,
      onSearchChange: setSearch,
      selAssignees,
      onSelAssigneesChange: setSelAssignees,
      filterSelected,
      onFilterChange,
      onClearFilters,
      groupBy,
      onGroupByChange: setGroupBy,
      onMoveCard,
    });
  }, [
    board, columns, cards, avatarsByName,
    search, selAssignees, filterSelected, groupBy,
    onFilterChange, onClearFilters, onMoveCard,
  ]);

  /* ═════ Loading state. ═════ */
  if (boardLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid #2563EB', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  /* ═════ Not-found state. ═════ */
  if (!board || !adapter) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-muted-foreground">Board not found</div>
        <Button onClick={() => navigate(basePath)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Boards
        </Button>
      </div>
    );
  }

  /* ═════ Empty board (no columns configured) — CTA to Board Setup. ═════ */
  if (columns.length === 0) {
    return (
      <div className="flex flex-col h-full bg-background">
        <BoardContextBar
          basePath={basePath}
          boardId={boardId}
          onBack={() => navigate(basePath)}
          onSetup={() => navigate(`${basePath}/${boardId}/setup`)}
          onAnalytics={() => navigate(`${basePath}/${boardId}/analytics`)}
        />
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <div className="text-muted-foreground mb-4">
            No columns configured. Set up your board to get started.
          </div>
          <Button
            onClick={() => navigate(`${basePath}/${boardId}/setup`)}
            className="bg-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))] hover:bg-[var(--ds-background-brand-bold-hovered,var(--ds-background-brand-bold-hovered, #1D4ED8))] text-white"
          >
            <Settings className="w-4 h-4 mr-2" />
            Board Setup
          </Button>
        </div>
      </div>
    );
  }

  /* ═════ Canonical board. ═════ */
  return (
    <div className="flex flex-col h-full">
      <BoardContextBar
        basePath={basePath}
        boardId={boardId}
        onBack={() => navigate(basePath)}
        onSetup={() => navigate(`${basePath}/${boardId}/setup`)}
        onAnalytics={() => navigate(`${basePath}/${boardId}/analytics`)}
      />
      <div className="flex-1 min-h-0">
        <KanbanBoardShell adapter={adapter} title={board.title} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   BoardContextBar — slim back/setup/analytics row rendered above the
   canonical shell. No breadcrumb, single-level controls, matches the
   `/project-hub/BAU/backlog` visual grammar (shell's CatalystPageHeader
   owns the actual title).
   ═══════════════════════════════════════════════════════════════════════ */

interface BoardContextBarProps {
  basePath: string;
  boardId: string | undefined;
  onBack: () => void;
  onSetup: () => void;
  onAnalytics: () => void;
}

function BoardContextBar({ basePath: _basePath, boardId: _boardId, onBack, onSetup, onAnalytics }: BoardContextBarProps) {
  return (
    <div className="h-10 border-b border-border bg-background px-4 flex items-center justify-between flex-shrink-0">
      <Button variant="ghost" size="sm" onClick={onBack} className="flex-shrink-0">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Boards
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSetup}>
          <Settings className="w-4 h-4 mr-2" />
          Board Setup
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Options
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAnalytics}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Lean Analytics
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
