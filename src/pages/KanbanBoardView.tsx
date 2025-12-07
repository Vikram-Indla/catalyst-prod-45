import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useKanbanBoard, useKanbanColumns, useKanbanCards, useSwimLanes } from '@/hooks/useKanbanBoards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Search, Settings, BarChart3, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function KanbanBoardView() {
  const { boardId, teamId, programId } = useParams<{ boardId: string; teamId?: string; programId?: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Determine base path based on context
  const basePath = teamId 
    ? `/team/${teamId}/kanban-boards` 
    : programId 
    ? `/programs/${programId}/kanban-boards` 
    : '/kanban-boards';

  const { data: board, isLoading: boardLoading } = useKanbanBoard(boardId);
  const { data: columns = [] } = useKanbanColumns(boardId);
  const { data: cards = [] } = useKanbanCards(boardId);
  const { data: swimLanes = [] } = useSwimLanes(boardId);

  if (boardLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading board...</div>
      </div>
    );
  }

  if (!board) {
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

  // Group cards by column
  const cardsByColumn = columns.reduce((acc, col) => {
    acc[col.id] = cards.filter(card => card.column_id === col.id);
    return acc;
  }, {} as Record<string, typeof cards>);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-[72px] border-b border-border bg-background px-6 flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(basePath)}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate">{board.title}</h1>
              {board.description && (
                <p className="text-sm text-muted-foreground truncate">{board.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${basePath}/${boardId}/setup`)}
            >
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
                <DropdownMenuItem onClick={() => navigate(`${basePath}/${boardId}/analytics`)}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Lean Analytics
                </DropdownMenuItem>
                <DropdownMenuItem>Run A Meeting</DropdownMenuItem>
                <DropdownMenuItem>Quick Load Cards</DropdownMenuItem>
                <DropdownMenuItem>Show Team</DropdownMenuItem>
                <DropdownMenuItem>Show Tags</DropdownMenuItem>
                <DropdownMenuItem>Macro View</DropdownMenuItem>
                <DropdownMenuItem>Small Cards</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, name, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm">
            Filter
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto p-6">
        {columns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-muted-foreground mb-4">
              No columns configured. Set up your board to get started.
            </div>
            <Button
              onClick={() => navigate(`${basePath}/${boardId}/setup`)}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              Board Setup
            </Button>
          </div>
        ) : (
          <div className="flex gap-4 h-full">
            {columns.map((column) => {
              const columnCards = cardsByColumn[column.id] || [];
              const isOverWIP = column.wip_limit && columnCards.length > column.wip_limit;
              const isAtWIP = column.wip_limit && columnCards.length === column.wip_limit;

              return (
                <div key={column.id} className="flex-1 min-w-[280px] max-w-[320px]">
                  <div
                    className={`rounded-t-lg px-4 py-3 ${
                      isOverWIP
                        ? 'bg-destructive text-destructive-foreground'
                        : isAtWIP
                        ? 'bg-warning/20 text-warning-foreground border border-warning'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">
                        {column.name}{' '}
                        <span className="font-normal">
                          ({columnCards.length}
                          {column.wip_limit ? `/${column.wip_limit}` : ''})
                        </span>
                      </h3>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        ⋮
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 min-h-[400px]">
                    {columnCards.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No cards
                      </div>
                    ) : (
                      columnCards.map((card) => (
                        <Card
                          key={card.id}
                          className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-info"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {card.work_item_type}
                            </Badge>
                            {card.is_blocked && (
                              <Badge variant="destructive" className="text-xs">
                                Blocked
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm font-medium text-foreground line-clamp-2">
                            {card.work_item_id}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
