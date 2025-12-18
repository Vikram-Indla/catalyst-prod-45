/**
 * =====================================================
 * Theme Details Drawer - Premium Enterprise Work Item Panel
 * =====================================================
 * 
 * CIO-grade detail drawer with clear header, well-spaced sections,
 * and premium empty states. Token-based colors throughout.
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trash2, Copy, X, Pencil, Link as LinkIcon, ChevronDown, 
  Maximize2, Minimize2, MoreVertical, Plus, ChevronRight,
  Target, Layers, Clock, User, FileText, History
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

// Progress indicator for objectives
function ProgressBar({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  const color = percentage >= 70 ? 'var(--status-success)' : percentage >= 40 ? 'var(--status-warning)' : 'var(--status-danger)';
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-16 h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--progress-track)' }}
      >
        <div 
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <span 
        className="text-[10px] font-mono tabular-nums"
        style={{ color: 'var(--text-muted)' }}
      >
        {percentage}%
      </span>
    </div>
  );
}

// Section header component
function SectionHeader({ 
  icon: Icon, 
  title, 
  count, 
  action 
}: { 
  icon: React.ElementType; 
  title: string; 
  count?: number; 
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2">
        <div 
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ backgroundColor: 'var(--surface-subtle)' }}
        >
          <Icon size={12} style={{ color: 'var(--text-muted)' }} />
        </div>
        <span 
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span 
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'var(--brand-gold-bg)', color: 'var(--brand-gold)' }}
          >
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

// Empty state component
function EmptyState({ icon: Icon, message, hint }: { icon: React.ElementType; message: string; hint?: string }) {
  return (
    <div className="py-6 flex flex-col items-center justify-center text-center">
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
        style={{ backgroundColor: 'var(--surface-subtle)' }}
      >
        <Icon size={14} style={{ color: 'var(--text-muted)' }} />
      </div>
      <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {hint && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

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

  // Fetch linked objectives
  const { data: objectives = [] } = useQuery({
    queryKey: ['theme-objectives', theme?.id],
    queryFn: async () => {
      if (!theme?.id) return [];
      const { data, error } = await supabase
        .from('objectives')
        .select('id, name, status, overall_progress, health')
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
      if (!theme?.id) return [];
      const { data, error } = await supabase
        .from('objectives')
        .select('id, name, status')
        .neq('theme_id', theme.id)
        .order('name');
      if (error) throw error;
      const { data: unlinkedData } = await supabase
        .from('objectives')
        .select('id, name, status')
        .is('theme_id', null)
        .order('name');
      const combined = [...(data || []), ...(unlinkedData || [])];
      const unique = combined.filter((item, index, self) => 
        index === self.findIndex((t) => t.id === item.id)
      );
      return unique;
    },
    enabled: showLinkObjectiveDialog && !!theme?.id,
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
                {/* ID + Link */}
                <div className="flex items-center gap-2 mb-1.5">
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
                      <button
                        onClick={handleStartEditName}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                        style={{ color: 'var(--text-muted)' }}
                        title="Rename"
                      >
                        <Pencil size={12} />
                      </button>
                    </>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex items-center gap-1">
                    <Clock size={10} />
                    <span>Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}</span>
                  </div>
                  {snapshot && (
                    <div className="flex items-center gap-1">
                      <Target size={10} />
                      <span>{snapshot.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
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

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4 md:p-5 space-y-4">
              
              {/* SECTION 1: Strategic Context */}
              <section 
                className="rounded-lg p-4"
                style={{ 
                  backgroundColor: 'var(--surface-bg)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <SectionHeader icon={FileText} title="Strategic Context" />
                
                <div className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Snapshot (read-only) */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Snapshot
                      </Label>
                      <div 
                        className="h-8 px-3 flex items-center rounded-md text-[12px]"
                        style={{ 
                          backgroundColor: 'var(--surface-subtle)', 
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {snapshot?.name || 'No snapshot assigned'}
                      </div>
                    </div>
                    
                    {/* State */}
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
                  </div>

                  {/* Description */}
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
              </section>

              {/* SECTION 2: Linked Objectives */}
              <section 
                className="rounded-lg p-4"
                style={{ 
                  backgroundColor: 'var(--surface-bg)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <SectionHeader 
                  icon={Target} 
                  title="Linked Objectives" 
                  count={objectives.length}
                  action={
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
                  }
                />
                
                <div className="pt-3">
                  {objectives.length === 0 ? (
                    <EmptyState 
                      icon={Target} 
                      message="No objectives linked" 
                      hint="Link objectives to track strategic alignment"
                    />
                  ) : (
                    <div className="space-y-1">
                      {objectives.map((obj) => (
                        <div 
                          key={obj.id} 
                          className="flex items-center justify-between gap-3 py-2 px-2 rounded-md transition-colors cursor-pointer"
                          style={{ backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span 
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
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
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {obj.overall_progress !== null && (
                              <ProgressBar value={obj.overall_progress || 0} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* SECTION 3: Aligned Epics */}
              <section 
                className="rounded-lg p-4"
                style={{ 
                  backgroundColor: 'var(--surface-bg)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <SectionHeader 
                  icon={Layers} 
                  title="Aligned Epics" 
                  count={epics.length}
                  action={
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
                  }
                />
                
                <div className="pt-3">
                  {epics.length === 0 ? (
                    <EmptyState 
                      icon={Layers} 
                      message="No epics aligned" 
                      hint="Link epics to show delivery alignment"
                    />
                  ) : (
                    <div className="space-y-1">
                      {epics.map((epic) => (
                        <div 
                          key={epic.id} 
                          className="flex items-center justify-between gap-3 py-2 px-2 rounded-md transition-colors cursor-pointer"
                          style={{ backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          onClick={() => {
                            setSelectedEpic(epic);
                            setSelectedEpicId(epic.id);
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span 
                              className="text-[9px] font-mono"
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
                            <StatusChip status={epic.state} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* SECTION 4: Audit History (Collapsible) */}
              <Collapsible open={auditHistoryOpen} onOpenChange={setAuditHistoryOpen}>
                <CollapsibleTrigger asChild>
                  <button 
                    className="w-full flex items-center justify-between p-4 rounded-lg transition-colors"
                    style={{ 
                      backgroundColor: 'var(--surface-bg)',
                      border: '1px solid var(--border-default)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-bg)'}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: 'var(--surface-subtle)' }}
                      >
                        <History size={12} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <span 
                        className="text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Audit History
                      </span>
                    </div>
                    <ChevronRight 
                      size={14} 
                      className={cn("transition-transform", auditHistoryOpen && "rotate-90")}
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div 
                    className="rounded-b-lg p-4 -mt-1"
                    style={{ 
                      backgroundColor: 'var(--surface-bg)',
                      border: '1px solid var(--border-default)',
                      borderTop: 'none',
                    }}
                  >
                    <div className="h-[360px]">
                      <UnifiedAuditHistoryTab entityType="theme" entityId={theme.id} />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Link Objective Dialog */}
      <Dialog open={showLinkObjectiveDialog} onOpenChange={setShowLinkObjectiveDialog}>
        <DialogContent 
          className="sm:max-w-md"
          style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--border-default)' }}
        >
          <DialogHeader style={{ borderBottom: '1px solid var(--border-subtle)' }} className="pb-4">
            <DialogTitle className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Link Objective
            </DialogTitle>
            <DialogDescription className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Select an objective to link to this theme
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {availableObjectives.length > 0 ? (
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-1.5">
                  {availableObjectives.map((obj) => (
                    <button
                      key={obj.id}
                      onClick={() => linkObjectiveMutation.mutate(obj.id)}
                      className="w-full text-left p-3 rounded-lg text-[12px] transition-colors"
                      style={{ 
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--brand-primary)';
                        e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.backgroundColor = 'var(--surface-subtle)';
                      }}
                    >
                      {obj.name}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyState 
                icon={Target} 
                message="No unlinked objectives" 
                hint="Create objectives first"
              />
            )}
          </div>

          <DialogFooter style={{ borderTop: '1px solid var(--border-subtle)' }} className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowLinkObjectiveDialog(false)}
              className="text-[12px]"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Epic Dialog */}
      <Dialog open={showLinkEpicDialog} onOpenChange={setShowLinkEpicDialog}>
        <DialogContent 
          className="sm:max-w-md"
          style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--border-default)' }}
        >
          <DialogHeader style={{ borderBottom: '1px solid var(--border-subtle)' }} className="pb-4">
            <DialogTitle className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Link Epic
            </DialogTitle>
            <DialogDescription className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Select an epic to align with this theme
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {availableEpics.length > 0 ? (
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-1.5">
                  {availableEpics.map((epic) => (
                    <button
                      key={epic.id}
                      onClick={() => linkEpicMutation.mutate(epic.id)}
                      className="w-full text-left p-3 rounded-lg text-[12px] transition-colors"
                      style={{ 
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--brand-primary)';
                        e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.backgroundColor = 'var(--surface-subtle)';
                      }}
                    >
                      <span className="font-mono text-[10px] mr-2" style={{ color: 'var(--secondary-bronze)' }}>
                        {epic.epic_key}
                      </span>
                      {epic.name}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyState 
                icon={Layers} 
                message="No unlinked epics" 
                hint="Create epics first"
              />
            )}
          </div>

          <DialogFooter style={{ borderTop: '1px solid var(--border-subtle)' }} className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowLinkEpicDialog(false)}
              className="text-[12px]"
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
            <AlertDialogAction 
              onClick={() => { setShowUnsavedChangesDialog(false); onClose(); }} 
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
