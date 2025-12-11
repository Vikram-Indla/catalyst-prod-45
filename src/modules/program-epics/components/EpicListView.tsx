/**
 * Program Epic List View
 * Jira-style list view for epics in Program Room, replicating work-hub ListView structure.
 * Uses canonical EpicDetailsPanel drawer when clicking an epic.
 */
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, ChevronRight, ChevronDown, 
  MessageSquare, Minus, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
  Settings2, GripVertical, Plus, MoreHorizontal, Square
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';

interface Epic {
  id: string;
  name: string;
  epic_key: string | null;
  description: string | null;
  state: string | null;
  status: string | null;
  health: string | null;
  owner_id: string | null;
  primary_program_id: string | null;
  theme_id: string | null;
  points_estimate: number | null;
  created_at: string | null;
  updated_at: string | null;
  start_date: string | null;
  end_date: string | null;
}

// State styles
const stateStyles: Record<string, { bg: string; text: string; label: string }> = {
  'not_started': { bg: 'bg-slate-100', text: 'text-slate-700', label: 'NOT STARTED' },
  'in_progress': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'IN PROGRESS' },
  'done': { bg: 'bg-green-100', text: 'text-green-800', label: 'DONE' },
  'blocked': { bg: 'bg-red-100', text: 'text-red-700', label: 'BLOCKED' },
  'cancelled': { bg: 'bg-slate-100', text: 'text-slate-500', label: 'CANCELLED' },
};

const stateOptions = ['not_started', 'in_progress', 'done', 'blocked', 'cancelled'];

// Health styles
const healthStyles: Record<string, { bg: string; text: string }> = {
  'green': { bg: 'bg-green-500', text: 'text-white' },
  'yellow': { bg: 'bg-amber-500', text: 'text-white' },
  'red': { bg: 'bg-red-500', text: 'text-white' },
};

type SortField = string;
type SortDirection = 'asc' | 'desc';

