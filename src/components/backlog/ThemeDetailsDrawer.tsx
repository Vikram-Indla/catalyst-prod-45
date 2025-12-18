/**
 * =====================================================
 * Theme Intelligence Panel - Enterprise CIO-Grade Drawer
 * =====================================================
 * 
 * Executive-grade Theme details drawer with READ/EDIT modes,
 * KPI band, tabs layout, and enhanced link pickers.
 * NO HEALTH CONCEPT - Removed completely.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trash2, Copy, X, Pencil, Link as LinkIcon, ChevronDown, 
  Maximize2, Minimize2, MoreVertical, Plus, ChevronRight,
  Target, Layers, Clock, FileText, History, BarChart3,
  AlertTriangle, Search, ArrowUpDown, Eye
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { RichTextEditor } from '@/components/business-requests/RichTextEditor';
import { UnifiedAuditHistoryTab } from '@/components/shared/UnifiedAuditHistoryTab';
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';
import { LinkObjectivePicker } from './pickers/LinkObjectivePicker';
import { LinkEpicPicker } from './pickers/LinkEpicPicker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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
  updated_at?: string;
}

interface ThemeDetailsDrawerProps {
  theme: Theme | null;
  isOpen: boolean;
  onClose: () => void;
}

// Generate short theme ID from UUID
function formatThemeKey(id: string): string {
  return `TH-${id.slice(0, 4).toUpperCase()}`;
}

// Strategic theme states
const THEME_STATES: Record<string, { label: string; color: string; bg: string }> = {
  'proposed': { label: 'Draft', color: 'var(--text-muted)', bg: 'var(--surface-subtle)' },
  'active': { label: 'Active', color: 'var(--status-success)', bg: 'var(--status-success-bg)' },
  'done': { label: 'Retired', color: 'var(--text-muted)', bg: 'var(--surface-subtle)' },
  'cancelled': { label: 'Cancelled', color: 'var(--status-danger)', bg: 'var(--status-danger-bg)' },
};

// Epic states for breakdown
const EPIC_STATES: Record<string, { label: string; color: string }> = {
  'funnel': { label: 'Funnel', color: 'var(--text-muted)' },
  'candidate': { label: 'Candidate', color: 'var(--status-info)' },
  'analysis': { label: 'Analysis', color: 'var(--status-warning)' },
  'backlog': { label: 'Backlog', color: 'var(--brand-primary)' },
  'implementing': { label: 'Implementing', color: 'var(--status-success)' },
  'done': { label: 'Done', color: 'var(--text-muted)' },
};

/**
 * Normalize and clamp progress to 0-100%
 * Handles both fraction (0-1) and percent (0-100) values
 */
function normalizeProgress(value: number | null | undefined): { percent: number; overflow: boolean } {
  if (value === null || value === undefined) {
    return { percent: 0, overflow: false };
  }
  
  // If value is <= 1, treat as fraction (0.0 to 1.0)
  // Otherwise, treat as already a percentage
  const rawPercent = value <= 1 ? Math.round(value * 100) : Math.round(value);
  const overflow = rawPercent > 100;
  const percent = Math.max(0, Math.min(100, rawPercent));
  
  return { percent, overflow };
}

// Status chip component
function StatusChip({ status }: { status: string }) {
  const state = THEME_STATES[status] || THEME_STATES['proposed'];
  return (
    <span 
      className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: state.bg, color: state.color }}
    >
      {state.label}
    </span>
  );
}

