/**
 * EpicDrawer - Epic Details Drawer with BusinessRequestDrawer UI
 * 
 * Matches BusinessRequestDrawer layout/styling exactly.
 * Uses Epic data, not BusinessRequest data.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
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
} from "@/components/ui/alert-dialog";
import { 
  X, 
  Pencil, 
  Link as LinkIcon, 
  Maximize2, 
  Minimize2,
  MoreVertical,
  Trash2,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Epic-specific tabs
import { EpicDetailsViewTab } from './drawer-tabs/EpicDetailsViewTab';
import { TechnicalScoreViewTab } from './drawer-tabs/TechnicalScoreViewTab';
import { EpicBudgetViewTab } from './drawer-tabs/EpicBudgetViewTab';
import { EpicRisksViewTab } from './drawer-tabs/EpicRisksViewTab';
import { EpicLinksViewTab } from './drawer-tabs/EpicLinksViewTab';
import { EpicFeaturesViewTab } from './drawer-tabs/EpicFeaturesViewTab';
import { EpicAuditHistoryTab } from './drawer-tabs/EpicAuditHistoryTab';
import { EpicDependenciesTab } from './drawer-tabs/EpicDependenciesTab';
import { EpicStatusDropdown } from './drawer/EpicStatusDropdown';

// Auto-save delay (ms)
const AUTO_SAVE_DELAY = 800;

// Tabs for Epic drawer
const EPIC_TABS = [
  { value: 'epic-details', label: 'Epic Details' },
  { value: 'technical-score', label: 'Technical Score' },
  { value: 'budget', label: 'Budget' },
  { value: 'risks', label: 'Risks' },
  { value: 'dependencies', label: 'Dependencies' },
  { value: 'links', label: 'Links' },
  { value: 'features', label: 'Features' },
  { value: 'audit-history', label: 'Audit History' },
];

interface EpicDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  epicId: string | null;
  onEpicChange?: (newEpicId: string) => void;
}

export function EpicDrawer({ isOpen, onClose, epicId, onEpicChange }: EpicDrawerProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Fetch epic data
  const { data: epic, isLoading } = useQuery({
    queryKey: ['epic-drawer', epicId],
    queryFn: async () => {
      if (!epicId) return null;
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .eq('id', epicId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!epicId && isOpen,
  });
  
  const [activeTab, setActiveTab] = useState('epic-details');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [originalData, setOriginalData] = useState<Record<string, any>>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const tabsBodyScrollRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Record<string, any>>({});
  const skipNextFormResetRef = useRef(false);

  // Reset to default tab when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('epic-details');
    }
  }, [isOpen]);

  // Reset scroll position when switching tabs
  useEffect(() => {
    tabsBodyScrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab, epicId]);

  // Sync form data when epic changes
  useEffect(() => {
    if (epic) {
      if (!skipNextFormResetRef.current) {
        setFormData(epic);
        setOriginalData(epic);
        setEditedName(epic.name || '');
      } else {
        setOriginalData(epic);
      }
      skipNextFormResetRef.current = false;
    }
  }, [epic]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (!epicId) throw new Error('No epic ID');
      const { error } = await supabase
        .from('epics')
        .update(data)
        .eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['epic-drawer', epicId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
    },
    onError: (error) => {
      toast.error('Failed to save epic: ' + error.message);
    }
  });

  // Delete mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!epicId) throw new Error('No epic ID');
      const { error } = await supabase
        .from('epics')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Epic deleted');
      onClose();
    },
    onError: () => {
      toast.error('Failed to delete epic');
    }
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!epic) throw new Error('No epic data');
      const { data, error } = await supabase
        .from('epics')
        .insert([{
          name: `${epic.name} (Copy)`,
          description: epic.description || null,
          primary_program_id: epic.primary_program_id || null,
          theme_id: epic.theme_id || null,
          health: epic.health || null,
          owner_id: epic.owner_id || null,
          mvp: false,
          state: 'not_started',
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newEpic) => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Epic duplicated');
      if (onEpicChange) {
        onEpicChange(newEpic.id);
      }
    },
    onError: () => {
      toast.error('Failed to duplicate epic');
    }
  });

  // Auto-save function
  const performAutoSave = useCallback(async (dataToSave: Record<string, any>) => {
    if (!epicId) return;

    setIsSaving(true);

    try {
      await updateMutation.mutateAsync(dataToSave);
      setOriginalData(dataToSave);
      skipNextFormResetRef.current = true;

      // Show saved indicator briefly
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [epicId, updateMutation]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => {
      // Handle batch updates (multiple fields at once)
      const newData = field === '_batch' && value && typeof value === 'object'
        ? { ...prev, ...value }
        : { ...prev, [field]: value };

      // Store pending changes for auto-save
      pendingChangesRef.current = newData;

      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Schedule auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave(pendingChangesRef.current);
      }, AUTO_SAVE_DELAY);

      return newData;
    });

    skipNextFormResetRef.current = true;
  }, [performAutoSave]);

  const handleDirtyChange = (isDirty: boolean) => {
    if (isDirty) {
      skipNextFormResetRef.current = true;
    }
  };

  const handleClose = () => {
    // Flush any pending auto-save before closing
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      // Perform immediate save if there are pending changes
      if (Object.keys(pendingChangesRef.current).length > 0) {
        performAutoSave(pendingChangesRef.current);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['epics'] });
    onClose();
  };

  // Copy link handler
  const handleCopyLink = () => {
    const url = `${window.location.origin}/program/${epic?.primary_program_id}/epic-backlog?epicId=${epicId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  // Edit name handlers
  const handleStartEditName = () => {
    setIsEditingName(true);
    setEditedName(epic?.name || '');
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== epic?.name && epicId) {
      updateMutation.mutate({ name: editedName.trim() }, {
        onSuccess: () => {
          setIsEditingName(false);
          queryClient.invalidateQueries({ queryKey: ['epic-drawer', epicId] });
        }
      });
    } else {
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(epic?.name || '');
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAdditionalOption = (action: string) => {
    switch (action) {
      case 'duplicate':
        duplicateMutation.mutate();
        break;
      case 'delete':
        setShowDeleteConfirm(true);
        break;
    }
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteConfirm(false);
  };

  // Drawer width - matches BusinessRequestDrawer
  const drawerWidthClass = isExpanded 
    ? 'fixed inset-0 w-screen h-screen max-w-none' 
    : 'w-screen sm:w-[65vw] sm:max-w-[980px]';

  if (!isOpen) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent 
          side="right" 
          hideClose 
          className={cn("p-0 flex flex-col", drawerWidthClass)}
          style={{ 
            background: 'var(--surface-bg, hsl(var(--background)))',
            borderLeft: '1px solid var(--border-default, hsl(var(--border)))'
          }}
        >
          <SheetHeader className="flex-col space-y-0 shrink-0 p-0">
            
            {/* ═══════════════════════════════════════════════════════════
                BREADCRUMB ROW - Matches BusinessRequestDrawer
                ═══════════════════════════════════════════════════════════ */}
            <div 
              className="px-5 pt-2.5 pb-1.5 flex items-center gap-1.5"
              style={{ borderBottom: '1px solid var(--border-subtle, hsl(var(--border)/0.5))' }}
            >
              <span 
                className="text-[10px] font-medium uppercase tracking-[0.5px]"
                style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
              >
                Epic Backlog
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>/</span>
              <span 
                className="text-[11px] font-semibold font-mono"
                style={{ color: '#8B7355' }}
              >
                {epic?.epic_key || '...'}
              </span>
              <button
                onClick={handleCopyLink}
                className="p-1 rounded hover:bg-[var(--surface-hover,hsl(var(--muted)))] transition-smooth press-scale"
                style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                title="Copy link"
              >
                <LinkIcon className="h-3 w-3" />
              </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                HERO ROW: Title + Status Badge - Matches BusinessRequestDrawer
                ═══════════════════════════════════════════════════════════ */}
            <div className="flex items-start justify-between px-5 py-4 gap-4">
              
              {/* Left Side: Title + Status Badge Row */}
              <div className="flex-1 min-w-0 space-y-2.5">
                
                {/* Title with Edit */}
                <div className="flex items-center gap-1.5 group">
                  {isEditingName ? (
                    <Input
                      ref={nameInputRef}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={handleNameKeyDown}
                      className="text-[22px] font-semibold h-auto py-1.5 px-2 max-w-[480px] border-[#c69c6d] focus-visible:ring-[#c69c6d]/20 focus-visible:glow-gold transition-smooth"
                      style={{ 
                        background: 'var(--surface-subtle, hsl(var(--muted)))',
                        color: 'var(--text-primary, hsl(var(--foreground)))'
                      }}
                    />
                  ) : (
                    <>
                      <SheetTitle 
                        className="text-[22px] font-semibold tracking-[-0.3px] truncate max-w-[520px] leading-tight"
                        style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}
                      >
                        {epic?.name || 'Loading...'}
                      </SheetTitle>
                      <button
                        onClick={handleStartEditName}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--surface-hover,hsl(var(--muted)))] transition-smooth press-scale"
                        style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Status Badge Row */}
                <div className="flex items-center gap-2.5">
                  {/* Status Dropdown - CLICKABLE */}
                  <EpicStatusDropdown
                    currentStatus={formData.state}
                    onChange={(status) => handleFieldChange('state', status)}
                  />

                  {/* MVP Badge */}
                  {formData.mvp && (
                    <div 
                      className="inline-flex items-center px-2 py-1 rounded text-[12px] font-semibold"
                      style={{
                        background: 'hsl(var(--muted))',
                        color: 'var(--text-primary, hsl(var(--foreground)))'
                      }}
                    >
                      MVP
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                
                {/* Auto-save indicator - smooth transition between states */}
                <div className="min-w-[70px] flex items-center justify-end">
                  <div 
                    className={`
                      flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
                      transition-all duration-300 ease-in-out
                      ${isSaving 
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 opacity-100' 
                        : showSavedIndicator 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 opacity-100' 
                          : 'opacity-0'
                      }
                    `}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : showSavedIndicator ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Saved</span>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* More Options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))] press-scale transition-smooth"
                      style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-48 z-[400] shadow-catalyst-lg"
                    style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}
                  >
                    <DropdownMenuItem onSelect={() => handleAdditionalOption('duplicate')}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Epic
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onSelect={() => handleAdditionalOption('delete')}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Epic
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Expand/Collapse */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleExpand}
                  className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))] press-scale transition-smooth"
                  style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>

                {/* Close */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleClose}
                  className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))] press-scale transition-smooth"
                  style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Bottom Border */}
            <div style={{ borderBottom: '1px solid var(--border-default, hsl(var(--border)))' }} />
            <SheetDescription className="sr-only">Epic details panel</SheetDescription>
          </SheetHeader>

          {/* ═══════════════════════════════════════════════════════════
              TABS - Catalyst Design System (Matches BusinessRequestDrawer)
              ═══════════════════════════════════════════════════════════ */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList 
              className="w-full justify-start rounded-none h-auto shrink-0 flex-nowrap px-5 bg-transparent py-0"
              style={{ borderBottom: '1px solid var(--border-default, hsl(var(--border)))' }}
            >
              {EPIC_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "relative px-3 md:px-4 py-3 text-xs md:text-[13px] font-medium whitespace-nowrap",
                    "bg-transparent border-none rounded-none",
                    "data-[state=inactive]:text-muted-foreground data-[state=active]:text-foreground",
                    // Active indicator
                    "after:absolute after:bottom-0 after:left-2 after:right-2",
                    "after:h-[2px] after:rounded-t-sm after:transition-all",
                    "data-[state=inactive]:after:bg-transparent data-[state=inactive]:after:opacity-0",
                    "data-[state=active]:after:bg-[#c69c6d] data-[state=active]:after:opacity-100"
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ═══════════════════════════════════════════════════════════
                DRAWER BODY
                ═══════════════════════════════════════════════════════════ */}
            <div 
              ref={tabsBodyScrollRef}
              className="flex-1 min-h-0 overflow-y-auto"
              style={{ background: 'var(--surface-subtle, hsl(var(--muted)/0.3))' }}
            >
              {/* Epic Details Tab */}
              <TabsContent value="epic-details" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                <EpicDetailsViewTab data={formData} onChange={handleFieldChange} />
              </TabsContent>
              
              {/* Technical Score Tab */}
              <TabsContent value="technical-score" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                <TechnicalScoreViewTab 
                  data={formData} 
                  onChange={handleFieldChange} 
                  epicId={epicId || undefined}
                  onDirtyChange={handleDirtyChange}
                />
              </TabsContent>
              
              {/* Budget Tab */}
              <TabsContent value="budget" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                <EpicBudgetViewTab data={formData} onChange={handleFieldChange} />
              </TabsContent>
              
              {/* Risks Tab */}
              <TabsContent value="risks" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                {epicId && <EpicRisksViewTab epicId={epicId} />}
              </TabsContent>
              
              {/* Dependencies Tab */}
              <TabsContent value="dependencies" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                {epicId && <EpicDependenciesTab epicId={epicId} epicName={epic?.name} />}
              </TabsContent>
              
              {/* Links Tab */}
              <TabsContent value="links" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                {epicId && <EpicLinksViewTab epicId={epicId} />}
              </TabsContent>
              
              {/* Features Tab */}
              <TabsContent value="features" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                {epicId && <EpicFeaturesViewTab epicId={epicId} />}
              </TabsContent>
              
              {/* Audit History Tab */}
              <TabsContent value="audit-history" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                {epicId && <EpicAuditHistoryTab epicId={epicId} />}
              </TabsContent>
            </div>
          </Tabs>

        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog - Matches BusinessRequestDrawer */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>Delete Epic</AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--text-secondary, hsl(var(--muted-foreground)))' }}>
              Are you sure you want to delete <span className="font-semibold">{epic?.epic_key}</span>? 
              This epic will be moved to deleted items and can be restored within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