// Status lozenge
function StateLozenge({ state, onStateChange }: { state: string | null; onStateChange: (state: string) => void }) {
  const style = stateStyles[state || 'not_started'] || stateStyles['not_started'];
  
  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-1 rounded">
          <span className={cn(
            "inline-flex items-center px-3 py-0.5 rounded-full text-[11px] leading-4 font-semibold uppercase cursor-pointer whitespace-nowrap",
            style.bg, style.text
          )}>
            {style.label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1 bg-white border border-slate-200 shadow-lg" align="start">
        <div className="flex flex-col">
          {stateOptions.map((opt) => {
            const optStyle = stateStyles[opt] || stateStyles['not_started'];
            return (
              <button
                key={opt}
                className={cn(
                  "text-left px-2 py-1.5 text-sm rounded hover:bg-slate-50 transition-colors",
                  state === opt && "bg-blue-50"
                )}
                onClick={() => onStateChange(opt)}
              >
                <span className={cn(
                  "inline-flex items-center px-3 py-0.5 rounded-full text-[11px] leading-4 font-semibold uppercase",
                  optStyle.bg, optStyle.text
                )}>
                  {optStyle.label}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Health dot
function HealthDot({ health }: { health: string | null }) {
  const style = healthStyles[health || 'green'] || healthStyles['green'];
  return (
    <span className={cn("inline-block w-3 h-3 rounded-full", style.bg)} title={health || 'green'} />
  );
}

interface EpicListViewProps {
  programId?: string;
}

export function EpicListView({ programId }: EpicListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [selectedEpic, setSelectedEpic] = useState<Epic | null>(null);
  const queryClient = useQueryClient();

  // Fetch epics - show all if programId is actually a portfolio or doesn't exist in programs
  const { data: epics = [], refetch } = useQuery({
    queryKey: ['program-epics', programId],
    queryFn: async () => {
      // Check if programId is a valid program
      if (programId) {
        const { data: programCheck } = await supabase
          .from('programs')
          .select('id')
          .eq('id', programId)
          .maybeSingle();
        
        if (programCheck) {
          // Valid program - filter by primary_program_id
          const { data, error } = await supabase
            .from('epics')
            .select('*')
            .is('deleted_at', null)
            .is('parked_at', null)
            .eq('primary_program_id', programId)
            .order('global_rank');
          if (error) throw error;
          return (data || []) as Epic[];
        }
      }
      
      // No valid program filter - show all epics
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .is('deleted_at', null)
        .is('parked_at', null)
        .order('global_rank');
      if (error) throw error;
      return (data || []) as Epic[];
    },
  });

  // Update state mutation
  const updateStateMutation = useMutation({
    mutationFn: async ({ epicId, state }: { epicId: string; state: string }) => {
      const { error } = await supabase
        .from('epics')
        .update({ state: state as any, updated_at: new Date().toISOString() })
        .eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-epics'] });
      toast.success('State updated');
    },
    onError: () => {
      toast.error('Failed to update state');
    }
  });

  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(epics.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    toast.success(`Epic reordered`);
  };

  const handleRowClick = (epic: Epic) => {
    setSelectedEpic(epic);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const filteredItems = epics.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.epic_key || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedItems = sortField 
    ? [...filteredItems].sort((a, b) => {
        const aValue = (a as any)[sortField];
        const bValue = (b as any)[sortField];
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        if (typeof aValue === 'object' || typeof bValue === 'object') return 0;
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      })
    : filteredItems;

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-500', 'bg-teal-600', 'bg-pink-500', 'bg-indigo-500'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  // Table header cell component
  const TableHeader = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th 
      scope="col"
      className={cn(
        "px-3 py-2 text-left text-[12px] leading-4 font-medium text-slate-500 bg-slate-50 border-b border-r border-slate-200 last:border-r-0 whitespace-nowrap",
        className
      )}
    >
      {children}
    </th>
  );

  // Table cell component
  const TableCell = ({ children, className, onClick }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <td 
      className={cn(
        "px-3 py-2.5 text-[14px] leading-5 text-slate-900 border-b border-r border-slate-200 last:border-r-0",
        className
      )}
      onClick={onClick}
    >
      {children}
    </td>
  );

  return (
    <div className="h-full flex bg-white" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif" }}>
      {/* Main content area */}
      <div className={cn("flex-1 flex flex-col min-w-0", selectedEpic && "border-r border-slate-200")}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search epics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 w-44 text-[14px] bg-slate-50 border-transparent rounded focus:border-brand-gold focus:bg-white placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-50">
              <Settings2 className="h-4 w-4 text-slate-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-50">
              <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* Card container wrapping the table */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden">
            {/* Table container with horizontal scroll */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse" style={{ minWidth: '900px' }}>
                <thead className="sticky top-0 z-10">
                  <tr>
                    {/* Checkbox column */}
                    <th scope="col" className="w-10 px-2 py-2 bg-slate-50 border-b border-r border-slate-200 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={selectedItems.size === epics.length && epics.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="rounded border-slate-300 data-[state=checked]:bg-brand-gold data-[state=checked]:border-brand-gold focus:ring-0 focus:ring-offset-0"
                        />
                      </div>
                    </th>
                    <TableHeader className="w-24">Key</TableHeader>
                    <TableHeader className="min-w-[280px]">Name</TableHeader>
                    <TableHeader className="w-36">State</TableHeader>
                    <TableHeader className="w-20">Health</TableHeader>
                    <TableHeader className="w-24">Estimate</TableHeader>
                    <TableHeader className="w-28">Start Date</TableHeader>
                    <TableHeader className="w-28">End Date</TableHeader>
                    <th scope="col" className="w-10 px-2 py-2 bg-slate-50 border-b border-slate-200" />
                  </tr>
                </thead>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="epics-list">
                    {(provided) => (
                      <tbody ref={provided.innerRef} {...provided.droppableProps}>
                        {sortedItems.map((epic, index) => {
                          const isHovered = hoveredRow === epic.id;
                          const isSelected = selectedItems.has(epic.id);
                          const isDetailOpen = selectedEpic?.id === epic.id;
                          
                          return (
                            <Draggable key={epic.id} draggableId={epic.id} index={index}>
                              {(provided, snapshot) => (
                                <tr
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={cn(
                                    "transition-colors cursor-pointer",
                                    isHovered && !isSelected && !isDetailOpen && "bg-slate-50",
                                    isSelected && "bg-blue-50",
                                    isDetailOpen && "bg-blue-50",
                                    snapshot.isDragging && "bg-blue-100 shadow-lg"
                                  )}
                                  onClick={() => handleRowClick(epic)}
                                  onMouseEnter={() => setHoveredRow(epic.id)}
                                  onMouseLeave={() => setHoveredRow(null)}
                                >
                                  {/* Checkbox + drag handle */}
                                  <TableCell className="w-10 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-0.5">
                                      <div
                                        {...provided.dragHandleProps}
                                        className={cn(
                                          "cursor-grab active:cursor-grabbing",
                                          !isHovered && !snapshot.isDragging && "opacity-0"
                                        )}
                                      >
                                        <GripVertical className="h-4 w-4 text-slate-400" />
                                      </div>
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => handleSelectItem(epic.id, !!checked)}
                                        className="rounded border-slate-300 data-[state=checked]:bg-brand-gold data-[state=checked]:border-brand-gold focus:ring-0 focus:ring-offset-0"
                                      />
                                    </div>
                                  </TableCell>
                                  
                                  {/* Key */}
                                  <TableCell className="w-24">
                                    <div className="flex items-center gap-1.5">
                                      <Square className="h-4 w-4 text-brand-gold" />
                                      <span className="text-brand-gold font-medium text-[13px]">
                                        {epic.epic_key || epic.id.slice(0, 8)}
                                      </span>
                                    </div>
                                  </TableCell>
                                  
                                  {/* Name */}
                                  <TableCell className="min-w-[280px]">
                                    <span className="text-slate-900">{epic.name}</span>
                                  </TableCell>
                                  
                                  {/* State */}
                                  <TableCell className="w-36" onClick={(e) => e.stopPropagation()}>
                                    <StateLozenge 
                                      state={epic.state} 
                                      onStateChange={(state) => updateStateMutation.mutate({ epicId: epic.id, state })} 
                                    />
                                  </TableCell>
                                  
                                  {/* Health */}
                                  <TableCell className="w-20">
                                    <HealthDot health={epic.health} />
                                  </TableCell>
                                  
                                  {/* Estimate */}
                                  <TableCell className="w-24">
                                    {epic.points_estimate ? `${epic.points_estimate} pts` : '—'}
                                  </TableCell>
                                  
                                  {/* Start Date */}
                                  <TableCell className="w-28 text-slate-500 text-[13px]">
                                    {formatDate(epic.start_date)}
                                  </TableCell>
                                  
                                  {/* End Date */}
                                  <TableCell className="w-28 text-slate-500 text-[13px]">
                                    {formatDate(epic.end_date)}
                                  </TableCell>
                                  
                                  {/* Actions */}
                                  <TableCell className="w-10" />
                                </tr>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </tbody>
                    )}
                  </Droppable>
                </DragDropContext>
              </table>
            </div>

            {/* Footer inside card */}
            <div className="border-t border-slate-200 flex items-center justify-between px-4 py-2 bg-white flex-shrink-0">
              <span className="text-[14px] text-slate-600">
                {selectedItems.size > 0 
                  ? `${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} selected`
                  : `Showing ${sortedItems.length} of ${epics.length} epics`
                }
              </span>
              <button className="inline-flex items-center gap-1 text-[14px] text-brand-gold hover:text-brand-gold-hover font-medium">
                <Plus className="h-4 w-4" />
                Create Epic
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Epic Details Panel */}
      {selectedEpic && (
        <EpicDetailsPanel 
          epic={selectedEpic} 
          open={true}
          onClose={() => setSelectedEpic(null)} 
        />
      )}
    </div>
  );
}

export default EpicListView;
