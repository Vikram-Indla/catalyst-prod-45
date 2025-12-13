import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, GripVertical, Plus, Trash2, Settings2, Columns, LayoutGrid, Filter, Palette, Loader2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  useKanbanBoardSettings, 
  useSaveKanbanBoardSettings, 
  KanbanBoardSettings, 
  KanbanColumn,
  QuickFilter,
  SwimLaneMethod,
  CardColorMethod,
  DEFAULT_SETTINGS 
} from '@/hooks/useKanbanBoardSettings';
import { cn } from '@/lib/utils';

// All available statuses that can be mapped
const ALL_STATUSES = [
  'NEW_REQUEST', 'NEW_DEMAND', 'IN_REVIEW', 'ANALYSE', 'APPROVED', 
  'READY_TO_IMPLEMENT', 'IMPLEMENT', 'CLOSED', 'REJECTED', 'ON_HOLD',
  'PENDING_REVIEW', 'DEFERRED'
];

const CATEGORY_OPTIONS = [
  { value: 'todo', label: 'To Do', color: 'bg-neutral-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-500' },
];

const SWIMLANE_METHODS = [
  { value: 'none', label: 'No Swimlanes' },
  { value: 'assignee', label: 'By Assignee' },
  { value: 'priority', label: 'By Priority' },
  { value: 'department', label: 'By Department' },
  { value: 'custom', label: 'Custom Queries' },
];

const CARD_FIELD_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'score', label: 'Score' },
  { value: 'department', label: 'Department' },
  { value: 'business_owner', label: 'Business Owner' },
  { value: 'tags', label: 'Tags' },
  { value: 'age', label: 'Age' },
];

const COLOR_METHOD_OPTIONS = [
  { value: 'priority', label: 'By Priority' },
  { value: 'status', label: 'By Status' },
  { value: 'age', label: 'By Age' },
  { value: 'none', label: 'No Colors' },
];

