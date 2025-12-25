import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { CalendarIcon, Calendar as CalendarIcon2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkItemDependencyType, DependencyTypeV2, RiskLevel, DependencyLevelV2 } from '@/lib/dependencies/types';
import { DEPENDENCY_TYPE_LABELS, DEPENDENCY_LEVEL_LABELS } from '@/lib/dependencies/types';
import { AutoSaveIndicator, AutoSaveStatus } from '@/components/business-requests/create-form/AutoSaveIndicator';

const DRAFT_STORAGE_KEY = 'dependency-draft';

interface CreateDependencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId?: string;
  // New props for work-item-centric model
  defaultRequestingWorkItemId?: string;
  defaultRequestingWorkItemType?: WorkItemDependencyType;
}

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

// Get current quarter
const getCurrentQuarter = () => {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${quarter} ${now.getFullYear()}`;
};

export function CreateDependencyDialog({
  open,
  onOpenChange,
  teamId,
  defaultRequestingWorkItemId,
  defaultRequestingWorkItemType,
}: CreateDependencyDialogProps) {
  const queryClient = useQueryClient();
  
  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  
  // Form state - initialize from props to avoid race condition
  const [requestingWorkItemType, setRequestingWorkItemType] = useState<WorkItemDependencyType>(
    defaultRequestingWorkItemType || 'feature'
  );
  const [requestingWorkItemId, setRequestingWorkItemId] = useState(defaultRequestingWorkItemId || '');
  const [dependsOnWorkItemType, setDependsOnWorkItemType] = useState<WorkItemDependencyType>(
    defaultRequestingWorkItemType || 'feature'
  );
  const [dependsOnWorkItemId, setDependsOnWorkItemId] = useState('');
  const [dependencyType, setDependencyType] = useState<DependencyTypeV2>('blocks');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('med');
  const [neededByDate, setNeededByDate] = useState('');
  const [quarter, setQuarter] = useState(getCurrentQuarter());
  const [description, setDescription] = useState('');
  const [neededBySprint, setNeededBySprint] = useState('');
  const [committedBySprint, setCommittedBySprint] = useState('');
  
  // Draft data structure
  interface DraftData {
    requestingWorkItemType: WorkItemDependencyType;
    requestingWorkItemId: string;
    dependsOnWorkItemType: WorkItemDependencyType;
    dependsOnWorkItemId: string;
    dependencyType: DependencyTypeV2;
    riskLevel: RiskLevel;
    neededByDate: string;
    quarter: string;
    description: string;
    neededBySprint: string;
    committedBySprint: string;
    savedAt: string;
  }
  
  // Load draft from localStorage on mount
  const loadDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const draft: DraftData = JSON.parse(saved);
        // Only restore if no default context is provided
        if (!defaultRequestingWorkItemId) {
          setRequestingWorkItemType(draft.requestingWorkItemType || 'feature');
          setRequestingWorkItemId(draft.requestingWorkItemId || '');
          setDependsOnWorkItemType(draft.dependsOnWorkItemType || 'feature');
        }
        setDependsOnWorkItemId(draft.dependsOnWorkItemId || '');
        setDependencyType(draft.dependencyType || 'blocks');
        setRiskLevel(draft.riskLevel || 'med');
        setNeededByDate(draft.neededByDate || '');
        setQuarter(draft.quarter || getCurrentQuarter());
        setDescription(draft.description || '');
        setNeededBySprint(draft.neededBySprint || '');
        setCommittedBySprint(draft.committedBySprint || '');
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
  }, [defaultRequestingWorkItemId]);
  
  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    try {
      setAutoSaveStatus('saving');
      const draft: DraftData = {
        requestingWorkItemType,
        requestingWorkItemId,
        dependsOnWorkItemType,
        dependsOnWorkItemId,
        dependencyType,
        riskLevel,
        neededByDate,
        quarter,
        description,
        neededBySprint,
        committedBySprint,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setAutoSaveStatus('saved');
      // Reset to idle after 2 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Failed to save draft:', e);
      setAutoSaveStatus('error');
    }
  }, [
    requestingWorkItemType, requestingWorkItemId, dependsOnWorkItemType,
    dependsOnWorkItemId, dependencyType, riskLevel, neededByDate,
    quarter, description, neededBySprint, committedBySprint
  ]);
  
  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }, []);
  
  // Debounced auto-save effect
  useEffect(() => {
    // Skip saving on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Set new timer for debounced save
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 1000);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    dependsOnWorkItemId, dependencyType, riskLevel, neededByDate,
    quarter, description, neededBySprint, committedBySprint, saveDraft
  ]);
  
  // Sync state when props change (e.g., dialog reopens with different context)
  useEffect(() => {
    if (open) {
      isInitialLoadRef.current = true;
      if (defaultRequestingWorkItemId && defaultRequestingWorkItemType) {
        setRequestingWorkItemType(defaultRequestingWorkItemType);
        setRequestingWorkItemId(defaultRequestingWorkItemId);
        setDependsOnWorkItemType(defaultRequestingWorkItemType);
        // Load draft for other fields
        loadDraft();
      } else {
        // Try to restore from draft
        loadDraft();
      }
    }
  }, [open, defaultRequestingWorkItemId, defaultRequestingWorkItemType, loadDraft]);
  
  // Derive dependency level
  const derivedLevel: DependencyLevelV2 = 
    requestingWorkItemType === 'epic' && dependsOnWorkItemType === 'epic' ? 'execution' :
    requestingWorkItemType === 'feature' && dependsOnWorkItemType === 'feature' ? 'delivery' :
    'cross_level';

  // Fetch epics for picker - also check defaultRequestingWorkItemType to enable immediately
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
    enabled: open && (requestingWorkItemType === 'epic' || dependsOnWorkItemType === 'epic' || defaultRequestingWorkItemType === 'epic'),
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

  // Get work items for requesting picker
  const requestingWorkItems = requestingWorkItemType === 'epic' 
    ? epics?.map(e => ({ id: e.id, display: `${e.epic_key || e.id.slice(0, 8)} - ${e.name}` })) || []
    : features?.map(f => ({ id: f.id, display: `${f.display_id || f.id.slice(0, 8)} - ${f.name}` })) || [];

  // Get work items for depends-on picker (exclude requesting item)
  const dependsOnWorkItems = (dependsOnWorkItemType === 'epic' 
    ? epics?.map(e => ({ id: e.id, display: `${e.epic_key || e.id.slice(0, 8)} - ${e.name}` })) || []
    : features?.map(f => ({ id: f.id, display: `${f.display_id || f.id.slice(0, 8)} - ${f.name}` })) || []
  ).filter(item => item.id !== requestingWorkItemId);

  const createMutation = useMutation({
    mutationFn: async () => {
      // Build payload with new model fields
      const payload: any = {
        requesting_work_item_id: requestingWorkItemId,
        requesting_work_item_type: requestingWorkItemType,
        depends_on_work_item_id: dependsOnWorkItemId,
        depends_on_work_item_type: dependsOnWorkItemType,
        dependency_level_v2: derivedLevel,
        is_cross_level_exception: false,
        type: dependencyType,
        risk_level: riskLevel,
        needed_by_date: neededByDate || null,
        quarter,
        description: description || null,
        status: 'open',
        // Legacy fields for backwards compatibility - only set for feature dependencies
        from_feature_id: requestingWorkItemType === 'feature' ? requestingWorkItemId : null,
        to_feature_id: dependsOnWorkItemType === 'feature' ? dependsOnWorkItemId : null,
      };

      const { data, error } = await supabase
        .from('dependencies')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['dependencies-grid'] });
      queryClient.invalidateQueries({ queryKey: ['team-dependencies'] });
      toast.success('Dependency created successfully');
      clearDraft();
      handleClose();
    },
    onError: (error: any) => {
      toast.error(`Failed to create dependency: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestingWorkItemId || !dependsOnWorkItemId) {
      toast.error('Please select both requesting and dependent work items');
      return;
    }

    if (!neededByDate) {
      toast.error('Please specify a needed-by date');
      return;
    }

    createMutation.mutate();
  };

  const handleClose = () => {
    setRequestingWorkItemType(defaultRequestingWorkItemType || 'feature');
    setRequestingWorkItemId(defaultRequestingWorkItemId || '');
    setDependsOnWorkItemType(defaultRequestingWorkItemType || 'feature');
    setDependsOnWorkItemId('');
    setDependencyType('blocks');
    setRiskLevel('med');
    setNeededByDate('');
    setQuarter(getCurrentQuarter());
    setDescription('');
    setNeededBySprint('');
    setCommittedBySprint('');
    clearDraft();
    onOpenChange(false);
  };

  // Check if requesting item is pre-set (read-only)
  const hasDefaultContext = !!defaultRequestingWorkItemId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader className="flex flex-row items-start justify-between">
          <div>
            <DialogTitle>Create Dependency</DialogTitle>
            <DialogDescription>
              Define a dependency between work items
            </DialogDescription>
          </div>
          <AutoSaveIndicator status={autoSaveStatus} className="mt-1" />
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Dependency Level Indicator */}
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <span className="text-sm text-muted-foreground">Dependency Level:</span>
              <Badge variant="secondary">
                {DEPENDENCY_LEVEL_LABELS[derivedLevel]}
              </Badge>
            </div>

            {/* Requesting Work Item */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Requesting Work Item (Source)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="req-type" className="text-xs text-muted-foreground">Type</Label>
                  <Select 
                    value={requestingWorkItemType} 
                    onValueChange={(v: WorkItemDependencyType) => {
                      setRequestingWorkItemType(v);
                      if (!hasDefaultContext) setRequestingWorkItemId('');
                    }}
                    disabled={hasDefaultContext}
                  >
                    <SelectTrigger id="req-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="epic">Epic</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="req-item" className="text-xs text-muted-foreground">Work Item *</Label>
                  <Select 
                    value={requestingWorkItemId} 
                    onValueChange={setRequestingWorkItemId}
                    disabled={hasDefaultContext}
                    required
                  >
                    <SelectTrigger id="req-item">
                      <SelectValue placeholder={`Select ${requestingWorkItemType}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {requestingWorkItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.display}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Depends On Work Item */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Depends On (Target)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dep-type" className="text-xs text-muted-foreground">Type</Label>
                  <Select 
                    value={dependsOnWorkItemType} 
                    onValueChange={(v: WorkItemDependencyType) => {
                      setDependsOnWorkItemType(v);
                      setDependsOnWorkItemId('');
                    }}
                  >
                    <SelectTrigger id="dep-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="epic">Epic</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dep-item" className="text-xs text-muted-foreground">Work Item *</Label>
                  <Select 
                    value={dependsOnWorkItemId} 
                    onValueChange={setDependsOnWorkItemId}
                    required
                  >
                    <SelectTrigger id="dep-item">
                      <SelectValue placeholder={`Select ${dependsOnWorkItemType}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {dependsOnWorkItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.display}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Dependency Type + Risk */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="dep-type-select" className="text-xs text-muted-foreground">Dependency Type *</Label>
                <Select value={dependencyType} onValueChange={(v: DependencyTypeV2) => setDependencyType(v)}>
                  <SelectTrigger id="dep-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label htmlFor="risk" className="text-xs text-muted-foreground">Risk Level</Label>
                <Select value={riskLevel} onValueChange={(v: RiskLevel) => setRiskLevel(v)}>
                  <SelectTrigger id="risk">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="med">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Scheduling */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="needed-by" className="text-xs text-muted-foreground">Needed By Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !neededByDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {neededByDate ? format(new Date(neededByDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={neededByDate ? new Date(neededByDate) : undefined}
                      onSelect={(date) => setNeededByDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="quarter" className="text-xs text-muted-foreground">Quarter</Label>
                <Select value={quarter} onValueChange={setQuarter}>
                  <SelectTrigger id="quarter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUARTER_OPTIONS.map(q => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what is needed and why..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Dependency'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
