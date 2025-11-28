import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, ChevronDown, Circle, Download, Square, Plus, Minus, Grid3x3, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeDetailsDrawer } from './ThemeDetailsDrawer';
import { ThemeContextMenu } from './ThemeContextMenu';
import { ThemeColumnsDialog } from './ThemeColumnsDialog';
import { ThemeFiltersDialog, ThemeFilters } from './ThemeFiltersDialog';
import { UnassignedThemeSlideout } from './UnassignedThemeSlideout';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// Citation: (Doc: Backlog for themes - PDF provided)
// Citation: (Screenshot: image-190.png, image-191.png, image-192.png, image-194.png, image-196.png)

interface ThemeBacklogProps {
  portfolioId: string;
  piId?: string;
}

interface Theme {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export function ThemeBacklog({ portfolioId, piId }: ThemeBacklogProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'pi-5': false,
    'unassigned': false,
  });
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [isUnassignedSlideoutOpen, setIsUnassignedSlideoutOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['rank', 'id', 'name', 'state', 'pis']);
  const [filters, setFilters] = useState<ThemeFilters>({});
  const [isDragDisabled, setIsDragDisabled] = useState(false);

  // Fetch themes
  const { data: themes, isLoading } = useQuery({
    queryKey: ['themes', portfolioId, piId],
    queryFn: async () => {
      let query = supabase
        .from('strategic_themes')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const toggleTheme = (themeId: string) => {
    setExpandedThemes(prev => ({
      ...prev,
      [themeId]: !prev[themeId],
    }));
  };

  const handleThemeClick = (theme: Theme) => {
    setSelectedTheme(theme);
    setIsDrawerOpen(true);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || isDragDisabled) return;
    // Reorder logic here
    console.log('Reorder:', result);
  };

  const handleFiltersApply = (newFilters: ThemeFilters) => {
    setFilters(newFilters);
    const hasFilters = Object.keys(newFilters).some(key => newFilters[key as keyof ThemeFilters] !== undefined);
    setIsDragDisabled(hasFilters);
  };

  // Mock data for display structure
  const piThemes = themes?.slice(0, 9) || [];
  const unassignedThemes = themes?.slice(9, 10) || [];

  return (
    <div className="h-full flex flex-col">
      {/* View Mode Buttons - Citation: (Screenshot: image-190.png) */}
      <div className="flex justify-between items-center gap-2 px-6 py-3 border-b">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsColumnsDialogOpen(true)}
          >
            <Grid3x3 className="h-4 w-4" />
            <span className="text-sm">Columns</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsFiltersDialogOpen(true)}
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filters</span>
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span className="text-sm">List</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span className="text-sm">Kanban</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => setIsUnassignedSlideoutOpen(true)}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="2" />
            </svg>
            <span className="text-sm">Unassigned Backlog</span>
          </Button>
        </div>
      </div>

      {/* Content - Citation: (Screenshot: image-191.png) */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-6">All Programs for Digital Services</h2>

          {/* PI-5 Section - Thinner swim lanes per image-212.png */}
          <div className="mb-3">
            <div className="flex items-center justify-between py-2 border-b">
              <button
                onClick={() => toggleSection('pi-5')}
                className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
              >
                {expandedSections['pi-5'] ? (
                  <Minus className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Plus className="h-3.5 w-3.5 text-primary" />
                )}
                <span className="text-primary">Themes for PI-5</span>
              </button>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">
                  Total Items: <span className="text-foreground font-medium">{piThemes.length}</span>
                </span>
                <Button variant="ghost" size="sm" className="gap-1 h-6 px-2">
                  <Download className="h-3 w-3" />
                  <span className="text-xs">Export</span>
                </Button>
              </div>
            </div>

            {!expandedSections['pi-5'] && (
              <div className="border border-dashed rounded-md py-12 mt-2 bg-muted/5">
                <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Drag & Drop Items Here
                </p>
              </div>
            )}

            {expandedSections['pi-5'] && (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="pi-5-themes" isDropDisabled={isDragDisabled}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-px bg-border rounded-md overflow-hidden"
                    >
                      {piThemes.map((theme, index) => (
                        <Draggable
                          key={theme.id}
                          draggableId={theme.id}
                          index={index}
                          isDragDisabled={isDragDisabled}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-background"
                            >
                              <ThemeContextMenu
                                onOpen={() => handleThemeClick(theme)}
                                onDuplicate={() => console.log('Duplicate', theme.id)}
                                onMoveToTop={() => console.log('Move to top')}
                                onMoveToBottom={() => console.log('Move to bottom')}
                                onMoveToPosition={() => console.log('Move to position')}
                                onMoveToPI={() => console.log('Move to PI')}
                                onMoveToUnassigned={() => console.log('Move to unassigned')}
                                onDelete={() => console.log('Delete')}
                              >
                              {/* Theme Row - Compact per image-212.png */}
                                <div className="flex items-center gap-3 px-4 py-1.5 hover:bg-accent/50 transition-colors">
                                  <button
                                    onClick={() => toggleTheme(theme.id)}
                                    className="hover:text-primary transition-colors"
                                  >
                                    {expandedThemes[theme.id] ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                  <span className="text-sm text-muted-foreground w-8">{index + 1}</span>
                                  <Circle className="h-3 w-3 fill-orange-500 text-orange-500" />
                                  <span className="text-sm text-muted-foreground w-12">{Math.floor(Math.random() * 200)}</span>
                                  <div
                                    className="flex items-center gap-2 flex-1 cursor-pointer"
                                    onClick={() => handleThemeClick(theme)}
                                  >
                                    <Square className="h-4 w-4 text-green-600 fill-green-100" />
                                    <span className="text-sm font-medium hover:text-primary hover:underline">
                                      {theme.name}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    {['PI7', 'PI6', 'PI5', 'PI4', 'PI3', 'PI2', 'PI1'].slice(0, Math.floor(Math.random() * 5) + 2).map((pi, i) => (
                                      <span
                                        key={i}
                                        className={cn(
                                          "px-2 py-0.5 rounded text-xs font-medium",
                                          pi === 'PI7' && "bg-green-500 text-white",
                                          pi === 'PI6' && "bg-gray-500 text-white",
                                          pi === 'PI5' && "bg-orange-400 text-white",
                                          pi === 'PI4' && "bg-orange-600 text-white",
                                          pi === 'PI3' && "bg-green-600 text-white",
                                          pi === 'PI2' && "bg-pink-500 text-white",
                                          pi === 'PI1' && "bg-blue-700 text-white"
                                        )}
                                      >
                                        {pi}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </ThemeContextMenu>

                              {/* Expanded Theme - Show Epics - Citation: (Screenshot: image-192.png) */}
                              {expandedThemes[theme.id] && (
                                <div className="pl-12 pr-4 py-3 bg-muted/30 border-t">
                                  <div className="flex gap-2 mb-3">
                                    <input
                                      type="text"
                                      placeholder="New Epic Name..."
                                      className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background"
                                    />
                                    <select className="px-3 py-1.5 text-sm border rounded-md bg-background">
                                      <option>Select Program</option>
                                    </select>
                                    <Button size="sm" variant="outline" className="gap-1">
                                      <span className="text-lg leading-none">+</span>
                                      <span>Add</span>
                                    </Button>
                                  </div>
                                  <div className="space-y-1">
                                    {/* Mock epic rows */}
                                    <div className="flex items-center gap-3 px-4 py-2 bg-background rounded">
                                      <span className="text-sm text-muted-foreground w-8">1</span>
                                      <Circle className="h-3 w-3 fill-blue-500 text-blue-500" />
                                      <span className="text-sm text-muted-foreground w-12">1111</span>
                                      <div className="flex items-center gap-2 flex-1">
                                        <Square className="h-4 w-4 text-blue-600 fill-blue-100" />
                                        <span className="text-sm">Interface: E2E transcription flow</span>
                                      </div>
                                      <div className="flex gap-1">
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500 text-white">PI7</span>
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500 text-white">PI6</span>
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-400 text-white">PI5</span>
                                      </div>
                                      <span className="text-sm font-medium text-muted-foreground">4.25</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>

          {/* Unassigned Backlog Section - Thinner swim lanes per image-212.png */}
          <div className="mb-3">
            <div className="flex items-center justify-between py-2 border-b">
              <button
                onClick={() => toggleSection('unassigned')}
                className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
              >
                {expandedSections['unassigned'] ? (
                  <Minus className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Plus className="h-3.5 w-3.5 text-primary" />
                )}
                <span className="text-primary">Unassigned Backlog</span>
              </button>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">
                  Total Items: <span className="text-foreground font-medium">{unassignedThemes.length}</span>
                </span>
                <Button variant="ghost" size="sm" className="gap-1 h-6 px-2">
                  <Download className="h-3 w-3" />
                  <span className="text-xs">Export</span>
                </Button>
              </div>
            </div>

            {!expandedSections['unassigned'] && (
              <div className="border border-dashed rounded-md py-12 mt-2 bg-muted/5">
                <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Drag & Drop Items Here
                </p>
              </div>
            )}
          </div>
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
      
      <UnassignedThemeSlideout
        open={isUnassignedSlideoutOpen}
        onClose={() => setIsUnassignedSlideoutOpen(false)}
        portfolioId={portfolioId}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
