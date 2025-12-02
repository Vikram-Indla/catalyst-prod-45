import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useKanbanBoard, useKanbanColumns, useSwimLanes } from '@/hooks/useKanbanBoards';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save } from 'lucide-react';
import { ColumnsSetupTab } from '@/components/kanban/setup/ColumnsSetupTab';
import { SwimLanesSetupTab } from '@/components/kanban/setup/SwimLanesSetupTab';
import { ManageCardsTab } from '@/components/kanban/setup/ManageCardsTab';
import { ManageUsersTab } from '@/components/kanban/setup/ManageUsersTab';

export default function KanbanBoardSetup() {
  const { boardId, teamId, programId } = useParams<{ boardId: string; teamId?: string; programId?: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('columns');

  // Determine base path based on context
  const basePath = teamId 
    ? `/team/${teamId}/kanban-boards` 
    : programId 
    ? `/programs/${programId}/kanban-boards` 
    : '/kanban-boards';

  const { data: board, isLoading } = useKanbanBoard(boardId);
  const { data: columns = [] } = useKanbanColumns(boardId);
  const { data: swimLanes = [] } = useSwimLanes(boardId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading board setup...</div>
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

  const handleExitSetup = () => {
    navigate(`${basePath}/${boardId}`);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(basePath)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Board Setup: {board.title}
              </h1>
              <p className="text-sm text-muted-foreground">Configure board settings</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExitSetup}
            >
              Exit Setup
            </Button>
            <Button
              size="sm"
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              onClick={handleExitSetup}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Setup Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="columns">Columns</TabsTrigger>
            <TabsTrigger value="swim-lanes">Swim Lanes</TabsTrigger>
            <TabsTrigger value="manage-cards">Manage Cards</TabsTrigger>
            <TabsTrigger value="manage-users">Manage Users</TabsTrigger>
          </TabsList>

          <TabsContent value="columns" className="space-y-4 mt-6">
            <ColumnsSetupTab boardId={boardId!} columns={columns} />
          </TabsContent>

          <TabsContent value="swim-lanes" className="space-y-4 mt-6">
            <SwimLanesSetupTab boardId={boardId!} swimLanes={swimLanes} />
          </TabsContent>

          <TabsContent value="manage-cards" className="space-y-4 mt-6">
            <ManageCardsTab boardId={boardId!} board={board} />
          </TabsContent>

          <TabsContent value="manage-users" className="space-y-4 mt-6">
            <ManageUsersTab boardId={boardId!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
