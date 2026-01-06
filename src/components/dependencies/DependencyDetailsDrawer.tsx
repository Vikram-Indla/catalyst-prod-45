import { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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
  MoreVertical, 
  Bell, 
  History, 
  Copy, 
  Trash2, 
  RefreshCw, 
  X, 
  Link as LinkIcon,
  Layers,
  Calendar,
  CalendarIcon,
  AlertTriangle,
  Loader2,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WorkItemDependencyType, DependencyTypeV2, RiskLevel, DependencyLevelV2, DependencyStatus } from '@/lib/dependencies/types';
import { DEPENDENCY_TYPE_LABELS, DEPENDENCY_LEVEL_LABELS, DEPENDENCY_STATUS_LABELS } from '@/lib/dependencies/types';

// Auto-save delay (ms)
const AUTO_SAVE_DELAY = 800;

// Generate quarter options
const generateQuarterOptions = () => {
  const currentYear = new Date().getFullYear();
  const quarters: string[] = [];
  for (let year = currentYear - 1; year <= currentYear + 2; year++) {
    for (let q = 1; q <= 4; q++) {
      quarters.push(`Q${q} ${year}`);
    }
  }
  return quarters;
};

const QUARTER_OPTIONS = generateQuarterOptions();

const getCurrentQuarter = () => {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${quarter} ${now.getFullYear()}`;
};

// Derive quarter from a date
const deriveQuarterFromDate = (dateStr: string): string => {
  if (!dateStr) return getCurrentQuarter();
  const date = new Date(dateStr);
  const q = Math.ceil((date.getMonth() + 1) / 3);
  return `Q${q} ${date.getFullYear()}`;
};

// Audit Log Content Component
function AuditLogContent({ dependencyId }: { dependencyId?: string }) {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['dependency-audit-log', dependencyId],
    queryFn: async () => {
      if (!dependencyId) return [];
      const { data, error } = await supabase
        .from('dependency_audit_log')
        .select('*')
        .eq('dependency_id', dependencyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!dependencyId,
  });

  if (!dependencyId) {
    return (
      <div className="text-center text-sm py-12 text-muted-foreground">
        Save the dependency to see audit history
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center text-sm py-12 text-muted-foreground">
        Loading audit log...
      </div>
    );
  }

  if (!auditLogs?.length) {
    return (
      <div className="text-center text-sm py-12 text-muted-foreground">
        No audit entries yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {auditLogs.map((log: any) => (
        <div 
          key={log.id} 
          className="p-3 rounded-md border bg-muted/30 space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium capitalize">{log.action}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
          {log.field_changed && (
            <div className="text-xs text-muted-foreground">
              Field: <span className="font-medium">{log.field_changed}</span>
            </div>
          )}
          {(log.old_value || log.new_value) && (
            <div className="text-xs text-muted-foreground flex gap-2">
              {log.old_value && <span className="line-through">{log.old_value}</span>}
              {log.old_value && log.new_value && <span>→</span>}
              {log.new_value && <span className="font-medium">{log.new_value}</span>}
            </div>
          )}
          {log.notes && (
            <div className="text-xs text-muted-foreground">{log.notes}</div>
          )}
        </div>
      ))}
    </div>
  );
}

interface DependencyDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  dependencyId?: string;
}

export function DependencyDetailsDrawer({ open, onClose, dependencyId }: DependencyDetailsDrawerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const isEdit = !!dependencyId;

  // Auto-save refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Record<string, any>>({});
  const skipNextFormResetRef = useRef(false);

  // Form state (work-item-centric model)
  const [requestingWorkItemType, setRequestingWorkItemType] = useState<WorkItemDependencyType>('epic');
  const [requestingWorkItemId, setRequestingWorkItemId] = useState('');
  const [dependsOnWorkItemType, setDependsOnWorkItemType] = useState<WorkItemDependencyType>('epic');
  const [dependsOnWorkItemId, setDependsOnWorkItemId] = useState('');
  const [dependencyType, setDependencyType] = useState<DependencyTypeV2>('blocks');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('med');
  const [status, setStatus] = useState<DependencyStatus>('open');
  const [neededByDate, setNeededByDate] = useState('');
  const [committedByDate, setCommittedByDate] = useState('');
  const [neededBySprint, setNeededBySprint] = useState('');
  const [committedBySprint, setCommittedBySprint] = useState('');
  const [description, setDescription] = useState('');
  const [sourceBlocked, setSourceBlocked] = useState(false);
  const [sourceBlockedReason, setSourceBlockedReason] = useState('');
  const [targetDelayed, setTargetDelayed] = useState(false);
  const [targetDelayedReason, setTargetDelayedReason] = useState('');
  const [noWorkRequired, setNoWorkRequired] = useState(false);

  // Derived values
  const derivedLevel: DependencyLevelV2 = 
    requestingWorkItemType === 'epic' && dependsOnWorkItemType === 'epic' ? 'execution' :
    requestingWorkItemType === 'feature' && dependsOnWorkItemType === 'feature' ? 'delivery' :
    'cross_level';
  
  const derivedQuarter = neededByDate ? deriveQuarterFromDate(neededByDate) : getCurrentQuarter();

  // Fetch existing dependency
  const { data: existingDependency, isLoading: isLoadingDep } = useQuery({
    queryKey: ['dependency', dependencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(id, name, display_id),
          to_feature:features!dependencies_to_feature_id_fkey(id, name, display_id),
          requesting_team:teams!dependencies_requesting_team_id_fkey(id, name),
          depends_on_team:teams!dependencies_depends_on_team_id_fkey(id, name),
          external_entity:external_entities(id, name)
        `)
        .eq('id', dependencyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isEdit && open,
  });

  // Check if this is a legacy team-based dependency
  const isLegacyDependency = !!(
    existingDependency &&
    !existingDependency.requesting_work_item_id &&
    (existingDependency.requesting_team_id || existingDependency.depends_on_team_id)
  );

  // Fetch epics for picker
  const { data: epics } = useQuery({
    queryKey: ['epics-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key, program_id')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open && (requestingWorkItemType === 'epic' || dependsOnWorkItemType === 'epic'),
  });

  // Fetch features for picker
  const { data: features } = useQuery({
    queryKey: ['features-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, display_id, team_id, epic_id')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open && (requestingWorkItemType === 'feature' || dependsOnWorkItemType === 'feature'),
  });

  // Fetch iterations (sprints) for conditional sprint picker
  const { data: iterations } = useQuery({
    queryKey: ['iterations-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('iterations').select('id, name, start_date').order('start_date');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Populate form when dependency loads
  useEffect(() => {
    if (existingDependency && open) {
      if (skipNextFormResetRef.current) {
        skipNextFormResetRef.current = false;
        return;
      }
      const dep = existingDependency as any;
      
      // Work item fields (new model) - or derive from legacy fields
      const reqType: WorkItemDependencyType = dep.requesting_work_item_type || 
        (dep.from_feature_id ? 'feature' : 'epic');
      const reqId = dep.requesting_work_item_id || dep.from_feature_id || '';
      const depType: WorkItemDependencyType = dep.depends_on_work_item_type || 
        (dep.to_feature_id ? 'feature' : 'epic');
      const depId = dep.depends_on_work_item_id || dep.to_feature_id || '';
      
      setRequestingWorkItemType(reqType);
      setRequestingWorkItemId(reqId);
      setDependsOnWorkItemType(depType);
      setDependsOnWorkItemId(depId);
      setDependencyType(dep.type || 'blocks');
      setRiskLevel(dep.risk_level || 'med');
      setStatus(dep.status || 'open');
      setNeededByDate(dep.needed_by_date || '');
      setCommittedByDate(dep.committed_by_date || '');
      setNeededBySprint(dep.needed_by_sprint_id || '');
      setCommittedBySprint(dep.committed_by_sprint_id || '');
      setDescription(dep.description || '');
      setSourceBlocked(dep.source_blocked || dep.blocked_requestor || false);
      setSourceBlockedReason(dep.source_blocked_reason || dep.blocked_reason_requestor || '');
      setTargetDelayed(dep.target_delayed || dep.blocked_respondent || false);
      setTargetDelayedReason(dep.target_delayed_reason || dep.blocked_reason_respondent || '');
      setNoWorkRequired(dep.no_work_required || false);
    } else if (!isEdit && open) {
      // Reset for new creation
      resetForm();
    }
  }, [existingDependency, open, isEdit]);

  // Reset to default tab when drawer opens
  useEffect(() => {
    if (open) {
      setActiveTab('details');
    }
  }, [open]);

  const resetForm = () => {
    setRequestingWorkItemType('epic');
    setRequestingWorkItemId('');
    setDependsOnWorkItemType('epic');
    setDependsOnWorkItemId('');
    setDependencyType('blocks');
    setRiskLevel('med');
    setStatus('open');
    setNeededByDate('');
    setCommittedByDate('');
    setNeededBySprint('');
    setCommittedBySprint('');
    setDescription('');
    setSourceBlocked(false);
    setSourceBlockedReason('');
    setTargetDelayed(false);
    setTargetDelayedReason('');
    setNoWorkRequired(false);
    pendingChangesRef.current = {};
  };

  // Get work items for pickers
  const requestingWorkItems = requestingWorkItemType === 'epic' 
    ? epics?.map(e => ({ id: e.id, display: `${e.epic_key || e.id.slice(0, 8)} - ${e.name}` })) || []
    : features?.map(f => ({ id: f.id, display: `${f.display_id || f.id.slice(0, 8)} - ${f.name}` })) || [];

  const dependsOnWorkItems = (dependsOnWorkItemType === 'epic' 
    ? epics?.map(e => ({ id: e.id, display: `${e.epic_key || e.id.slice(0, 8)} - ${e.name}` })) || []
    : features?.map(f => ({ id: f.id, display: `${f.display_id || f.id.slice(0, 8)} - ${f.name}` })) || []
  ).filter(item => item.id !== requestingWorkItemId);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (!dependencyId) throw new Error('No dependency ID');
      const { error } = await supabase
        .from('dependencies')
        .update(data)
        .eq('id', dependencyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies-grid'] });
      queryClient.invalidateQueries({ queryKey: ['work-item-dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['dependency', dependencyId] });
    },
    onError: (error) => {
      toast.error('Failed to save dependency: ' + error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('dependencies').delete().eq('id', dependencyId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies-grid'] });
      queryClient.invalidateQueries({ queryKey: ['work-item-dependencies'] });
      toast.success('Dependency deleted');
      handleClose();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete dependency: ${error.message}`);
    },
  });

  // Build current form payload
  const buildPayload = useCallback(() => {
    return {
      requesting_work_item_id: requestingWorkItemId || null,
      requesting_work_item_type: requestingWorkItemType,
      depends_on_work_item_id: dependsOnWorkItemId || null,
      depends_on_work_item_type: dependsOnWorkItemType,
      dependency_level_v2: derivedLevel,
      is_cross_level_exception: false,
      type: dependencyType,
      risk_level: riskLevel,
      status,
      needed_by_date: neededByDate || null,
      committed_by_date: committedByDate || null,
      needed_by_sprint_id: neededBySprint || null,
      committed_by_sprint_id: committedBySprint || null,
      quarter: derivedQuarter,
      quarter_derived_from_date: !!neededByDate,
      description: description || null,
      source_blocked: sourceBlocked,
      source_blocked_reason: sourceBlocked ? sourceBlockedReason : null,
      target_delayed: targetDelayed,
      target_delayed_reason: targetDelayed ? targetDelayedReason : null,
      no_work_required: noWorkRequired,
      // Legacy fields for backwards compatibility
      from_feature_id: requestingWorkItemType === 'feature' ? requestingWorkItemId : null,
      to_feature_id: dependsOnWorkItemType === 'feature' ? dependsOnWorkItemId : null,
      // Clear legacy team fields for new model
      requesting_team_id: null,
      depends_on_team_id: null,
      blocked_requestor: sourceBlocked,
      blocked_respondent: targetDelayed,
      blocked_reason_requestor: sourceBlocked ? sourceBlockedReason : null,
      blocked_reason_respondent: targetDelayed ? targetDelayedReason : null,
    };
  }, [
    requestingWorkItemId, requestingWorkItemType, dependsOnWorkItemId, dependsOnWorkItemType,
    derivedLevel, dependencyType, riskLevel, status, neededByDate, committedByDate,
    neededBySprint, committedBySprint, derivedQuarter, description, sourceBlocked,
    sourceBlockedReason, targetDelayed, targetDelayedReason, noWorkRequired
  ]);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!dependencyId || !isEdit) return;

    const payload = buildPayload();
    if (!payload.requesting_work_item_id || !payload.depends_on_work_item_id || !payload.needed_by_date) {
      // Skip auto-save if required fields are missing
      return;
    }

    setIsSaving(true);

    try {
      await updateMutation.mutateAsync(payload);
      pendingChangesRef.current = {};
      skipNextFormResetRef.current = true;

      // Show saved indicator briefly
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [dependencyId, isEdit, buildPayload, updateMutation]);

  // Schedule auto-save
  const scheduleAutoSave = useCallback(() => {
    if (!isEdit) return;
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Schedule auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, AUTO_SAVE_DELAY);
  }, [isEdit, performAutoSave]);

  // Field change handlers with auto-save
  const handleRequestingWorkItemTypeChange = (v: WorkItemDependencyType) => {
    setRequestingWorkItemType(v);
    setRequestingWorkItemId('');
    scheduleAutoSave();
  };

  const handleRequestingWorkItemIdChange = (v: string) => {
    setRequestingWorkItemId(v);
    scheduleAutoSave();
  };

  const handleDependsOnWorkItemTypeChange = (v: WorkItemDependencyType) => {
    setDependsOnWorkItemType(v);
    setDependsOnWorkItemId('');
    scheduleAutoSave();
  };

  const handleDependsOnWorkItemIdChange = (v: string) => {
    setDependsOnWorkItemId(v);
    scheduleAutoSave();
  };

  const handleDependencyTypeChange = (v: DependencyTypeV2) => {
    setDependencyType(v);
    scheduleAutoSave();
  };

  const handleRiskLevelChange = (v: RiskLevel) => {
    setRiskLevel(v);
    scheduleAutoSave();
  };

  const handleStatusChange = (v: DependencyStatus) => {
    setStatus(v);
    scheduleAutoSave();
  };

  const handleNeededByDateChange = (date: Date | undefined) => {
    setNeededByDate(date ? format(date, 'yyyy-MM-dd') : '');
    scheduleAutoSave();
  };

  const handleCommittedByDateChange = (date: Date | undefined) => {
    setCommittedByDate(date ? format(date, 'yyyy-MM-dd') : '');
    scheduleAutoSave();
  };

  const handleNeededBySprintChange = (v: string) => {
    setNeededBySprint(v === "__none__" ? "" : v);
    scheduleAutoSave();
  };

  const handleCommittedBySprintChange = (v: string) => {
    setCommittedBySprint(v === "__none__" ? "" : v);
    scheduleAutoSave();
  };

  const handleDescriptionChange = (v: string) => {
    setDescription(v);
    scheduleAutoSave();
  };

  const handleSourceBlockedChange = (checked: boolean) => {
    setSourceBlocked(checked);
    scheduleAutoSave();
  };

  const handleSourceBlockedReasonChange = (v: string) => {
    setSourceBlockedReason(v);
    scheduleAutoSave();
  };

  const handleTargetDelayedChange = (checked: boolean) => {
    setTargetDelayed(checked);
    scheduleAutoSave();
  };

  const handleTargetDelayedReasonChange = (v: string) => {
    setTargetDelayedReason(v);
    scheduleAutoSave();
  };

  const handleNoWorkRequiredChange = (checked: boolean) => {
    setNoWorkRequired(checked);
    scheduleAutoSave();
  };

  const handleClose = () => {
    // Flush any pending auto-save before closing
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      if (isEdit) {
        performAutoSave();
      }
    }
    resetForm();
    onClose();
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dependencies?id=${dependencyId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };


  // Fixed drawer width
  const drawerWidthClass = 'w-screen sm:w-[65vw] sm:max-w-[980px]';

  if (!open) return null;

  // Legacy dependency read-only view
  const renderLegacyView = () => {
    const dep = existingDependency as any;
    return (
      <div className="p-5 space-y-6">
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Legacy Team-Based Dependency</span>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            This dependency uses the legacy team-based model. It is displayed in read-only mode.
            To edit, the dependency would need to be converted to the work-item model.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Dependency Level</Label>
              <p className="text-sm font-medium">{dep.dependency_level || 'Team'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Quarter</Label>
              <p className="text-sm font-medium">{dep.quarter || '-'}</p>
            </div>
          </div>

          {dep.requesting_team && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Requesting Team</Label>
                <p className="text-sm font-medium">{dep.requesting_team.name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Depends On Team</Label>
                <p className="text-sm font-medium">{dep.depends_on_team?.name || '-'}</p>
              </div>
            </div>
          )}

          {(dep.from_feature || dep.to_feature) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">From Feature</Label>
                <p className="text-sm font-medium">{dep.from_feature?.name || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">To Feature</Label>
                <p className="text-sm font-medium">{dep.to_feature?.name || '-'}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <p className="text-sm font-medium">{dep.type || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Badge variant="outline">{dep.status || 'open'}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Risk Level</Label>
              <Badge variant={dep.risk_level === 'high' ? 'destructive' : dep.risk_level === 'med' ? 'secondary' : 'outline'}>
                {dep.risk_level?.toUpperCase() || 'MED'}
              </Badge>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Needed By</Label>
              <p className="text-sm font-medium">{dep.needed_by_date || '-'}</p>
            </div>
          </div>

          {dep.description && (
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-sm">{dep.description}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
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
            {/* Breadcrumb Row */}
            <div 
              className="px-5 pt-2.5 pb-1.5 flex items-center gap-1.5"
              style={{ borderBottom: '1px solid var(--border-subtle, hsl(var(--border)/0.5))' }}
            >
              <span 
                className="text-[10px] font-medium uppercase tracking-[0.5px]"
                style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
              >
                Dependencies
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>/</span>
              <span className="text-[11px] font-semibold font-mono text-primary">
                {isEdit ? `DEP-${dependencyId?.slice(0, 4).toUpperCase()}` : 'New'}
              </span>
              {isEdit && (
                <button
                  onClick={handleCopyLink}
                  className="p-1 rounded hover:bg-[var(--surface-hover,hsl(var(--muted)))] transition-smooth text-muted-foreground"
                  title="Copy link"
                >
                  <LinkIcon className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Hero Row */}
            <div className="flex items-start justify-between px-5 py-3 gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <SheetTitle 
                  className="text-[18px] font-semibold tracking-[-0.3px] leading-tight"
                  style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}
                >
                  {isEdit ? 'Edit Dependency' : 'Create Dependency'}
                </SheetTitle>
                <SheetDescription 
                  className="text-[13px]"
                  style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                >
                  {isEdit && existingDependency ? (
                    isLegacyDependency ? 'Legacy team-based dependency (read-only)' :
                    `Work Item ↔ Work Item Dependency`
                  ) : (
                    'Define a dependency between work items'
                  )}
                </SheetDescription>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Auto-save indicator */}
                {isEdit && !isLegacyDependency && (
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
                          <span>Saving</span>
                        </>
                      ) : showSavedIndicator ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Saved</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}

                {isEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))]"
                        style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 z-[400] bg-popover border">
                      <DropdownMenuItem onSelect={() => toast.info('Subscribe to dependency updates')}>
                        <Bell className="h-4 w-4 mr-2" />
                        Subscribe
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setActiveTab('audit')}>
                        <History className="h-4 w-4 mr-2" />
                        Audit Log
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => toast.info('Refresh dependency status')}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Status
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => toast.info('Copy dependency')}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onSelect={() => setShowDeleteConfirm(true)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleClose}
                  className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))]"
                  style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div style={{ borderBottom: '1px solid var(--border-default, hsl(var(--border)))' }} />
          </SheetHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList 
              className="w-full justify-start rounded-none h-10 shrink-0 overflow-x-auto flex-nowrap px-5 bg-transparent"
              style={{ borderBottom: '1px solid var(--border-default, hsl(var(--border)))' }}
            >
              <TabsTrigger 
                value="details" 
                className="relative px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap bg-transparent border-none rounded-none data-[state=inactive]:text-muted-foreground data-[state=active]:text-foreground"
              >
                Details
              </TabsTrigger>
              <TabsTrigger 
                value="negotiation" 
                className="relative px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap bg-transparent border-none rounded-none data-[state=inactive]:text-muted-foreground data-[state=active]:text-foreground"
              >
                Negotiation
              </TabsTrigger>
              <TabsTrigger 
                value="audit" 
                className="relative px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap bg-transparent border-none rounded-none data-[state=inactive]:text-muted-foreground data-[state=active]:text-foreground"
              >
                Audit
              </TabsTrigger>
            </TabsList>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'var(--surface-subtle, hsl(var(--muted)/0.3))' }}>
              
              {/* Details Tab */}
              <TabsContent value="details" className="m-0 focus-visible:outline-none p-5 pb-8">
                {isLoadingDep ? (
                  <div className="text-center text-sm py-12" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Loading...</div>
                ) : isLegacyDependency ? (
                  renderLegacyView()
                ) : (
                  <div className="space-y-6">
                    {/* Dependency Level Indicator */}
                    <div 
                      className="flex items-center gap-2 p-3 rounded-md"
                      style={{ background: 'var(--surface-bg, hsl(var(--muted)/0.5))' }}
                    >
                      <Layers className="h-4 w-4" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }} />
                      <span className="text-sm" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Dependency Level:</span>
                      <Badge variant="secondary">
                        {DEPENDENCY_LEVEL_LABELS[derivedLevel]}
                      </Badge>
                    </div>

                    {/* Requesting Work Item */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium" style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>
                        Requesting Work Item (Source)
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="req-type" className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Type</Label>
                          <Select 
                            value={requestingWorkItemType} 
                            onValueChange={handleRequestingWorkItemTypeChange}
                          >
                            <SelectTrigger 
                              id="req-type" 
                              className="h-9"
                              style={{ 
                                background: 'var(--surface-bg, hsl(var(--background)))',
                                borderColor: 'var(--border-default, hsl(var(--border)))'
                              }}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[400] bg-popover border">
                              <SelectItem value="epic">Epic</SelectItem>
                              <SelectItem value="feature">Feature</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="req-item" className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Work Item *</Label>
                          <Select value={requestingWorkItemId} onValueChange={handleRequestingWorkItemIdChange}>
                            <SelectTrigger 
                              id="req-item" 
                              className="h-9"
                              style={{ 
                                background: 'var(--surface-bg, hsl(var(--background)))',
                                borderColor: 'var(--border-default, hsl(var(--border)))'
                              }}
                            >
                              <SelectValue placeholder={`Select ${requestingWorkItemType}`} />
                            </SelectTrigger>
                            <SelectContent className="z-[400] bg-popover border">
                              {requestingWorkItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>{item.display}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Depends On Work Item */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium" style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>
                        Depends On (Target)
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="dep-type" className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Type</Label>
                          <Select 
                            value={dependsOnWorkItemType} 
                            onValueChange={handleDependsOnWorkItemTypeChange}
                          >
                            <SelectTrigger 
                              id="dep-type" 
                              className="h-9"
                              style={{ 
                                background: 'var(--surface-bg, hsl(var(--background)))',
                                borderColor: 'var(--border-default, hsl(var(--border)))'
                              }}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[400] bg-popover border">
                              <SelectItem value="epic">Epic</SelectItem>
                              <SelectItem value="feature">Feature</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="dep-item" className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Work Item *</Label>
                          <Select value={dependsOnWorkItemId} onValueChange={handleDependsOnWorkItemIdChange}>
                            <SelectTrigger 
                              id="dep-item" 
                              className="h-9"
                              style={{ 
                                background: 'var(--surface-bg, hsl(var(--background)))',
                                borderColor: 'var(--border-default, hsl(var(--border)))'
                              }}
                            >
                              <SelectValue placeholder={`Select ${dependsOnWorkItemType}`} />
                            </SelectTrigger>
                            <SelectContent className="z-[400] bg-popover border">
                              {dependsOnWorkItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>{item.display}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Dependency Type + Risk */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Dependency Type *</Label>
                        <Select value={dependencyType} onValueChange={handleDependencyTypeChange}>
                          <SelectTrigger 
                            className="h-9"
                            style={{ 
                              background: 'var(--surface-bg, hsl(var(--background)))',
                              borderColor: 'var(--border-default, hsl(var(--border)))'
                            }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[400] bg-popover border">
                            <SelectItem value="blocks">Blocks</SelectItem>
                            <SelectItem value="is_blocked_by">Is Blocked By</SelectItem>
                            <SelectItem value="enables">Enables</SelectItem>
                            <SelectItem value="provides_input">Provides Input</SelectItem>
                            <SelectItem value="approves">Approves</SelectItem>
                            <SelectItem value="governs">Governs</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Risk Level</Label>
                        <Select value={riskLevel} onValueChange={handleRiskLevelChange}>
                          <SelectTrigger 
                            className="h-9"
                            style={{ 
                              background: 'var(--surface-bg, hsl(var(--background)))',
                              borderColor: 'var(--border-default, hsl(var(--border)))'
                            }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[400] bg-popover border">
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="med">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Scheduling */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>
                        <Calendar className="h-4 w-4" />
                        Scheduling
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Needed By Date *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full h-9 justify-start text-left font-normal",
                                  !neededByDate && "text-muted-foreground"
                                )}
                                style={{ 
                                  background: 'var(--surface-bg, hsl(var(--background)))',
                                  borderColor: 'var(--border-default, hsl(var(--border)))'
                                }}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {neededByDate ? format(new Date(neededByDate), "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[400] bg-popover border" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={neededByDate ? new Date(neededByDate) : undefined}
                                onSelect={handleNeededByDateChange}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Quarter (derived)</Label>
                          <Input 
                            value={derivedQuarter} 
                            readOnly 
                            className="h-9" 
                            style={{ 
                              background: 'var(--surface-subtle, hsl(var(--muted)/0.5))',
                              borderColor: 'var(--border-default, hsl(var(--border)))'
                            }}
                          />
                        </div>
                      </div>

                      {/* Optional sprint fields */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Needed By Sprint (optional)</Label>
                          <Select value={neededBySprint || "__none__"} onValueChange={handleNeededBySprintChange}>
                            <SelectTrigger 
                              className="h-9"
                              style={{ 
                                background: 'var(--surface-bg, hsl(var(--background)))',
                                borderColor: 'var(--border-default, hsl(var(--border)))'
                              }}
                            >
                              <SelectValue placeholder="Select sprint" />
                            </SelectTrigger>
                            <SelectContent className="z-[400] bg-popover border">
                              <SelectItem value="__none__">None</SelectItem>
                              {iterations?.map(sprint => (
                                <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Committed By Sprint (optional)</Label>
                          <Select value={committedBySprint || "__none__"} onValueChange={handleCommittedBySprintChange}>
                            <SelectTrigger 
                              className="h-9"
                              style={{ 
                                background: 'var(--surface-bg, hsl(var(--background)))',
                                borderColor: 'var(--border-default, hsl(var(--border)))'
                              }}
                            >
                              <SelectValue placeholder="Select sprint" />
                            </SelectTrigger>
                            <SelectContent className="z-[400] bg-popover border">
                              <SelectItem value="__none__">None</SelectItem>
                              {iterations?.map(sprint => (
                                <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <Label className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Description</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => handleDescriptionChange(e.target.value)}
                        placeholder="Describe what is needed and why..."
                        rows={3}
                        style={{ 
                          background: 'var(--surface-bg, hsl(var(--background)))',
                          borderColor: 'var(--border-default, hsl(var(--border)))'
                        }}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Negotiation Tab */}
              <TabsContent value="negotiation" className="m-0 focus-visible:outline-none p-5 pb-8">
                {isLegacyDependency ? (
                  <div className="text-center text-sm py-12" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>
                    Legacy dependencies cannot be edited. View details in the Details tab.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h3 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>
                      <Calendar className="h-4 w-4" />
                      Negotiation & Commitment
                    </h3>

                    <div>
                      <Label className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Status *</Label>
                      <Select value={status} onValueChange={handleStatusChange}>
                        <SelectTrigger 
                          className="h-9"
                          style={{ 
                            background: 'var(--surface-bg, hsl(var(--background)))',
                            borderColor: 'var(--border-default, hsl(var(--border)))'
                          }}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[400] bg-popover border">
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="pending_commit">Pending Commit</SelectItem>
                          <SelectItem value="committed">Committed</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="not_required">Not Required</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Committed By Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-9 justify-start text-left font-normal",
                              !committedByDate && "text-muted-foreground"
                            )}
                            style={{ 
                              background: 'var(--surface-bg, hsl(var(--background)))',
                              borderColor: 'var(--border-default, hsl(var(--border)))'
                            }}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {committedByDate ? format(new Date(committedByDate), "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[400] bg-popover border" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={committedByDate ? new Date(committedByDate) : undefined}
                            onSelect={handleCommittedByDateChange}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="source-blocked"
                          checked={sourceBlocked} 
                          onCheckedChange={(checked) => handleSourceBlockedChange(checked === true)} 
                        />
                        <Label htmlFor="source-blocked" className="font-normal text-[13px]" style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>
                          Source Blocked: Is the requesting party blocked?
                        </Label>
                      </div>

                      {sourceBlocked && (
                        <div>
                          <Label className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Blocked Reason</Label>
                          <Textarea 
                            value={sourceBlockedReason}
                            onChange={(e) => handleSourceBlockedReasonChange(e.target.value)}
                            placeholder="Why is the requesting party blocked?" 
                            style={{ 
                              background: 'var(--surface-bg, hsl(var(--background)))',
                              borderColor: 'var(--border-default, hsl(var(--border)))'
                            }}
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="target-delayed"
                          checked={targetDelayed} 
                          onCheckedChange={(checked) => handleTargetDelayedChange(checked === true)} 
                        />
                        <Label htmlFor="target-delayed" className="font-normal text-[13px]" style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>
                          Target Delayed: Is the responding party delayed?
                        </Label>
                      </div>

                      {targetDelayed && (
                        <div>
                          <Label className="text-xs" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>Delayed Reason</Label>
                          <Textarea 
                            value={targetDelayedReason}
                            onChange={(e) => handleTargetDelayedReasonChange(e.target.value)}
                            placeholder="Why is the responding party delayed?" 
                            style={{ 
                              background: 'var(--surface-bg, hsl(var(--background)))',
                              borderColor: 'var(--border-default, hsl(var(--border)))'
                            }}
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="no-work"
                          checked={noWorkRequired} 
                          onCheckedChange={(checked) => handleNoWorkRequiredChange(checked === true)} 
                        />
                        <Label htmlFor="no-work" className="font-normal text-[13px]" style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>
                          No Work Required
                        </Label>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Audit Tab */}
              <TabsContent value="audit" className="m-0 focus-visible:outline-none p-5 pb-8">
                <AuditLogContent dependencyId={dependencyId} />
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent style={{ background: 'var(--surface-bg, hsl(var(--background)))' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>Delete Dependency?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>
              This action cannot be undone. The dependency will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
