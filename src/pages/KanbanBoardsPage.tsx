import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKanbanBoards } from '@/hooks/useKanbanBoards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, MoreVertical, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateBoardDialog } from '@/components/kanban/CreateBoardDialog';
import { formatDistanceToNow } from 'date-fns';

export default function KanbanBoardsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  
  const { data: boards = [], isLoading } = useKanbanBoards();

  const filteredBoards = boards.filter(board => {
    const matchesSearch = board.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = teamFilter === 'all' || board.team_id === teamFilter;
    return matchesSearch && matchesTeam;
  });

  const handleLaunchBoard = (boardId: string) => {
    navigate(`/kanban-boards/${boardId}`);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Kanban Boards</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and visualize work across teams
            </p>
          </div>
          <Button
            onClick={() => setCreateBoardOpen(true)}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Board
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search boards by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {/* TODO: Load teams dynamically */}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Boards Grid */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading boards...</div>
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-muted-foreground mb-4">
              {searchQuery || teamFilter !== 'all'
                ? 'No boards match your filters'
                : 'No Kanban boards yet'}
            </div>
            <Button
              onClick={() => setCreateBoardOpen(true)}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBoards.map((board) => (
              <Card key={board.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-foreground line-clamp-1">
                      {board.title}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleLaunchBoard(board.id)}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Launch Board
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {board.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {board.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    {board.team_id && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Team:</span>
                        <Badge variant="secondary" className="text-xs">
                          {board.team_id}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Cards: 0</span>
                      <span>Updated {formatDistanceToNow(new Date(board.updated_at), { addSuffix: true })}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleLaunchBoard(board.id)}
                      className="flex-1 bg-brand-gold hover:bg-brand-gold-hover text-white text-sm"
                      size="sm"
                    >
                      Launch
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Board Dialog */}
      <CreateBoardDialog
        open={createBoardOpen}
        onOpenChange={setCreateBoardOpen}
      />
    </div>
  );
}
