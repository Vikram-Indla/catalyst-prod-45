import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, ChevronDown, GripVertical, ChevronLeft, Plus, X, List, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ThemeDetailsDrawer } from './ThemeDetailsDrawer';
import { ThemeColumnsDialog } from './ThemeColumnsDialog';
import { ThemeFiltersDialog, ThemeFilters } from './ThemeFiltersDialog';
import { ThemeKanbanView } from './ThemeKanbanView';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Pagination settings - match Epic backlog
const ITEMS_PER_PAGE = 10;

interface ThemeBacklogProps {
  portfolioId: string;
  piId?: string;
}

interface Theme {
  id: string;
  name: string;
  description?: string | null;
  status?: 'proposed' | 'active' | 'done' | 'cancelled';
  theme_status?: string;
  created_at: string;
  updated_at?: string;
}

// Format theme key (TH-XXXX) from UUID
function formatThemeKey(id: string): string {
  return `TH-${id.slice(0, 4).toUpperCase()}`;
}

// Format status for human-readable display
function formatStatus(status?: string): string {
  if (!status) return '—';
  return status.replace(/_/g, ' ').toLowerCase();
}

export function ThemeBacklog({ portfolioId, piId }: ThemeBacklogProps) {
  const [activeView, setActiveView] = useState<'list' | 'kanban'>('list');
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['rank', 'id', 'name', 'state', 'objectives', 'updated']);
  const [filters, setFilters] = useState<ThemeFilters>({});
  const [isDragDisabled, setIsDragDisabled] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  
  // Quick add state
  const [isAdding, setIsAdding] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  
  const queryClient = useQueryClient();

  // Fetch themes
  const { data: themes, isLoading } = useQuery({
    queryKey: ['themes', portfolioId, piId],
    queryFn: async () => {
      const query = supabase
        .from('strategic_themes')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch objectives count per theme
  const { data: objectiveCounts } = useQuery({
    queryKey: ['theme-objective-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objectives')
        .select('theme_id');
      if (error) return {};
      
      const counts: Record<string, number> = {};
      data?.forEach((obj: any) => {
        if (obj.theme_id) {
          counts[obj.theme_id] = (counts[obj.theme_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Create theme mutation
  const createThemeMutation = useMutation({
    mutationFn: async (themeName: string) => {
      // snapshot_id is required by the schema, so we need to provide a default or fetch one
      const { data: defaultSnapshot } = await supabase
        .from('strategy_snapshots')
        .select('id')
        .limit(1)
        .single();
      
      const { data, error } = await supabase
        .from('strategic_themes')
        .insert({ 
          name: themeName,
          snapshot_id: defaultSnapshot?.id || '' 
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Theme created successfully');
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      setNewThemeName('');
      setIsAdding(false);
      // Open the drawer for the new theme
      setSelectedTheme(data);
      setIsDrawerOpen(true);
    },
    onError: (error: any) => {
      toast.error(`Failed to create theme: ${error.message}`);
    },
  });

  // Pagination calculations
  const totalItems = themes?.length || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedThemes = themes?.slice(startIndex, endIndex) || [];

  const handleThemeClick = (theme: Theme) => {
    setSelectedTheme(theme);
    setIsDrawerOpen(true);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || isDragDisabled) return;
    console.log('Reorder:', result);
  };

  const handleFiltersApply = (newFilters: ThemeFilters) => {
    setFilters(newFilters);
    const hasFilters = Object.keys(newFilters).some(key => newFilters[key as keyof ThemeFilters] !== undefined);
    setIsDragDisabled(hasFilters);
  };

  const handleItemSelect = (themeId: string, selected: boolean) => {
    setSelectedItems(prev => 
      selected 
        ? [...prev, themeId] 
        : prev.filter(id => id !== themeId)
    );
  };

  const toggleRowExpand = (themeId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [themeId]: !prev[themeId]
    }));
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newThemeName.trim()) {
      createThemeMutation.mutate(newThemeName.trim());
    }
  };

  // Show Kanban view if selected
  if (activeView === 'kanban') {
    return (
      <div className="h-full flex flex-col">
        {/* View Mode Controls - Match Epic backlog header */}
        <div className="flex justify-between items-center gap-2 px-6 py-3 border-b">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setIsColumnsDialogOpen(true)}
            >
              <Columns3 className="h-4 w-4" />
              <span className="text-sm">Columns</span>
            </Button>
          </div>
          
          {/* List / Kanban segmented control - Match Epic backlog */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1.5 h-7 px-3"
              onClick={() => setActiveView('list')}
            >
              <List className="h-4 w-4" />
              <span className="text-sm">List</span>
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              className="gap-1.5 h-7 px-3"
            >
              <Columns3 className="h-4 w-4" />
              <span className="text-sm">Kanban</span>
            </Button>
          </div>
        </div>

        <ThemeKanbanView
          portfolioId={portfolioId}
          piId={piId}
          onThemeClick={handleThemeClick}
        />

        <ThemeDetailsDrawer
          theme={selectedTheme}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedTheme(null);
          }}
        />

        <ThemeColumnsDialog
          open={isColumnsDialogOpen}
          onOpenChange={setIsColumnsDialogOpen}
          selectedColumns={selectedColumns}
          onSave={setSelectedColumns}
        />

        <ThemeFiltersDialog
          open={isFiltersDialogOpen}
          onOpenChange={setIsFiltersDialogOpen}
          currentFilters={filters}
          onApply={handleFiltersApply}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* View Mode Controls - Match Epic backlog header */}
      <div className="flex justify-between items-center gap-2 px-6 py-3 border-b">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsColumnsDialogOpen(true)}
          >
            <Columns3 className="h-4 w-4" />
            <span className="text-sm">Columns</span>
          </Button>
        </div>
        
        {/* List / Kanban segmented control - Match Epic backlog */}
        <div className="flex items-center gap-1 bg-muted rounded-md p-1">
          <Button 
            variant="secondary" 
            size="sm" 
            className="gap-1.5 h-7 px-3"
          >
            <List className="h-4 w-4" />
            <span className="text-sm">List</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 h-7 px-3"
            onClick={() => setActiveView('kanban')}
          >
            <Columns3 className="h-4 w-4" />
            <span className="text-sm">Kanban</span>
          </Button>
        </div>
      </div>

      {/* Table Content - Match Epic backlog structure */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 pt-2 pb-4">
        <div className="border rounded-lg bg-card overflow-hidden">
          {/* Column Headers - Match Epic backlog styling */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-brand-gold/10 border-b border-brand-gold/30 text-xs font-semibold text-foreground capitalize tracking-wide">
            {/* Drag handle column */}
            <div className="w-8" />
            
            {/* Checkbox column */}
            <div className="w-5" />
            
            {/* Expand chevron column */}
            <div className="w-6" />
            
            {/* Key */}
            <div className="min-w-[80px]">Key</div>
            
            {/* Name / Summary */}
            <div className="flex-1 min-w-[200px]">Name</div>
            
            {/* Status */}
            <div className="min-w-[100px]">Status</div>
            
            {/* Objectives */}
            <div className="min-w-[80px] text-right">Objectives</div>
            
            {/* Updated */}
            <div className="min-w-[100px] text-right">Updated</div>
          </div>
          
          {/* Theme Rows */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="themes-list">
              {(provided) => (
                <div 
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="divide-y"
                >
                  {isLoading ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Loading themes...
                    </div>
                  ) : paginatedThemes.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground border-2 border-dashed border-muted mx-4 my-4 rounded">
                      Drag & Drop Items Here
                    </div>
                  ) : (
                    paginatedThemes.map((theme, index) => {
                      const isSelected = selectedItems.includes(theme.id);
                      const isExpanded = expandedRows[theme.id] || false;
                      const objectiveCount = objectiveCounts?.[theme.id] || 0;
                      
                      return (
                        <Draggable 
                          key={theme.id} 
                          draggableId={theme.id} 
                          index={startIndex + index}
                          isDragDisabled={isDragDisabled}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              {/* Theme Row - Match Epic row structure exactly */}
                              <div
                                className={cn(
                                  'flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors',
                                  isSelected && 'bg-muted',
                                  snapshot.isDragging && 'opacity-50 bg-muted'
                                )}
                                onClick={() => handleThemeClick(theme)}
                              >
                                {/* Drag handle - LEFTMOST */}
                                <div 
                                  {...provided.dragHandleProps} 
                                  className="cursor-grab active:cursor-grabbing w-8"
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>

                                {/* Checkbox - BEFORE chevron */}
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleItemSelect(theme.id, checked as boolean)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4"
                                />

                                {/* Expand chevron - clickable to expand */}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRowExpand(theme.id);
                                  }}
                                  className="w-6 flex items-center justify-center hover:bg-muted rounded"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>

                                {/* Key - Derived TH-XXXX format */}
                                <div className="font-mono text-xs text-muted-foreground min-w-[80px]">
                                  {formatThemeKey(theme.id)}
                                </div>

                                {/* Name / Summary - NO colored dot */}
                                <div className="flex-1 min-w-[200px]">
                                  <span className="text-sm font-medium truncate">{theme.name}</span>
                                </div>

                                {/* Status - Plain text, no badge */}
                                <div className="text-sm min-w-[100px] truncate">
                                  {formatStatus(theme.status)}
                                </div>

                                {/* Objectives count - Match Score column styling */}
                                <div className="text-sm text-right min-w-[80px] font-medium">
                                  {objectiveCount || '—'}
                                </div>

                                {/* Updated date - Match Epic date format */}
                                <div className="text-sm text-right min-w-[100px] text-muted-foreground">
                                  {theme.updated_at 
                                    ? format(new Date(theme.updated_at), 'MMM d, yyyy')
                                    : format(new Date(theme.created_at), 'MMM d, yyyy')
                                  }
                                </div>
                              </div>

                              {/* Expanded content placeholder */}
                              {isExpanded && (
                                <div className="bg-muted/30 border-t border-b px-8 py-4">
                                  <div className="text-sm text-muted-foreground italic">
                                    Theme details and linked objectives will appear here
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Quick Add Row - Match Epic "+ Add epic" pattern */}
          {!isAdding ? (
            <div className="px-4 py-2 border-t bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add theme
              </Button>
            </div>
          ) : (
            <form onSubmit={handleQuickAdd} className="px-4 py-2 border-t bg-muted/30">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter theme name..."
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  autoFocus
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newThemeName.trim() || createThemeMutation.isPending}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNewThemeName('');
                    setIsAdding(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {/* Pagination Controls - Match Epic backlog */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{endIndex} of {totalItems} themes
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

      {/* Theme Details Drawer */}
      <ThemeDetailsDrawer
        theme={selectedTheme}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTheme(null);
        }}
      />

      {/* Dialogs */}
      <ThemeColumnsDialog
        open={isColumnsDialogOpen}
        onOpenChange={setIsColumnsDialogOpen}
        selectedColumns={selectedColumns}
        onSave={setSelectedColumns}
      />
      
      <ThemeFiltersDialog
        open={isFiltersDialogOpen}
        onOpenChange={setIsFiltersDialogOpen}
        currentFilters={filters}
        onApply={handleFiltersApply}
      />
    </div>
  );
}
