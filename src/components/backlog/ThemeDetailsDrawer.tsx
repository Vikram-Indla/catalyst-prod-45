/**
 * =====================================================
 * Theme Details Drawer - Enterprise Strategy-Grade Editor
 * =====================================================
 * 
 * Single-page sections layout (no tabs) for strategic theme editing.
 * Follows Business Demand Drawer shell pattern but simplified for strategy.
 * 
 * Sections:
 * 1. Strategic Context (Snapshot, State, Description)
 * 2. Objectives (linked items)
 * 3. Aligned Epics (linked items)
 * 4. Audit History (collapsible)
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trash2, Copy, X, Pencil, Link as LinkIcon, ChevronDown, 
  Maximize2, Minimize2, MoreVertical, Plus, ChevronRight 
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';
import { UnifiedAuditHistoryTab } from '@/components/shared/UnifiedAuditHistoryTab';
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';
import { toast } from 'sonner';

interface Theme {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  portfolio_ask_date?: string | null;
  color_tag?: string | null;
  owner_id?: string | null;
  snapshot_id?: string | null;
  created_at: string;
}

interface ThemeDetailsDrawerProps {
  theme: Theme | null;
  isOpen: boolean;
  onClose: () => void;
}

// Generate short theme ID from UUID
function formatThemeKey(id: string): string {
  return `TH-${id.slice(0, 4)}`;
}

// Strategic theme states - maps DB values to strategic labels
const THEME_STATES: Record<string, string> = {
  'proposed': 'Draft',
  'active': 'Active',
  'done': 'Retired',
  'cancelled': 'Cancelled',
};

export function ThemeDetailsDrawer({ theme, isOpen, onClose }: ThemeDetailsDrawerProps) {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<Partial<Theme>>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [showLinkObjectiveDialog, setShowLinkObjectiveDialog] = useState(false);
  const [showLinkEpicDialog, setShowLinkEpicDialog] = useState(false);
  const [auditHistoryOpen, setAuditHistoryOpen] = useState(false);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedEpic, setSelectedEpic] = useState<any>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form data when theme changes
  useEffect(() => {
    if (theme) {
      setFormData({
        name: theme.name,
        description: theme.description,
        status: theme.status,
        snapshot_id: theme.snapshot_id,
      });
      setEditedName(theme.name);
      setHasChanges(false);
    }
  }, [theme]);

  // Fetch snapshot name for read-only display
  const { data: snapshot } = useQuery({
    queryKey: ['snapshot-name', theme?.snapshot_id],
    queryFn: async () => {
      if (!theme?.snapshot_id) return null;
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .select('id, name')
        .eq('id', theme.snapshot_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!theme?.snapshot_id,
  });

  // Fetch linked objectives
  const { data: objectives = [] } = useQuery({
    queryKey: ['theme-objectives', theme?.id],
    queryFn: async () => {
      if (!theme?.id) return [];
      const { data, error } = await supabase
        .from('objectives')
        .select('id, name, status, overall_progress')
        .eq('theme_id', theme.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!theme?.id,
  });

  // Fetch linked epics
  const { data: epics = [] } = useQuery({
    queryKey: ['theme-epics', theme?.id],
    queryFn: async () => {
      if (!theme?.id) return [];
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key, state')
        .eq('theme_id', theme.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!theme?.id,
  });

  // Fetch available objectives for linking
  const { data: availableObjectives = [] } = useQuery({
    queryKey: ['available-objectives-for-theme', theme?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objectives')
        .select('id, name')
        .is('theme_id', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: showLinkObjectiveDialog,
  });

  // Fetch available epics for linking
  const { data: availableEpics = [] } = useQuery({
    queryKey: ['available-epics-for-theme', theme?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key')
        .is('theme_id', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: showLinkEpicDialog,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Theme>) => {
      if (!theme) throw new Error('No theme selected');
      const updatePayload: Record<string, any> = {
        name: data.name,
        description: data.description,
      };
      if (data.status) {
        updatePayload.status = data.status as 'proposed' | 'active' | 'done' | 'cancelled';
      }
      const { error } = await supabase
        .from('strategic_themes')
        .update(updatePayload)
        .eq('id', theme.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Theme saved');
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error('Failed to save theme');
    },
  });

  // Save name mutation
  const saveNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!theme) throw new Error('No theme selected');
      const { error } = await supabase
        .from('strategic_themes')
        .update({ name: newName })
        .eq('id', theme.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Theme name updated');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!theme) throw new Error('No theme selected');
      const { error } = await supabase
        .from('strategic_themes')
        .delete()
        .eq('id', theme.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Theme deleted');
      onClose();
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!theme) throw new Error('No theme selected');
      const { error } = await supabase
        .from('strategic_themes')
        .insert({
          name: `${theme.name} (Copy)`,
          description: theme.description,
          status: 'proposed' as const,
          snapshot_id: theme.snapshot_id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Theme duplicated');
    },
  });

  // Link objective mutation
  const linkObjectiveMutation = useMutation({
    mutationFn: async (objectiveId: string) => {
      const { error } = await supabase
        .from('objectives')
        .update({ theme_id: theme?.id })
        .eq('id', objectiveId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-objectives', theme?.id] });
      queryClient.invalidateQueries({ queryKey: ['available-objectives-for-theme'] });
      toast.success('Objective linked');
      setShowLinkObjectiveDialog(false);
    },
  });

  // Link epic mutation
  const linkEpicMutation = useMutation({
    mutationFn: async (epicId: string) => {
      const { error } = await supabase
        .from('epics')
        .update({ theme_id: theme?.id })
        .eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-epics', theme?.id] });
      queryClient.invalidateQueries({ queryKey: ['available-epics-for-theme'] });
      toast.success('Epic linked');
      setShowLinkEpicDialog(false);
    },
  });

  if (!theme) return null;

  const drawerWidthClass = isExpanded
    ? 'w-screen sm:w-[70vw] sm:max-w-[1120px]'
    : 'w-screen sm:w-[65vw] sm:max-w-[980px]';

  const handleCopyLink = () => {
    const url = `${window.location.origin}/backlog/themes/${theme.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  const handleStartEditName = () => {
    setIsEditingName(true);
    setEditedName(formData.name || theme.name);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== theme.name) {
      setFormData(prev => ({ ...prev, name: editedName.trim() }));
      saveNameMutation.mutate(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(formData.name || theme.name);
    }
  };

  const handleAttemptClose = () => {
    if (hasChanges) {
      setShowUnsavedChangesDialog(true);
    } else {
      onClose();
    }
  };

  const handleSave = () => saveMutation.mutate(formData);
  const handleSaveAndClose = () => {
    saveMutation.mutate(formData, { onSuccess: () => onClose() });
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <SheetContent
          side="right"
          hideClose
          className={`executive-drawer ${drawerWidthClass} p-0 flex flex-col overflow-hidden bg-white dark:bg-surface-1`}
        >
          <SheetHeader className="executive-drawer-header flex-col space-y-0 shrink-0 p-0 bg-white dark:bg-surface-1">
            {/* Header Row */}
            <div className="flex items-center justify-between px-4 md:px-5 pt-4 pb-3 border-b border-brand-gold">
              {/* Left: Theme Key + Title */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm font-medium text-brand-gold">
                    {formatThemeKey(theme.id)}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="text-muted-foreground/60 hover:text-brand-gold transition-colors p-0.5"
                    title="Copy link"
                  >
                    <LinkIcon className="h-3 w-3" />
                  </button>
                </div>

                {/* Editable title */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0 group">
                  {isEditingName ? (
                    <Input
                      ref={nameInputRef}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={handleNameKeyDown}
                      className="text-base font-medium h-auto py-1 px-2 border-brand-gold/50 focus:border-brand-gold"
                    />
                  ) : (
                    <>
                      <SheetTitle className="truncate text-base font-medium">
                        {formData.name || theme.name}
                      </SheetTitle>
                      <button
                        onClick={handleStartEditName}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-brand-gold transition-all p-0.5"
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Right: Save + Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-sm font-medium bg-brand-gold hover:bg-brand-gold-hover text-white"
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? 'Saving...' : 'Save'}
                      <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[400]">
                    <DropdownMenuItem onSelect={handleSave}>Save</DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleSaveAndClose}>Save & Close</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 z-[400]">
                    <DropdownMenuItem onSelect={() => duplicateMutation.mutate()}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Theme
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => deleteMutation.mutate()} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Theme
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8">
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>

                <Button variant="ghost" size="icon" onClick={handleAttemptClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <SheetDescription className="sr-only">Theme details panel</SheetDescription>
          </SheetHeader>

          {/* Single-page scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-5 space-y-6">
              
              {/* SECTION 1: Strategic Context */}
              <section className="border border-border rounded-lg bg-card p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">
                  Strategic Context
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Strategic Snapshot (read-only) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Strategic Snapshot</Label>
                    <div className="h-9 px-3 flex items-center bg-muted/50 border border-border rounded-md text-sm">
                      {snapshot?.name || 'No snapshot assigned'}
                    </div>
                  </div>
                  
                  {/* State */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">State</Label>
                    <Select 
                      value={formData.status || 'proposed'} 
                      onValueChange={(v) => handleFieldChange('status', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[400]">
                        {Object.entries(THEME_STATES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Description</Label>
                  <RichTextEditor
                    value={formData.description || ''}
                    onChange={(value) => handleFieldChange('description', value)}
                    placeholder="Describe the strategic intent of this theme..."
                  />
                </div>
              </section>

              {/* SECTION 2: Objectives */}
              <section className="border border-border rounded-lg bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Objectives {objectives.length > 0 && <span className="text-brand-gold">({objectives.length})</span>}
                  </h3>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowLinkObjectiveDialog(true)}>
                    <Plus className="h-3 w-3" />
                    Link Objective
                  </Button>
                </div>
                
                {objectives.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    No objectives linked to this theme
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {objectives.map((obj) => (
                      <div key={obj.id} className="py-2.5 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium truncate">{obj.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {obj.status && (
                            <Badge variant="outline" className="text-xs">{obj.status}</Badge>
                          )}
                          {obj.overall_progress !== null && (
                            <span className="text-xs text-muted-foreground">
                              {Math.round((obj.overall_progress || 0) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* SECTION 3: Aligned Epics */}
              <section className="border border-border rounded-lg bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Aligned Epics {epics.length > 0 && <span className="text-brand-gold">({epics.length})</span>}
                  </h3>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowLinkEpicDialog(true)}>
                    <Plus className="h-3 w-3" />
                    Link Epic
                  </Button>
                </div>
                
                {epics.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    No epics linked to this theme
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {epics.map((epic) => (
                      <div 
                        key={epic.id} 
                        className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                        onClick={() => {
                          setSelectedEpic(epic);
                          setSelectedEpicId(epic.id);
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono text-muted-foreground shrink-0">
                            {epic.epic_key || 'E-???'}
                          </span>
                          <span className="text-sm font-medium truncate">{epic.name}</span>
                        </div>
                        {epic.state && (
                          <Badge variant="outline" className="text-xs shrink-0">{epic.state}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* SECTION 4: Audit History (Collapsible) */}
              <Collapsible open={auditHistoryOpen} onOpenChange={setAuditHistoryOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Audit History
                    </h3>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${auditHistoryOpen ? 'rotate-90' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border border-t-0 border-border rounded-b-lg bg-card p-4 -mt-2">
                    <div className="h-[400px]">
                      <UnifiedAuditHistoryTab entityType="theme" entityId={theme.id} />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Link Objective Dialog - Enterprise Grade */}
      <Dialog open={showLinkObjectiveDialog} onOpenChange={setShowLinkObjectiveDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader className="border-b border-brand-gold/30 pb-4">
            <DialogTitle className="text-lg font-semibold">Link Objective to Theme</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Select an objective to link to this strategic theme
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {availableObjectives.length > 0 ? (
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-2">
                  {availableObjectives.map((obj) => (
                    <button
                      key={obj.id}
                      onClick={() => linkObjectiveMutation.mutate(obj.id)}
                      className="w-full text-left p-3 border border-border rounded-lg hover:border-brand-gold hover:bg-brand-gold/5 transition-colors text-sm group"
                    >
                      <span className="group-hover:text-brand-gold transition-colors">{obj.name}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">No unlinked objectives available</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create objectives first to link them</p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowLinkObjectiveDialog(false)}
              className="border-border hover:bg-muted"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Epic Dialog - Enterprise Grade */}
      <Dialog open={showLinkEpicDialog} onOpenChange={setShowLinkEpicDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader className="border-b border-brand-gold/30 pb-4">
            <DialogTitle className="text-lg font-semibold">Link Epic to Theme</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Select an epic to align with this strategic theme
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {availableEpics.length > 0 ? (
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-2">
                  {availableEpics.map((epic) => (
                    <button
                      key={epic.id}
                      onClick={() => linkEpicMutation.mutate(epic.id)}
                      className="w-full text-left p-3 border border-border rounded-lg hover:border-brand-gold hover:bg-brand-gold/5 transition-colors text-sm group"
                    >
                      <span className="font-mono text-xs text-brand-gold mr-2">{epic.epic_key}</span>
                      <span className="group-hover:text-brand-gold transition-colors">{epic.name}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">No unlinked epics available</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create epics first to link them</p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowLinkEpicDialog(false)}
              className="border-border hover:bg-muted"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowUnsavedChangesDialog(false); onClose(); }} className="bg-destructive text-destructive-foreground">
              Discard
            </AlertDialogAction>
            <AlertDialogAction onClick={() => { setShowUnsavedChangesDialog(false); handleSaveAndClose(); }} className="bg-brand-gold text-white hover:bg-brand-gold-hover">
              Save & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Epic Details Panel */}
      {selectedEpic && (
        <EpicDetailsPanel
          epic={selectedEpic}
          open={!!selectedEpicId}
          onClose={() => {
            setSelectedEpicId(null);
            setSelectedEpic(null);
          }}
        />
      )}
    </>
  );
}
