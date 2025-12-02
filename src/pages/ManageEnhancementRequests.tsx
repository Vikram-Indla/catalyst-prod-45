// ==============================================
// MANAGE ENHANCEMENT REQUESTS PAGE
// Full-page Kanban view per Jira Align screenshots
// Reference: Ideation_4-12 screenshots
// ==============================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Star, ThumbsUp, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useUpdateIdea, useIdeaGroups, useIdeas } from '@/hooks/useIdeation';
import { toast } from 'sonner';
import type { Idea, IdeaStatus } from '@/types/ideation';
import { IdeaDetailPanel } from '@/components/ideation/IdeaDetailPanel';

// Columns per Jira Align spec - 4 visible columns
const COLUMNS: { id: IdeaStatus; title: string }[] = [
  { id: 'New', title: 'New' },
  { id: 'Open', title: 'Open' },
  { id: 'Planned', title: 'Planned' },
  { id: 'Completed', title: 'Completed' },
];

export default function ManageEnhancementRequests() {
  const navigate = useNavigate();
  const updateIdea = useUpdateIdea();
  const { data: groups = [] } = useIdeaGroups();
  
  // Filter state
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  // Detail panel state
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // Fetch ideas for selected group
  const { data: ideas = [] } = useIdeas(selectedGroup === 'all' ? null : selectedGroup);

  // Filter ideas based on sidebar selections
  const filteredIdeas = useMemo(() => {
    let result = [...ideas];
    
    if (selectedProduct !== 'all') {
      result = result.filter(idea => idea.product_id === selectedProduct);
    }
    
    return result;
  }, [ideas, selectedProduct]);

  // Group ideas by status
  const columnIdeas = useMemo(() => {
    const grouped: Record<IdeaStatus, Idea[]> = {
      New: [],
      Open: [],
      Planned: [],
      Completed: [],
      Shelved: [],
    };
    filteredIdeas.forEach((idea) => {
      if (grouped[idea.status]) {
        grouped[idea.status].push(idea);
      }
    });
    return grouped;
  }, [filteredIdeas]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as IdeaStatus;

    try {
      await updateIdea.mutateAsync({
        id: draggableId,
        status: newStatus,
      });
      toast.success(`Moved to ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleIdeaClick = (idea: Idea) => {
    setSelectedIdea(idea);
    setDetailPanelOpen(true);
  };

  // Convert handlers - navigate to create pages with pre-filled data
  const handleConvertToEpic = (idea: Idea) => {
    // Store idea data for pre-fill and navigate to epics
    sessionStorage.setItem('convertingIdea', JSON.stringify({
      title: idea.title,
      description: idea.description,
      ideaId: idea.id
    }));
    navigate('/items/epics?action=create');
    toast.success(`Converting "${idea.title}" to Epic`);
  };

  const handleConvertToFeature = (idea: Idea) => {
    sessionStorage.setItem('convertingIdea', JSON.stringify({
      title: idea.title,
      description: idea.description,
      ideaId: idea.id
    }));
    navigate('/items/features?action=create');
    toast.success(`Converting "${idea.title}" to Feature`);
  };

  const handleConvertToStory = (idea: Idea) => {
    sessionStorage.setItem('convertingIdea', JSON.stringify({
      title: idea.title,
      description: idea.description,
      ideaId: idea.id
    }));
    navigate('/stories?action=create');
    toast.success(`Converting "${idea.title}" to Story`);
  };

  const handleMapToFeature = (idea: Idea) => {
    toast.info(`Map to Feature functionality coming soon`);
  };

  // Generate display ID for card
  const getDisplayId = (idea: Idea) => {
    const prefix = idea.idea_group?.name?.substring(0, 2).toUpperCase() || 'ER';
    return `${prefix}-${idea.id.substring(0, 8).toUpperCase()}`;
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Page Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/items/ideation')}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          Manage Enhancement Requests
        </h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Filters */}
        <div className="w-64 flex-shrink-0 border-r border-border bg-background p-4 space-y-6">
          {/* Group Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Group:</label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-full bg-background border-border">
                <SelectValue placeholder="Select one" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Product:</label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-full bg-background border-border">
                <SelectValue placeholder="Select one" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Select one</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Type:</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full bg-background border-border">
                <SelectValue placeholder="Select one" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Select one</SelectItem>
                <SelectItem value="Enhancement">Enhancement</SelectItem>
                <SelectItem value="Question">Question</SelectItem>
                <SelectItem value="Ticket">Ticket</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto bg-muted/30">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex h-full">
              {COLUMNS.map((column) => (
                <div key={column.id} className="flex-1 min-w-[220px] flex flex-col border-r border-border last:border-r-0">
                  {/* Column Header - Brand gold color */}
                  <div className="bg-brand-gold text-white px-4 py-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{column.title}</span>
                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {columnIdeas[column.id].length}
                    </span>
                  </div>

                  {/* Column Content */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'flex-1 overflow-y-auto bg-background',
                          snapshot.isDraggingOver && 'bg-muted/50'
                        )}
                      >
                        {columnIdeas[column.id].map((idea, index) => (
                          <Draggable key={idea.id} draggableId={idea.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  'border-b border-border bg-background hover:bg-muted/30 transition-colors',
                                  snapshot.isDragging && 'shadow-lg'
                                )}
                              >
                                {/* Card Row - matches screenshot exactly */}
                                <div className="p-3">
                                  {/* Top row: rank, ID, vote icons, menu */}
                                  <div className="flex items-center gap-2 mb-1">
                                    {/* Rank number */}
                                    <span className="text-sm text-muted-foreground font-medium w-4">
                                      {index + 1}
                                    </span>
                                    
                                    {/* ID Link - clickable */}
                                    <button
                                      onClick={() => handleIdeaClick(idea)}
                                      className="text-sm text-brand-gold hover:underline font-medium truncate flex-1 text-left"
                                    >
                                      {getDisplayId(idea)}
                                    </button>
                                    
                                    {/* Star icon */}
                                    <Star className="h-4 w-4 text-muted-foreground" />
                                    
                                    {/* Vote count with thumbs up */}
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <ThumbsUp className="h-3.5 w-3.5" />
                                      <span className="text-xs">{idea.vote_score}</span>
                                    </div>
                                    
                                    {/* Context menu */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 flex-shrink-0"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48 bg-background border-border">
                                        {/* Convert options per screenshot - adapted for Catalyst */}
                                        <DropdownMenuItem onClick={() => handleConvertToEpic(idea)}>
                                          Convert to Epic
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleConvertToFeature(idea)}>
                                          Convert to Feature
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleConvertToStory(idea)}>
                                          Convert to Story
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleMapToFeature(idea)}>
                                          Map to Feature
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleIdeaClick(idea)}>
                                          More..
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  
                                  {/* Description row */}
                                  <p className="text-sm text-muted-foreground pl-6 line-clamp-2">
                                    {idea.title}
                                  </p>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>
      </div>

      {/* Detail Panel */}
      <IdeaDetailPanel
        idea={selectedIdea}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        isSubscribed={false}
        onToggleSubscribe={() => {}}
        userId=""
      />
    </div>
  );
}