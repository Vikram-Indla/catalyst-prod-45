// ==============================================
// MANAGE BACKLOG BOARD (Kanban)
// Based on Jira Align Ideation Manage Backlog
// Reference: Screenshots Ideation_4.png - Ideation_12.png
// ==============================================

import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { MoreHorizontal, ChevronRight } from 'lucide-react';
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useUpdateIdea, useIdeaGroups } from '@/hooks/useIdeation';
import { toast } from 'sonner';
import type { Idea, IdeaStatus, IdeaCategory, TShirtSize } from '@/types/ideation';
import { T_SHIRT_SIZE_ORDER } from '@/types/ideation';

interface ManageBacklogBoardProps {
  ideas: Idea[];
  onIdeaClick: (idea: Idea) => void;
}

// Columns per Jira Align spec - includes Shelved
const COLUMNS: { id: IdeaStatus; title: string }[] = [
  { id: 'New', title: 'New' },
  { id: 'Open', title: 'Open' },
  { id: 'Planned', title: 'Planned' },
  { id: 'Completed', title: 'Completed' },
  { id: 'Shelved', title: 'Shelved' },
];

// T-Shirt sizes for submenu
const T_SHIRT_SIZES: TShirtSize[] = ['XS', 'S', 'M', 'L', 'XL'];

export function ManageBacklogBoard({ ideas, onIdeaClick }: ManageBacklogBoardProps) {
  const updateIdea = useUpdateIdea();
  const { data: groups = [] } = useIdeaGroups();
  
  // Filter state
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Get unique products from ideas (placeholder - would come from products table)
  const products = useMemo(() => {
    const productSet = new Set<string>();
    ideas.forEach(idea => {
      if (idea.product_id) productSet.add(idea.product_id);
    });
    return Array.from(productSet);
  }, [ideas]);

  // Filter ideas based on sidebar selections
  const filteredIdeas = useMemo(() => {
    let result = [...ideas];
    
    if (selectedGroup !== 'all') {
      result = result.filter(idea => idea.idea_group_id === selectedGroup);
    }
    if (selectedProduct !== 'all') {
      result = result.filter(idea => idea.product_id === selectedProduct);
    }
    // Type filter would filter by idea_group.category
    
    return result;
  }, [ideas, selectedGroup, selectedProduct, selectedType]);

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
      toast.success(`Idea moved to ${newStatus}`);
    } catch {
      toast.error('Failed to update idea status');
    }
  };

  // Status change handlers
  const handleMoveToStatus = async (idea: Idea, newStatus: IdeaStatus) => {
    try {
      await updateIdea.mutateAsync({
        id: idea.id,
        status: newStatus,
      });
      toast.success(`Moved to ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  // T-Shirt size handler
  const handleSetTShirtSize = async (idea: Idea, size: TShirtSize) => {
    try {
      await updateIdea.mutateAsync({
        id: idea.id,
        t_shirt_size: size,
      });
      toast.success(`T-Shirt size set to ${size}`);
    } catch {
      toast.error('Failed to update T-Shirt size');
    }
  };

  // Convert handlers
  const handleConvertTo = (idea: Idea, workItemType: string) => {
    toast.info(`Converting "${idea.title}" to ${workItemType}...`);
    // TODO: Implementation would open conversion dialog
  };

  const handleMapToExisting = (idea: Idea, workItemType: string) => {
    toast.info(`Mapping "${idea.title}" to existing ${workItemType}...`);
    // TODO: Implementation would open mapping dialog
  };

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[500px]">
      {/* Left Sidebar - Filters */}
      <div className="w-64 flex-shrink-0 border-r border-border bg-muted/30 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Filters</h3>
        
        {/* Group Dropdown */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Group</label>
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="All Groups" />
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
          <label className="text-xs font-medium text-muted-foreground">Product</label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products.map(productId => (
                <SelectItem key={productId} value={productId}>
                  {productId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type Dropdown */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Enhancement">Enhancement</SelectItem>
              <SelectItem value="Question">Question</SelectItem>
              <SelectItem value="Ticket">Ticket</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex h-full p-4 gap-3">
            {COLUMNS.map((column) => (
              <div key={column.id} className="flex-shrink-0 w-56 flex flex-col">
                {/* Column Header - Blue rectangular bar per Jira Align spec */}
                <div className="bg-[#0052CC] text-white px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{column.title}</span>
                  <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded">
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
                        'flex-1 bg-muted/20 border border-t-0 border-border overflow-y-auto',
                        snapshot.isDraggingOver && 'bg-muted/40'
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
                                snapshot.isDragging && 'shadow-lg bg-background'
                              )}
                            >
                              {/* Row-style card per Jira Align spec */}
                              <div className="flex items-center px-2 py-2 gap-2">
                                {/* Rank number */}
                                <span className="text-xs text-muted-foreground w-5 flex-shrink-0">
                                  {index + 1}
                                </span>
                                
                                {/* ID Link */}
                                <button
                                  onClick={() => onIdeaClick(idea)}
                                  className="text-xs text-[#0052CC] hover:underline flex-shrink-0 font-medium"
                                >
                                  {idea.id.slice(0, 8).toUpperCase()}
                                </button>
                                
                                {/* Vote score */}
                                <span className="text-xs text-muted-foreground flex-shrink-0 min-w-[24px] text-center">
                                  {idea.vote_score > 0 ? `+${idea.vote_score}` : idea.vote_score}
                                </span>
                                
                                {/* Context menu */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 flex-shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-56">
                                    {/* Move to status options */}
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <span>Move to...</span>
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent>
                                        {COLUMNS.filter(c => c.id !== idea.status).map(col => (
                                          <DropdownMenuItem
                                            key={col.id}
                                            onClick={() => handleMoveToStatus(idea, col.id)}
                                          >
                                            {col.title}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    
                                    {/* Set T-Shirt Size */}
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <span>Set T-Shirt Size</span>
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent>
                                        {T_SHIRT_SIZES.map(size => (
                                          <DropdownMenuItem
                                            key={size}
                                            onClick={() => handleSetTShirtSize(idea, size)}
                                          >
                                            {size} {idea.t_shirt_size === size && '✓'}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    
                                    <DropdownMenuSeparator />
                                    
                                    {/* Convert options per Jira Align spec */}
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <span>Convert to...</span>
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => handleConvertTo(idea, 'Initiative')}>
                                          Initiative
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleConvertTo(idea, 'Capability')}>
                                          Capability
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleConvertTo(idea, 'Feature')}>
                                          Feature
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleConvertTo(idea, 'Story')}>
                                          Story
                                        </DropdownMenuItem>
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    
                                    {/* Map to existing */}
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <span>Map to Existing...</span>
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => handleMapToExisting(idea, 'Feature')}>
                                          Feature
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleMapToExisting(idea, 'Story')}>
                                          Story
                                        </DropdownMenuItem>
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    
                                    <DropdownMenuSeparator />
                                    
                                    <DropdownMenuItem onClick={() => onIdeaClick(idea)}>
                                      View Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                
                                {/* Title - truncated */}
                                <span 
                                  className="text-xs text-foreground truncate flex-1 cursor-pointer hover:text-[#0052CC]"
                                  onClick={() => onIdeaClick(idea)}
                                >
                                  {idea.title}
                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {/* Empty state */}
                      {columnIdeas[column.id].length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          Drop ideas here
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