export default function KanbanSettings() {
  const { data, isLoading } = useKanbanBoardSettings('product');
  const saveSettings = useSaveKanbanBoardSettings();
  
  const [settings, setSettings] = useState<KanbanBoardSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (data?.settings) {
      setSettings(data.settings);
    }
  }, [data]);

  const handleSave = () => {
    saveSettings.mutate({
      scope: 'product',
      settings,
      existingId: data?.id,
    }, {
      onSuccess: () => setHasChanges(false),
    });
  };

  const updateSettings = (updates: Partial<KanbanBoardSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  // Get unmapped statuses
  const mappedStatuses = settings.columns.flatMap(col => col.statuses);
  const unmappedStatuses = ALL_STATUSES.filter(s => !mappedStatuses.includes(s));

  const handleColumnDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'column') {
      const newColumns = Array.from(settings.columns);
      const [removed] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, removed);
      
      // Update sort orders
      const updatedColumns = newColumns.map((col, idx) => ({ ...col, sortOrder: idx }));
      updateSettings({ columns: updatedColumns });
    } else if (type === 'status') {
      // Handle status drag between columns
      const sourceColumnId = source.droppableId;
      const destColumnId = destination.droppableId;

      if (sourceColumnId === 'unmapped') {
        // Dragging from unmapped to a column
        const statusToMove = unmappedStatuses[source.index];
        const newColumns = settings.columns.map(col => {
          if (col.id === destColumnId) {
            const newStatuses = [...col.statuses];
            newStatuses.splice(destination.index, 0, statusToMove);
            return { ...col, statuses: newStatuses };
          }
          return col;
        });
        updateSettings({ columns: newColumns });
      } else if (destColumnId === 'unmapped') {
        // Dragging from a column to unmapped
        const newColumns = settings.columns.map(col => {
          if (col.id === sourceColumnId) {
            const newStatuses = col.statuses.filter((_, idx) => idx !== source.index);
            return { ...col, statuses: newStatuses };
          }
          return col;
        });
        updateSettings({ columns: newColumns });
      } else {
        // Dragging between columns
        const newColumns = settings.columns.map(col => {
          if (col.id === sourceColumnId) {
            const newStatuses = [...col.statuses];
            const [removed] = newStatuses.splice(source.index, 1);
            if (col.id === destColumnId) {
              newStatuses.splice(destination.index, 0, removed);
            }
            return { ...col, statuses: newStatuses };
          }
          if (col.id === destColumnId && sourceColumnId !== destColumnId) {
            const sourceCol = settings.columns.find(c => c.id === sourceColumnId);
            const statusToMove = sourceCol?.statuses[source.index];
            if (statusToMove) {
              const newStatuses = [...col.statuses];
              newStatuses.splice(destination.index, 0, statusToMove);
              return { ...col, statuses: newStatuses };
            }
          }
          return col;
        });
        
        // Remove from source if different columns
        if (sourceColumnId !== destColumnId) {
          const finalColumns = newColumns.map(col => {
            if (col.id === sourceColumnId) {
              return { ...col, statuses: col.statuses.filter((_, idx) => idx !== source.index) };
            }
            return col;
          });
          updateSettings({ columns: finalColumns });
        } else {
          updateSettings({ columns: newColumns });
        }
      }
    }
  };

  const addColumn = () => {
    const newColumn: KanbanColumn = {
      id: `col_${Date.now()}`,
      name: 'New Column',
      color: '#9ca3af',
      category: 'todo',
      statuses: [],
      wipLimit: null,
      sortOrder: settings.columns.length,
    };
    updateSettings({ columns: [...settings.columns, newColumn] });
  };

  const updateColumn = (columnId: string, updates: Partial<KanbanColumn>) => {
    updateSettings({
      columns: settings.columns.map(col =>
        col.id === columnId ? { ...col, ...updates } : col
      ),
    });
  };

  const deleteColumn = (columnId: string) => {
    updateSettings({
      columns: settings.columns.filter(col => col.id !== columnId),
    });
  };

  const addQuickFilter = () => {
    const newFilter: QuickFilter = {
      id: `qf_${Date.now()}`,
      name: 'New Filter',
      query: '',
      enabled: true,
      sortOrder: settings.quickFilters.length,
    };
    updateSettings({ quickFilters: [...settings.quickFilters, newFilter] });
  };

  const updateQuickFilter = (filterId: string, updates: Partial<QuickFilter>) => {
    updateSettings({
      quickFilters: settings.quickFilters.map(f =>
        f.id === filterId ? { ...f, ...updates } : f
      ),
    });
  };

  const deleteQuickFilter = (filterId: string) => {
    updateSettings({
      quickFilters: settings.quickFilters.filter(f => f.id !== filterId),
    });
  };

  const toggleCardField = (field: string) => {
    const currentFields = settings.cardLayout.visibleFields;
    const newFields = currentFields.includes(field)
      ? currentFields.filter(f => f !== field)
      : [...currentFields, field];
    updateSettings({
      cardLayout: { ...settings.cardLayout, visibleFields: newFields },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Kanban Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure columns, swimlanes, filters, and card appearance for the Kanban board
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || saveSettings.isPending}
          className="bg-brand-gold hover:bg-brand-gold-hover text-white"
        >
          {saveSettings.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save All Changes
        </Button>
      </div>

      <Tabs defaultValue="columns" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="columns" className="flex items-center gap-2">
            <Columns className="h-4 w-4" />
            Columns & Statuses
          </TabsTrigger>
          <TabsTrigger value="swimlanes" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Swimlanes
          </TabsTrigger>
          <TabsTrigger value="filters" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Quick Filters
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Card Layout
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Card Colors
          </TabsTrigger>
        </TabsList>

        {/* Columns & Statuses Tab */}
        <TabsContent value="columns" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Columns & Status Mapping</CardTitle>
                  <CardDescription>
                    Configure board columns and map process statuses to each column. Drag columns to reorder, drag statuses between columns.
                  </CardDescription>
                </div>
                <Button onClick={addColumn} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DragDropContext onDragEnd={handleColumnDragEnd}>
                {/* Columns */}
                <Droppable droppableId="columns" direction="horizontal" type="column">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex gap-4 overflow-x-auto pb-4"
                    >
                      {settings.columns.map((column, index) => (
                        <Draggable key={column.id} draggableId={column.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "flex-shrink-0 w-64 rounded-lg border bg-card",
                                snapshot.isDragging && "shadow-lg"
                              )}
                            >
                              {/* Column Header */}
                              <div 
                                className="flex items-center gap-2 p-3 border-b"
                                style={{ borderLeftColor: column.color, borderLeftWidth: 4 }}
                              >
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                </div>
                                <Input
                                  value={column.name}
                                  onChange={(e) => updateColumn(column.id, { name: e.target.value })}
                                  className="h-8 text-sm font-medium"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteColumn(column.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Column Settings */}
                              <div className="p-3 space-y-3">
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground w-16">Color</Label>
                                  <Input
                                    type="color"
                                    value={column.color}
                                    onChange={(e) => updateColumn(column.id, { color: e.target.value })}
                                    className="h-8 w-16 p-1 cursor-pointer"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground w-16">Category</Label>
                                  <Select
                                    value={column.category}
                                    onValueChange={(v) => updateColumn(column.id, { category: v as KanbanColumn['category'] })}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CATEGORY_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", opt.color)} />
                                            {opt.label}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground w-16">WIP Limit</Label>
                                  <Input
                                    type="number"
                                    value={column.wipLimit ?? ''}
                                    onChange={(e) => updateColumn(column.id, { wipLimit: e.target.value ? parseInt(e.target.value) : null })}
                                    placeholder="No limit"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>

                              {/* Mapped Statuses */}
                              <Separator />
                              <div className="p-3">
                                <Label className="text-xs text-muted-foreground mb-2 block">Mapped Statuses</Label>
                                <Droppable droppableId={column.id} type="status">
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={cn(
                                        "min-h-[60px] rounded border border-dashed p-2 space-y-1",
                                        snapshot.isDraggingOver && "bg-brand-gold/10 border-brand-gold"
                                      )}
                                    >
                                      {column.statuses.map((status, idx) => (
                                        <Draggable key={status} draggableId={`${column.id}-${status}`} index={idx}>
                                          {(provided) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs"
                                            >
                                              <GripVertical className="h-3 w-3 text-muted-foreground" />
                                              {status.replace(/_/g, ' ')}
                                            </div>
                                          )}
                                        </Draggable>
                                      ))}
                                      {provided.placeholder}
                                      {column.statuses.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-2">
                                          Drop statuses here
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </Droppable>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Unmapped Statuses */}
                {unmappedStatuses.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm font-medium mb-2 block">Unmapped Statuses</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Drag these statuses to columns above to map them.
                    </p>
                    <Droppable droppableId="unmapped" direction="horizontal" type="status">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="flex flex-wrap gap-2"
                        >
                          {unmappedStatuses.map((status, idx) => (
                            <Draggable key={status} draggableId={`unmapped-${status}`} index={idx}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <Badge variant="outline" className="cursor-grab">
                                    {status.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )}
              </DragDropContext>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Swimlanes Tab */}
        <TabsContent value="swimlanes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Swimlane Configuration</CardTitle>
              <CardDescription>
                Configure how cards are grouped into horizontal swimlanes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label className="w-32">Swimlane Method</Label>
                <Select
                  value={settings.swimlaneConfig.method}
                  onValueChange={(v) => updateSettings({
                    swimlaneConfig: { ...settings.swimlaneConfig, method: v as SwimLaneMethod }
                  })}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SWIMLANE_METHODS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {settings.swimlaneConfig.method === 'custom' && (
                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Custom Swimlane Queries</Label>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Query
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Define custom queries to group cards into swimlanes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Filters Tab */}
        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Quick Filters</CardTitle>
                  <CardDescription>
                    Configure quick filter buttons shown in the Kanban toolbar
                  </CardDescription>
                </div>
                <Button onClick={addQuickFilter} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {settings.quickFilters.map((filter) => (
                  <div key={filter.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <Switch
                      checked={filter.enabled}
                      onCheckedChange={(v) => updateQuickFilter(filter.id, { enabled: v })}
                    />
                    <Input
                      value={filter.name}
                      onChange={(e) => updateQuickFilter(filter.id, { name: e.target.value })}
                      className="w-48"
                      placeholder="Filter name"
                    />
                    <Input
                      value={filter.query}
                      onChange={(e) => updateQuickFilter(filter.id, { query: e.target.value })}
                      className="flex-1"
                      placeholder="Query (e.g., assignee:me, priority:high)"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteQuickFilter(filter.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {settings.quickFilters.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No quick filters configured. Click "Add Filter" to create one.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Card Layout Tab */}
        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Card Layout</CardTitle>
              <CardDescription>
                Choose which fields to display on Kanban cards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CARD_FIELD_OPTIONS.map((field) => (
                  <div
                    key={field.value}
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                      settings.cardLayout.visibleFields.includes(field.value)
                        ? "border-brand-gold bg-brand-gold/10"
                        : "hover:bg-muted"
                    )}
                    onClick={() => toggleCardField(field.value)}
                  >
                    <Switch
                      checked={settings.cardLayout.visibleFields.includes(field.value)}
                      onCheckedChange={() => toggleCardField(field.value)}
                    />
                    <Label className="cursor-pointer">{field.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Card Colors Tab */}
        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Card Colors</CardTitle>
              <CardDescription>
                Configure how cards are colored based on their attributes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Label className="w-32">Color Method</Label>
                <Select
                  value={settings.cardColors.method}
                  onValueChange={(v) => updateSettings({
                    cardColors: { ...settings.cardColors, method: v as CardColorMethod }
                  })}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_METHOD_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {settings.cardColors.method === 'priority' && (
                <div className="space-y-3">
                  <Label>Priority Colors</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(settings.cardColors.priorityColors).map(([priority, color]) => (
                      <div key={priority} className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={color}
                          onChange={(e) => updateSettings({
                            cardColors: {
                              ...settings.cardColors,
                              priorityColors: {
                                ...settings.cardColors.priorityColors,
                                [priority]: e.target.value,
                              },
                            },
                          })}
                          className="h-10 w-16 p-1 cursor-pointer"
                        />
                        <Label className="capitalize">{priority}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