// Progress bar with normalization
function ProgressBar({ value, showOverflowWarning = false }: { value: number | null; showOverflowWarning?: boolean }) {
  const { percent, overflow } = normalizeProgress(value);
  const color = percent >= 70 ? 'var(--status-success)' : percent >= 40 ? 'var(--status-warning)' : 'var(--status-danger)';
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <div 
          className="w-16 h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--progress-track)' }}
        >
          <div 
            className="h-full rounded-full transition-all"
            style={{ width: `${percent}%`, backgroundColor: color }}
          />
        </div>
        <span 
          className="text-[10px] font-mono tabular-nums"
          style={{ color: 'var(--text-muted)' }}
        >
          {percent}%
        </span>
        {showOverflowWarning && overflow && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle size={10} style={{ color: 'var(--status-warning)' }} />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Rollup exceeds 100%</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// KPI Card component
function KPICard({ 
  label, 
  value, 
  subValue, 
  icon: Icon,
  overflow
}: { 
  label: string; 
  value: string | number; 
  subValue?: string; 
  icon: React.ElementType;
  overflow?: boolean;
}) {
  return (
    <div 
      className="flex-1 min-w-[120px] p-3 rounded-lg"
      style={{ 
        backgroundColor: 'var(--surface-subtle)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={12} style={{ color: 'var(--text-muted)' }} />
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {overflow && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle size={10} style={{ color: 'var(--status-warning)' }} />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Rollup exceeds 100%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      {subValue && (
        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {subValue}
        </div>
      )}
    </div>
  );
}

// Empty state component
function EmptyState({ icon: Icon, message, hint }: { icon: React.ElementType; message: string; hint?: string }) {
  return (
    <div className="py-8 flex flex-col items-center justify-center text-center">
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
        style={{ backgroundColor: 'var(--surface-subtle)' }}
      >
        <Icon size={16} style={{ color: 'var(--text-muted)' }} />
      </div>
      <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {hint && <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

// Truncated description with expand
function TruncatedDescription({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Strip HTML for preview
  const plainText = content?.replace(/<[^>]*>/g, '') || '';
  const shouldTruncate = plainText.length > 150;
  const displayText = shouldTruncate && !isExpanded ? plainText.slice(0, 150) + '...' : plainText;
  
  return (
    <div>
      <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {displayText}
      </p>
      {shouldTruncate && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 text-[11px] font-medium"
          style={{ color: 'var(--brand-primary)' }}
        >
          {isExpanded ? 'Show less' : 'Expand'}
        </button>
      )}
    </div>
  );
}

export function ThemeDetailsDrawer({ theme, isOpen, onClose }: ThemeDetailsDrawerProps) {
  const queryClient = useQueryClient();
  
  // Mode state: READ (default) or EDIT
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<Partial<Theme>>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [showLinkObjectiveDialog, setShowLinkObjectiveDialog] = useState(false);
  const [showLinkEpicDialog, setShowLinkEpicDialog] = useState(false);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedEpic, setSelectedEpic] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Search and sort state for alignment lists
  const [objectiveSearch, setObjectiveSearch] = useState('');
  const [epicSearch, setEpicSearch] = useState('');
  const [objectiveSort, setObjectiveSort] = useState<'name' | 'progress'>('name');
  const [epicSort, setEpicSort] = useState<'name' | 'state'>('name');
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form data and mode when theme changes
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
      setMode('read'); // Always open in read mode
      setActiveTab('overview');
    }
  }, [theme]);

  // Fetch snapshot name
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

  // Fetch linked objectives (NO HEALTH FIELD)
  const { data: objectives = [] } = useQuery({
    queryKey: ['theme-objectives', theme?.id],
    queryFn: async () => {
      if (!theme?.id) return [];
      const { data, error } = await supabase
        .from('objectives')
        .select('id, name, status, overall_progress, owner_id, updated_at')
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
        .select('id, name, epic_key, state, owner_id, updated_at')
        .eq('theme_id', theme.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!theme?.id,
  });

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    // Calculate average progress across objectives
    const objectivesWithProgress = objectives.filter(o => o.overall_progress !== null);
    const avgObjectiveProgress = objectivesWithProgress.length > 0
      ? objectivesWithProgress.reduce((sum, o) => {
          const { percent } = normalizeProgress(o.overall_progress);
          return sum + percent;
        }, 0) / objectivesWithProgress.length
      : 0;
    
    // Check if any objective has overflow
    const hasOverflow = objectives.some(o => {
      const { overflow } = normalizeProgress(o.overall_progress);
      return overflow;
    });
    
    // Overall progress - use avg of objectives if available
    const overallProgress = normalizeProgress(avgObjectiveProgress / 100);
    
    // Epic state breakdown
    const epicStateBreakdown = epics.reduce((acc, epic) => {
      const state = epic.state || 'funnel';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Count gaps (themes without objectives or epics)
    const gaps = (objectives.length === 0 ? 1 : 0) + (epics.length === 0 ? 1 : 0);
    
    return {
      overallProgress: overallProgress.percent,
      overallOverflow: hasOverflow,
      objectiveCount: objectives.length,
      avgObjectiveProgress: Math.round(avgObjectiveProgress),
      epicCount: epics.length,
      epicStateBreakdown,
      gaps,
    };
  }, [objectives, epics]);

  // Filter and sort objectives
  const filteredObjectives = useMemo(() => {
    let result = [...objectives];
    
    if (objectiveSearch) {
      const search = objectiveSearch.toLowerCase();
      result = result.filter(o => o.name?.toLowerCase().includes(search));
    }
    
    if (objectiveSort === 'progress') {
      result.sort((a, b) => {
        const { percent: pA } = normalizeProgress(a.overall_progress);
        const { percent: pB } = normalizeProgress(b.overall_progress);
        return pB - pA;
      });
    } else {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    
    return result;
  }, [objectives, objectiveSearch, objectiveSort]);

  // Filter and sort epics
  const filteredEpics = useMemo(() => {
    let result = [...epics];
    
    if (epicSearch) {
      const search = epicSearch.toLowerCase();
      result = result.filter(e => 
        e.name?.toLowerCase().includes(search) || 
        e.epic_key?.toLowerCase().includes(search)
      );
    }
    
    if (epicSort === 'state') {
      const stateOrder = ['implementing', 'backlog', 'analysis', 'candidate', 'funnel', 'done'];
      result.sort((a, b) => {
        const aIdx = stateOrder.indexOf(a.state || 'funnel');
        const bIdx = stateOrder.indexOf(b.state || 'funnel');
        return aIdx - bIdx;
      });
    } else {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    
    return result;
  }, [epics, epicSearch, epicSort]);

  // Mutations
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
      setMode('read');
    },
    onError: () => {
      toast.error('Failed to save theme');
    },
  });

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

  if (!theme) return null;

  const drawerWidthClass = isExpanded
    ? 'w-screen sm:w-[75vw] sm:max-w-[1200px]'
    : 'w-screen sm:w-[65vw] sm:max-w-[900px]';

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

  const handleCancel = () => {
    if (hasChanges) {
      setShowUnsavedChangesDialog(true);
    } else {
      setMode('read');
    }
  };

  const handleDiscard = () => {
    setFormData({
      name: theme.name,
      description: theme.description,
      status: theme.status,
      snapshot_id: theme.snapshot_id,
    });
    setHasChanges(false);
    setMode('read');
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const lastUpdated = theme.updated_at || theme.created_at;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <SheetContent
          side="right"
          hideClose
          className={cn("p-0 flex flex-col overflow-hidden", drawerWidthClass)}
          style={{ backgroundColor: 'var(--surface-bg)' }}
        >
          {/* Left accent bar */}
          <div
            aria-hidden
            className="pointer-events-none fixed left-0 top-0 bottom-0 w-1 z-[201]"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          />
          
          <SheetHeader className="flex-col space-y-0 shrink-0 p-0">
            {/* Header Row */}
            <div 
              className="px-4 md:px-5 pt-4 pb-3 flex items-start justify-between gap-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              {/* Left: ID, Title, Meta */}
              <div className="flex-1 min-w-0">
                {/* ID + Status + Snapshot Lens */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span 
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--secondary-green-bg)', color: 'var(--secondary-green)' }}
                  >
                    {formatThemeKey(theme.id)}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="p-1 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    title="Copy link"
                  >
                    <LinkIcon size={12} />
                  </button>
                  <StatusChip status={formData.status || 'proposed'} />
                  
                  {/* Snapshot lens - shown once */}
                  {snapshot && (
                    <span 
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-muted)'
                      }}
                    >
                      <Eye size={10} className="inline mr-1" style={{ marginTop: -1 }} />
                      Viewing under: {snapshot.name}
                    </span>
                  )}
                </div>

                {/* Editable title */}
                <div className="flex items-center gap-1.5 group mb-2">
                  {isEditingName ? (
                    <Input
                      ref={nameInputRef}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={handleNameKeyDown}
                      className="text-[16px] font-semibold h-auto py-1 px-2"
                      style={{ 
                        backgroundColor: 'var(--surface-bg)', 
                        borderColor: 'var(--brand-primary)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  ) : (
                    <>
                      <SheetTitle 
                        className="truncate text-[16px] font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {formData.name || theme.name}
                      </SheetTitle>
                      {mode === 'edit' && (
                        <button
                          onClick={handleStartEditName}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                          style={{ color: 'var(--text-muted)' }}
                          title="Rename"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex items-center gap-1">
                    <Clock size={10} />
                    <span>Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {mode === 'read' ? (
                  // READ MODE: Edit button
                  <Button
                    size="sm"
                    className="h-7 px-3 text-[12px] font-medium"
                    style={{ 
                      backgroundColor: 'var(--brand-primary)', 
                      color: 'white',
                    }}
                    onClick={() => setMode('edit')}
                  >
                    <Pencil size={12} className="mr-1.5" />
                    Edit
                  </Button>
                ) : (
                  // EDIT MODE: Save dropdown + Cancel
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-[12px]"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-[12px] font-medium"
                          style={{ 
                            backgroundColor: 'var(--brand-primary)', 
                            color: 'white',
                          }}
                          disabled={saveMutation.isPending}
                        >
                          {saveMutation.isPending ? 'Saving...' : 'Save'}
                          <ChevronDown size={12} className="ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[400]">
                        <DropdownMenuItem onSelect={handleSave}>Save</DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleSaveAndClose}>Save & Close</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <MoreVertical size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 z-[400]">
                    <DropdownMenuItem onSelect={() => duplicateMutation.mutate()}>
                      <Copy size={12} className="mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => deleteMutation.mutate()} className="text-destructive">
                      <Trash2 size={12} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsExpanded(!isExpanded)} 
                  className="h-7 w-7"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </Button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleAttemptClose} 
                  className="h-7 w-7"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
            <SheetDescription className="sr-only">Theme details panel</SheetDescription>
          </SheetHeader>

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div 
              className="px-4 md:px-5 shrink-0"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <TabsList className="h-10 bg-transparent p-0 gap-4">
                <TabsTrigger 
                  value="overview" 
                  className="h-10 px-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-primary)] text-[12px] font-medium"
                  style={{ color: activeTab === 'overview' ? 'var(--brand-primary)' : 'var(--text-muted)' }}
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="alignment" 
                  className="h-10 px-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-primary)] text-[12px] font-medium"
                  style={{ color: activeTab === 'alignment' ? 'var(--brand-primary)' : 'var(--text-muted)' }}
                >
                  Alignment
                  <span 
                    className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--brand-gold-bg)', color: 'var(--brand-gold)' }}
                  >
                    {objectives.length + epics.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="activity" 
                  className="h-10 px-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-primary)] text-[12px] font-medium"
                  style={{ color: activeTab === 'activity' ? 'var(--brand-primary)' : 'var(--text-muted)' }}
                >
                  Activity
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <ScrollArea className="flex-1">
              <div className="p-4 md:p-5">
                
                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="mt-0 space-y-4">
                  {/* KPI Band */}
                  <div className="flex flex-wrap gap-3">
                    <KPICard 
                      icon={BarChart3}
                      label="Overall Progress" 
                      value={`${kpiMetrics.overallProgress}%`}
                      overflow={kpiMetrics.overallOverflow}
                    />
                    <KPICard 
                      icon={Target}
                      label="Objectives" 
                      value={kpiMetrics.objectiveCount}
                      subValue={kpiMetrics.objectiveCount > 0 ? `Avg: ${kpiMetrics.avgObjectiveProgress}%` : undefined}
                    />
                    <KPICard 
                      icon={Layers}
                      label="Epics" 
                      value={kpiMetrics.epicCount}
                      subValue={kpiMetrics.epicCount > 0 
                        ? Object.entries(kpiMetrics.epicStateBreakdown)
                            .filter(([_, count]) => count > 0)
                            .slice(0, 2)
                            .map(([state, count]) => `${count} ${EPIC_STATES[state]?.label || state}`)
                            .join(', ')
                        : undefined
                      }
                    />
                    {kpiMetrics.gaps > 0 && (
                      <KPICard 
                        icon={AlertTriangle}
                        label="Gaps" 
                        value={kpiMetrics.gaps}
                        subValue="Missing links"
                      />
                    )}
                  </div>

                  {/* Summary / Description */}
                  <section 
                    className="rounded-lg p-4"
                    style={{ 
                      backgroundColor: 'var(--surface-bg)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Description
                      </span>
                    </div>
                    
                    {mode === 'read' ? (
                      formData.description ? (
                        <TruncatedDescription content={formData.description} />
                      ) : (
                        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          No description provided
                        </p>
                      )
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            State
                          </Label>
                          <Select 
                            value={formData.status || 'proposed'} 
                            onValueChange={(v) => handleFieldChange('status', v)}
                          >
                            <SelectTrigger 
                              className="h-8 text-[12px]"
                              style={{ 
                                backgroundColor: 'var(--surface-bg)', 
                                borderColor: 'var(--border-default)',
                                color: 'var(--text-primary)'
                              }}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[400]">
                              {Object.entries(THEME_STATES).map(([value, { label }]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            Description
                          </Label>
                          <RichTextEditor
                            value={formData.description || ''}
                            onChange={(value) => handleFieldChange('description', value)}
                            placeholder="Describe the strategic intent..."
                          />
                        </div>
                      </div>
                    )}
                  </section>
                </TabsContent>

                {/* ALIGNMENT TAB */}
                <TabsContent value="alignment" className="mt-0 space-y-4">
                  {/* Linked Objectives */}
                  <section 
                    className="rounded-lg p-4"
                    style={{ 
                      backgroundColor: 'var(--surface-bg)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Target size={14} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          Linked Objectives
                        </span>
                        {objectives.length > 0 && (
                          <span 
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--brand-gold-bg)', color: 'var(--brand-gold)' }}
                          >
                            {objectives.length}
                          </span>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 text-[10px] gap-1"
                        style={{ color: 'var(--text-muted)' }}
                        onClick={() => setShowLinkObjectiveDialog(true)}
                      >
                        <Plus size={10} />
                        Link
                      </Button>
                    </div>
                    
                    {objectives.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="relative flex-1">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                          <Input
                            placeholder="Search objectives..."
                            value={objectiveSearch}
                            onChange={(e) => setObjectiveSearch(e.target.value)}
                            className="h-7 text-[11px] pl-7"
                            style={{ backgroundColor: 'var(--surface-subtle)', borderColor: 'var(--border-subtle)' }}
                          />
                        </div>
                        <Select value={objectiveSort} onValueChange={(v) => setObjectiveSort(v as 'name' | 'progress')}>
                          <SelectTrigger className="h-7 w-[100px] text-[10px]" style={{ backgroundColor: 'var(--surface-subtle)', borderColor: 'var(--border-subtle)' }}>
                            <ArrowUpDown size={10} className="mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[400]">
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="progress">Progress</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div>
                      {objectives.length === 0 ? (
                        <EmptyState 
                          icon={Target} 
                          message="No objectives linked" 
                          hint="Link objectives to track strategic alignment"
                        />
                      ) : filteredObjectives.length === 0 ? (
                        <EmptyState 
                          icon={Search} 
                          message="No matching objectives" 
                        />
                      ) : (
                        <div className="space-y-1">
                          {filteredObjectives.map((obj) => (
                            <div 
                              key={obj.id} 
                              className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-md transition-colors cursor-pointer"
                              style={{ backgroundColor: 'transparent' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span 
                                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                                  style={{ backgroundColor: 'var(--brand-gold-bg)', color: 'var(--brand-gold)' }}
                                >
                                  OBJ
                                </span>
                                <span 
                                  className="text-[12px] font-medium truncate"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  {obj.name}
                                </span>
                                {obj.status && (
                                  <span 
                                    className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                                    style={{ 
                                      backgroundColor: 'var(--surface-subtle)', 
                                      color: 'var(--text-muted)'
                                    }}
                                  >
                                    {obj.status.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <ProgressBar value={obj.overall_progress} showOverflowWarning />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Aligned Epics */}
                  <section 
                    className="rounded-lg p-4"
                    style={{ 
                      backgroundColor: 'var(--surface-bg)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Layers size={14} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          Aligned Epics
                        </span>
                        {epics.length > 0 && (
                          <span 
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--secondary-bronze-bg)', color: 'var(--secondary-bronze)' }}
                          >
                            {epics.length}
                          </span>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 text-[10px] gap-1"
                        style={{ color: 'var(--text-muted)' }}
                        onClick={() => setShowLinkEpicDialog(true)}
                      >
                        <Plus size={10} />
                        Link
                      </Button>
                    </div>
                    
                    {epics.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="relative flex-1">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                          <Input
                            placeholder="Search epics..."
                            value={epicSearch}
                            onChange={(e) => setEpicSearch(e.target.value)}
                            className="h-7 text-[11px] pl-7"
                            style={{ backgroundColor: 'var(--surface-subtle)', borderColor: 'var(--border-subtle)' }}
                          />
                        </div>
                        <Select value={epicSort} onValueChange={(v) => setEpicSort(v as 'name' | 'state')}>
                          <SelectTrigger className="h-7 w-[100px] text-[10px]" style={{ backgroundColor: 'var(--surface-subtle)', borderColor: 'var(--border-subtle)' }}>
                            <ArrowUpDown size={10} className="mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[400]">
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="state">State</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div>
                      {epics.length === 0 ? (
                        <EmptyState 
                          icon={Layers} 
                          message="No epics aligned" 
                          hint="Link epics to show delivery alignment"
                        />
                      ) : filteredEpics.length === 0 ? (
                        <EmptyState 
                          icon={Search} 
                          message="No matching epics" 
                        />
                      ) : (
                        <div className="space-y-1">
                          {filteredEpics.map((epic) => (
                            <div 
                              key={epic.id} 
                              className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-md transition-colors cursor-pointer"
                              style={{ backgroundColor: 'transparent' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              onClick={() => {
                                setSelectedEpic(epic);
                                setSelectedEpicId(epic.id);
                              }}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span 
                                  className="text-[10px] font-mono shrink-0"
                                  style={{ color: 'var(--secondary-bronze)' }}
                                >
                                  {epic.epic_key || 'E-???'}
                                </span>
                                <span 
                                  className="text-[12px] font-medium truncate"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  {epic.name}
                                </span>
                              </div>
                              {epic.state && (
                                <span 
                                  className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                                  style={{ 
                                    backgroundColor: 'var(--surface-subtle)', 
                                    color: EPIC_STATES[epic.state]?.color || 'var(--text-muted)'
                                  }}
                                >
                                  {EPIC_STATES[epic.state]?.label || epic.state}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                </TabsContent>

                {/* ACTIVITY TAB */}
                <TabsContent value="activity" className="mt-0">
                  <section 
                    className="rounded-lg p-4"
                    style={{ 
                      backgroundColor: 'var(--surface-bg)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <History size={14} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Audit History
                      </span>
                    </div>
                    <div className="h-[400px]">
                      <UnifiedAuditHistoryTab entityType="theme" entityId={theme.id} />
                    </div>
                  </section>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Link Objective Picker */}
      <LinkObjectivePicker
        open={showLinkObjectiveDialog}
        onClose={() => setShowLinkObjectiveDialog(false)}
        themeId={theme?.id}
        linkedObjectiveIds={objectives.map(o => o.id)}
        onLinked={() => {
          queryClient.invalidateQueries({ queryKey: ['theme-objectives', theme?.id] });
        }}
      />

      {/* Link Epic Picker */}
      <LinkEpicPicker
        open={showLinkEpicDialog}
        onClose={() => setShowLinkEpicDialog(false)}
        themeId={theme?.id}
        linkedEpicIds={epics.map(e => e.id)}
        onLinked={() => {
          queryClient.invalidateQueries({ queryKey: ['theme-epics', theme?.id] });
        }}
      />

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { 
                setShowUnsavedChangesDialog(false); 
                handleDiscard();
                if (mode === 'read') onClose();
              }} 
              className="bg-destructive text-destructive-foreground"
            >
              Discard
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={() => { setShowUnsavedChangesDialog(false); handleSaveAndClose(); }} 
              style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
            >
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
