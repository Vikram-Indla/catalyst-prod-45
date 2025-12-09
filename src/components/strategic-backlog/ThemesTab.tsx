import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Palette, 
  AlertTriangle, 
  ChevronRight, 
  Search, 
  Link as LinkIcon,
  GripVertical,
  LayoutGrid,
  List,
  Target
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { ThemeDrawer } from './ThemeDrawer';
import { CreateThemeDialog } from './CreateThemeDialog';
import { LinkExistingThemesDialog } from './LinkExistingThemesDialog';
import { ThemeAlignmentView } from './ThemeAlignmentView';
import { useThemesObjectiveCounts } from '@/hooks/useThemeObjectiveLinks';
import { format } from 'date-fns';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { catalystToast } from '@/lib/catalystToast';

interface ThemesTabProps {
  themes: StrategicTheme[];
  snapshotId: string;
  isArchived: boolean;
  onReorder?: (themeIds: string[]) => void;
}

export function ThemesTab({ themes, snapshotId, isArchived, onReorder }: ThemesTabProps) {
  const [selectedTheme, setSelectedTheme] = useState<StrategicTheme | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [localThemes, setLocalThemes] = useState<StrategicTheme[]>(themes);
  const [subTab, setSubTab] = useState<'list' | 'alignment'>('list');

  const { data: objectiveCounts = {} } = useThemesObjectiveCounts(themes.map(t => t.id));

  // Sync localThemes with themes prop
  if (JSON.stringify(themes.map(t => t.id)) !== JSON.stringify(localThemes.map(t => t.id))) {
    setLocalThemes(themes);
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredThemes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredThemes.map(t => t.id));
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
      default:
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
    }
  };

  // Filter themes
  const filteredThemes = localThemes.filter(theme => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      theme.name.toLowerCase().includes(query) ||
      theme.description?.toLowerCase().includes(query)
    );
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || isArchived) return;
    
    const items = Array.from(localThemes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setLocalThemes(items);
    onReorder?.(items.map(t => t.id));
    catalystToast.success('Success', 'Theme order updated');
  };

  return (
    <div className="space-y-4">
      {/* Required Warning */}
      {themes.length === 0 && !isArchived && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">This snapshot cannot be activated until at least 1 Theme is linked.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
              <LinkIcon className="h-3.5 w-3.5 mr-1" />
              Link existing
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-brand-gold hover:bg-brand-gold/90">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create Theme
            </Button>
          </div>
        </div>
      )}

      {/* Sub-tabs: Themes List | Alignment */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'list' | 'alignment')}>
        <div className="flex items-center justify-between gap-4">
          <TabsList className="h-8 bg-muted/50">
            <TabsTrigger value="list" className="text-xs h-7 px-3 data-[state=active]:bg-background">
              <Palette className="h-3.5 w-3.5 mr-1.5" />
              Themes
            </TabsTrigger>
            <TabsTrigger value="alignment" className="text-xs h-7 px-3 data-[state=active]:bg-background">
              <Target className="h-3.5 w-3.5 mr-1.5" />
              Alignment
            </TabsTrigger>
          </TabsList>

          {subTab === 'list' && (
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search themes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 w-48 text-sm"
                />
              </div>

              {/* View Toggle */}
              <div className="flex border border-border rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 ${viewMode === 'list' ? 'bg-muted' : 'hover:bg-muted/50'}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 ${viewMode === 'cards' ? 'bg-muted' : 'hover:bg-muted/50'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

              {/* Actions */}
              {!isArchived && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
                    <LinkIcon className="h-3.5 w-3.5 mr-1" />
                    Link existing
                  </Button>
                  <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-brand-gold hover:bg-brand-gold/90">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Themes List Tab */}
        <TabsContent value="list" className="mt-4">
          {filteredThemes.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <Palette className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                {searchQuery ? 'No themes match your search.' : 'No themes created yet for this snapshot.'}
              </p>
              {!isArchived && !searchQuery && (
                <div className="flex justify-center gap-2">
                  <Button onClick={() => setLinkOpen(true)} variant="outline" size="sm">
                    <LinkIcon className="h-3.5 w-3.5 mr-1" />
                    Link existing
                  </Button>
                  <Button onClick={() => setCreateOpen(true)} size="sm" className="bg-brand-gold hover:bg-brand-gold/90">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create theme
                  </Button>
                </div>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="border border-border rounded-lg overflow-hidden">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="themes">
                  {(provided) => (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-10">
                            <Checkbox
                              checked={selectedIds.length === filteredThemes.length && filteredThemes.length > 0}
                              onCheckedChange={toggleSelectAll}
                              disabled={isArchived}
                            />
                          </TableHead>
                          {!isArchived && <TableHead className="w-8"></TableHead>}
                          <TableHead>Theme</TableHead>
                          <TableHead className="w-24">Color</TableHead>
                          <TableHead className="w-24">Status</TableHead>
                          <TableHead className="w-24">Objectives</TableHead>
                          <TableHead className="w-28">Updated</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <tbody ref={provided.innerRef} {...provided.droppableProps}>
                        {filteredThemes.map((theme, index) => (
                          <Draggable key={theme.id} draggableId={theme.id} index={index} isDragDisabled={isArchived}>
                            {(provided, snapshot) => (
                              <TableRow
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`cursor-pointer hover:bg-muted/30 ${snapshot.isDragging ? 'bg-muted shadow-lg' : ''}`}
                                onClick={() => setSelectedTheme(theme)}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedIds.includes(theme.id)}
                                    onCheckedChange={() => toggleSelect(theme.id)}
                                    disabled={isArchived}
                                  />
                                </TableCell>
                                {!isArchived && (
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                    </div>
                                  </TableCell>
                                )}
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: theme.color_tag || 'hsl(var(--brand-gold))' }}
                                    />
                                    <span className="font-medium text-foreground">{theme.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {theme.color_tag ? (
                                    <div className="flex items-center gap-1.5">
                                      <div
                                        className="w-4 h-4 rounded border border-border"
                                        style={{ backgroundColor: theme.color_tag }}
                                      />
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {theme.color_tag}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Default</span>
                                  )}
                                </TableCell>
                                <TableCell>{getStatusBadge(theme.status)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="gap-1">
                                    <Target className="h-3 w-3" />
                                    {objectiveCounts[theme.id] || 0}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {theme.updated_at ? format(new Date(theme.updated_at), 'MMM d, yyyy') : '—'}
                                </TableCell>
                                <TableCell>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </TableCell>
                              </TableRow>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </tbody>
                    </Table>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          ) : (
            // Cards View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredThemes.map((theme) => (
                <div
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme)}
                  className="p-4 border border-border rounded-lg hover:border-brand-gold/50 hover:shadow-sm cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.color_tag || 'hsl(var(--brand-gold))' }}
                      />
                      <h4 className="font-medium text-foreground">{theme.name}</h4>
                    </div>
                    {getStatusBadge(theme.status)}
                  </div>
                  {theme.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{theme.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <Badge variant="outline" className="gap-1">
                      <Target className="h-3 w-3" />
                      {objectiveCounts[theme.id] || 0} objectives
                    </Badge>
                    <span>Updated {theme.updated_at ? format(new Date(theme.updated_at), 'MMM d') : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Alignment Tab */}
        <TabsContent value="alignment" className="mt-4">
          {themes.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <Target className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Create or link themes first to manage objective alignment.
              </p>
              {!isArchived && (
                <div className="flex justify-center gap-2">
                  <Button onClick={() => { setSubTab('list'); setLinkOpen(true); }} variant="outline" size="sm">
                    <LinkIcon className="h-3.5 w-3.5 mr-1" />
                    Link existing
                  </Button>
                  <Button onClick={() => { setSubTab('list'); setCreateOpen(true); }} size="sm" className="bg-brand-gold hover:bg-brand-gold/90">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create theme
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <ThemeAlignmentView
              themes={themes}
              snapshotId={snapshotId}
              isArchived={isArchived}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Theme Drawer */}
      <ThemeDrawer
        open={!!selectedTheme}
        onOpenChange={(open) => !open && setSelectedTheme(null)}
        theme={selectedTheme}
        isArchived={isArchived}
      />

      {/* Create Dialog */}
      <CreateThemeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        snapshotId={snapshotId}
      />

      {/* Link Existing Dialog */}
      <LinkExistingThemesDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        snapshotId={snapshotId}
        existingThemeIds={themes.map(t => t.id)}
      />
    </div>
  );
}
