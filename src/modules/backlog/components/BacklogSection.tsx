import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { BacklogPISection, BacklogItem } from '../types';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, GripVertical, ChevronLeft, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { QuickAddRow } from './QuickAddRow';
import { BacklogContextMenu } from './BacklogContextMenu';
import { useBacklogActions } from '../hooks/useBacklogActions';
import { useBacklogState } from '../hooks/useBacklogState';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BacklogSectionProps {
  section: BacklogPISection;
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
}

// Pagination settings
const ITEMS_PER_PAGE = 10;

export function BacklogSection({
  section,
  selectedItems,
  onItemClick,
  onItemSelect,
}: BacklogSectionProps) {
  const [isExpanded, setIsExpanded] = useState(section.isExpanded);
  const [currentPage, setCurrentPage] = useState(1);
  const { columnsShown, isEpicBacklog, programId } = useBacklogState();

  // Fetch program key for epic numbering
  const { data: programData } = useQuery({
    queryKey: ['program-key', programId],
    queryFn: async () => {
      if (!programId) return null;
      const { data, error } = await supabase
        .from('programs')
        .select('key, name')
        .eq('id', programId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!programId && isEpicBacklog,
  });

  // Pagination calculations
  const totalItems = section.items.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedItems = section.items.slice(startIndex, endIndex);

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Section Content - No header row with "All Items" */}
      <div>
        {/* Column Headers - Light gold background with title case */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-brand-gold/10 border-b border-brand-gold/30 text-xs font-semibold text-foreground capitalize tracking-wide">
          {/* Drag handle column - LEFTMOST */}
          <div className="w-8" />
          
          {/* Checkbox column - BEFORE chevron */}
          <div className="w-5" />
          
          {/* Expand chevron column */}
          <div className="w-6" />
          
          {/* Key */}
          <div className="min-w-[100px]">Key</div>
          
          {/* Summary */}
          <div className="flex-1 min-w-[200px]">Summary</div>
          
          {/* Theme */}
          <div className="min-w-[120px]">Theme</div>
          
          {/* Quarters */}
          <div className="min-w-[100px]">Quarters</div>
          
          {/* MVP */}
          <div className="min-w-[50px] text-center">Mvp</div>
          
          {/* Status */}
          <div className="min-w-[100px]">Status</div>
          
          {/* Technical Score */}
          <div className="min-w-[80px] text-right">Score</div>
        </div>
        
        <Droppable droppableId={section.id}>
          {(provided) => (
            <div 
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="divide-y"
            >
              {section.items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground border-2 border-dashed border-muted mx-4 my-4 rounded">
                  Drag & Drop Items Here
                </div>
              ) : (
                paginatedItems.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={startIndex + index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        <BacklogItemRow
                          item={item}
                          rank={startIndex + index + 1}
                          isSelected={selectedItems.includes(item.id)}
                          onItemClick={onItemClick}
                          onItemSelect={onItemSelect}
                          dragHandleProps={provided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                          columnsShown={columnsShown}
                          programKey={programData?.key || null}
                        />
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* Quick Add Row - Always at the bottom */}
        <QuickAddRow itemType={isEpicBacklog ? 'epic' : 'epic'} />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{endIndex} of {totalItems} epics
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  // Show first pages, current page area, or last pages
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface BacklogItemRowProps {
  item: BacklogItem;
  rank: number;
  isSelected: boolean;
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
  columnsShown: string[];
  programKey?: string | null;
}

function BacklogItemRow({
  item,
  rank,
  isSelected,
  onItemClick,
  onItemSelect,
  dragHandleProps,
  isDragging,
  columnsShown,
  programKey,
}: BacklogItemRowProps) {
  const [isRowExpanded, setIsRowExpanded] = useState(false);
  const { type, isEpicBacklog } = useBacklogState();
  const actions = useBacklogActions(type);

  // Fetch linked features when row is expanded
  const { data: linkedFeatures, isLoading: isFeaturesLoading } = useQuery({
    queryKey: ['epic-linked-features', item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, state, estimate_points, feature_key')
        .eq('epic_id', item.id)
        .is('deleted_at', null)
        .order('global_rank', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isRowExpanded && type === 'epic',
  });


  // Format quarters for display
  const formatQuarters = (quarters?: string[]) => {
    if (!quarters || quarters.length === 0) return '—';
    return quarters.slice(0, 2).map((q, i) => (
      <Badge 
        key={i} 
        variant="outline" 
        className="text-[10px] px-1.5 py-0 h-5 border-brand-gold/50 text-brand-gold"
      >
        {q}
      </Badge>
    ));
  };

  // Format status for human-readable display
  const formatStatus = (status?: string) => {
    if (!status) return '—';
    return status.replace(/_/g, ' ').toLowerCase();
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRowExpanded(!isRowExpanded);
  };

  return (
    <BacklogContextMenu
      itemId={item.id}
      onOpen={() => onItemClick(item.id)}
      onDuplicate={() => actions.duplicate(item.id)}
      onMoveToTop={() => actions.moveToTop(item.id)}
      onMoveToBottom={() => actions.moveToBottom(item.id)}
      onMoveToPI={(piId) => actions.moveToPI(item.id, piId)}
      onDelete={() => actions.deleteItem(item.id)}
      onPark={() => actions.park(item.id)}
      availablePIs={isEpicBacklog ? [] : actions.availablePIs}
    >
      <div>
        {/* Main Epic Row */}
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors',
            isSelected && 'bg-muted',
            isDragging && 'opacity-50 bg-muted'
          )}
          onClick={() => onItemClick(item.id)}
        >
          {/* Drag handle - LEFTMOST */}
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing w-8">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Checkbox - BEFORE chevron */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onItemSelect(item.id, checked as boolean)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4"
          />

          {/* Expand chevron - clickable to expand features */}
          <button 
            onClick={handleExpandClick}
            className="w-6 flex items-center justify-center hover:bg-muted rounded"
          >
            {isRowExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {/* Key - Generate program-based epic key (e.g., ABC-001) */}
          <div className="font-mono text-xs text-muted-foreground min-w-[100px]">
            {item.epicKey || (programKey ? `${programKey}-${String(rank).padStart(3, '0')}` : item.displayId || '—')}
          </div>

          {/* Summary (Epic Name) */}
          <div className="flex-1 min-w-[200px]">
            <span className="text-sm font-medium truncate">{item.name}</span>
          </div>

          {/* Theme */}
          <div className="min-w-[120px] text-sm truncate text-muted-foreground">
            {item.themeName || '—'}
          </div>

          {/* Quarters */}
          <div className="flex items-center gap-1 min-w-[100px]">
            {formatQuarters(item.quarters)}
          </div>

          {/* MVP */}
          <div className="text-sm text-center min-w-[50px]">
            {item.mvp ? 'Yes' : 'No'}
          </div>

          {/* Status (renamed from Process Step) */}
          <div className="text-sm min-w-[100px] truncate">
            {formatStatus(item.processStep || item.state)}
          </div>

          {/* Technical Score (renamed from Strategic Value Score) */}
          <div className="text-sm text-right min-w-[80px] font-medium">
            {item.technicalScore ?? item.businessScore ?? '—'}
          </div>
        </div>

        {/* Expanded Features Section */}
        {isRowExpanded && (
          <div className="bg-muted/30 border-t border-b">
            {isFeaturesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading features...</span>
              </div>
            ) : linkedFeatures && linkedFeatures.length > 0 ? (
              <div className="py-2">
                <div className="px-8 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Linked Features ({linkedFeatures.length})
                </div>
                {linkedFeatures.map((feature: any) => (
                  <div 
                    key={feature.id}
                    className="flex items-center gap-3 px-8 py-2 hover:bg-muted/50 cursor-pointer ml-6 border-l-2 border-brand-gold/30"
                  >
                    <div className="w-4 h-4 rounded bg-secondary-green/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-secondary-green">F</span>
                    </div>
                    <div className="font-mono text-xs text-muted-foreground min-w-[80px]">
                      {feature.feature_key || `F-${feature.id.slice(0, 4)}`}
                    </div>
                    <div className="flex-1 text-sm truncate">
                      {feature.name}
                    </div>
                    <div className="text-xs text-muted-foreground min-w-[80px]">
                      {feature.state || 'Not started'}
                    </div>
                    <div className="text-xs text-muted-foreground min-w-[50px] text-right">
                      {feature.estimate_points ? `${feature.estimate_points} pts` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-8 py-4 text-sm text-muted-foreground italic">
                No features linked to this epic
              </div>
            )}
          </div>
        )}
      </div>
    </BacklogContextMenu>
  );
}