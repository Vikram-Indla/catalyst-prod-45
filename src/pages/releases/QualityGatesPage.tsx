// =====================================================
// QUALITY GATES PAGE (G17) — Full Implementation
// Live data from tm_release_quality_gates + RPCs
// =====================================================

import React, { useState, useMemo } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import {
  CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight,
  RefreshCw, Plus, Shield, TrendingUp, TrendingDown, Minus,
  MoreVertical, Edit, Trash2, History, Search, AlertCircle, ShieldCheck,
  ShieldAlert, ShieldOff, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  useReleaseQualityGates,
  useCreateQualityGate,
  useUpdateQualityGate,
  useDeleteQualityGate,
  useEvaluateQualityGates,
  useWaiveQualityGate,
  useGateHistory,
} from '@/lib/shared-quality/hooks/useQualityGates';
import type { QualityGate, GateHistoryEntry } from '@/lib/shared-quality/hooks/useQualityGates';
import { useReleases } from '@/hooks/testhub/useReleases';

// ── Config ──

const GATE_TYPES = [
  { value: 'pass_rate', label: 'Pass Rate %', icon: ShieldCheck },
  { value: 'execution_rate', label: 'Execution Rate %', icon: Shield },
  { value: 'defect_count', label: 'Open Defects', icon: ShieldAlert },
  { value: 'blocker_count', label: 'Open Blockers', icon: ShieldAlert },
  { value: 'coverage', label: 'Test Coverage', icon: Shield },
  { value: 'custom', label: 'Custom', icon: Shield },
];

const OPERATORS = [
  { value: '>=', label: '≥ (at least)' },
  { value: '<=', label: '≤ (at most)' },
  { value: '>', label: '> (more than)' },
  { value: '<', label: '< (less than)' },
  { value: '=', label: '= (exactly)' },
];

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  passed: { icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30', label: 'Passed' },
  failed: { icon: XCircle, color: 'text-destructive', bg: 'bg-red-50 dark:bg-red-950/30', label: 'Failed' },
  waived: { icon: ShieldOff, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', label: 'Waived' },
  pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/30', label: 'Pending' },
};

const HISTORY_STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  passed: { icon: CheckCircle, color: 'text-teal-600' },
  failed: { icon: XCircle, color: 'text-destructive' },
  waived: { icon: ShieldOff, color: 'text-purple-600' },
  pending: { icon: Clock, color: 'text-muted-foreground' },
};

// ── Helper ──
function getProgressPercent(gate: QualityGate): number {
  if (gate.current_value == null) return 0;
  const isPercentMetric = gate.gate_type === 'pass_rate' || gate.gate_type === 'execution_rate' || gate.gate_type === 'coverage';
  if (isPercentMetric) return Math.min(100, Math.max(0, gate.current_value));
  // For count-based: show inverse progress (lower is better for <= gates)
  if (gate.threshold_operator === '<=' || gate.threshold_operator === '<') {
    if (gate.threshold_value === 0) return gate.current_value === 0 ? 100 : 0;
    return Math.min(100, Math.max(0, (1 - gate.current_value / Math.max(gate.threshold_value * 2, 1)) * 100));
  }
  return Math.min(100, Math.max(0, (gate.current_value / Math.max(gate.threshold_value, 1)) * 100));
}

function getProgressColor(gate: QualityGate): string {
  const s = gate.status;
  if (s === 'passed') return 'bg-teal-500';
  if (s === 'failed') return 'bg-destructive';
  if (s === 'waived') return 'bg-purple-500';
  return 'bg-muted-foreground';
}

function formatMetricValue(gate: QualityGate): string {
  const val = gate.current_value;
  if (val == null) return 'N/A';
  const isPercent = gate.gate_type === 'pass_rate' || gate.gate_type === 'execution_rate' || gate.gate_type === 'coverage';
  return isPercent ? `${val}%` : `${val}`;
}

// ── Gate Card Component ──

function GateCard({
  gate,
  expanded,
  onToggle,
  onEvaluate,
  onWaive,
  onViewHistory,
  onEdit,
  onDelete,
}: {
  gate: QualityGate;
  expanded: boolean;
  onToggle: () => void;
  onEvaluate: () => void;
  onWaive: () => void;
  onViewHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = gate.status || 'pending';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const gateTypeInfo = GATE_TYPES.find(t => t.value === gate.gate_type);
  const TypeIcon = gateTypeInfo?.icon || Shield;

  return (
    <Card className={cn(
      'transition-all border',
      status === 'failed' && gate.is_blocking && 'border-destructive/50',
      status === 'passed' && 'border-teal-200 dark:border-teal-900',
      status === 'waived' && 'border-purple-200 dark:border-purple-900',
      expanded && 'ring-2 ring-primary/20'
    )}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <button onClick={onToggle} className="p-1 hover:bg-muted rounded">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <div className={cn('p-2 rounded-lg', config.bg)}>
            <StatusIcon className={cn('w-5 h-5', config.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{gate.gate_name}</h3>
              <Badge variant={gate.is_blocking ? 'destructive' : 'secondary'} className="text-xs">
                {gate.is_blocking ? 'Blocking' : 'Warning'}
              </Badge>
              {status === 'waived' && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/20 text-xs">
                  Waived
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TypeIcon className="w-3 h-3" />
                {gateTypeInfo?.label || gate.gate_type}
              </span>
              <span>
                {gate.threshold_operator} {gate.threshold_value}{(gate.gate_type === 'pass_rate' || gate.gate_type === 'execution_rate' || gate.gate_type === 'coverage') ? '%' : ''}
              </span>
              {gate.last_evaluated_at && (
                <span>Last: {format(new Date(gate.last_evaluated_at), 'MMM d, h:mm a')}</span>
              )}
            </div>
          </div>

          {/* Current value + status */}
          <div className="text-right mr-2">
            <div className={cn('text-lg font-bold', config.color)}>
              {formatMetricValue(gate)}
            </div>
            <div className="text-xs text-muted-foreground capitalize">{config.label}</div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEvaluate}>
                <RefreshCw className="w-4 h-4 mr-2" /> Re-evaluate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewHistory}>
                <History className="w-4 h-4 mr-2" /> View History
              </DropdownMenuItem>
              {status === 'failed' && (
                <DropdownMenuItem onClick={onWaive}>
                  <ShieldOff className="w-4 h-4 mr-2" /> Request Waiver
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" /> Edit Gate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress bar */}
        <div className="mt-3 ml-12">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', getProgressColor(gate))}
              style={{ width: `${getProgressPercent(gate)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Current: {formatMetricValue(gate)}</span>
            <span>Threshold: {gate.threshold_operator} {gate.threshold_value}{(gate.gate_type === 'pass_rate' || gate.gate_type === 'execution_rate' || gate.gate_type === 'coverage') ? '%' : ''}</span>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 ml-12 space-y-3">
            {gate.description && (
              <p className="text-sm text-muted-foreground">{gate.description}</p>
            )}
            {status === 'waived' && gate.waiver_reason && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                <div className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-1">Waiver Reason</div>
                <p className="text-sm text-foreground">{gate.waiver_reason}</p>
                {gate.waiver_expires_at && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-purple-600">
                    <Calendar className="w-3 h-3" />
                    Expires: {format(new Date(gate.waiver_expires_at), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Create/Edit Gate Dialog ──

function CreateEditGateDialog({
  open,
  gate,
  releaseId,
  onOpenChange,
}: {
  open: boolean;
  gate: QualityGate | null;
  releaseId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const createGate = useCreateQualityGate();
  const updateGate = useUpdateQualityGate();
  const isEditing = !!gate;

  const [name, setName] = useState(gate?.gate_name || '');
  const [description, setDescription] = useState(gate?.description || '');
  const [gateType, setGateType] = useState<string>(gate?.gate_type || 'pass_rate');
  const [operator, setOperator] = useState<string>(gate?.threshold_operator || '>=');
  const [threshold, setThreshold] = useState(gate?.threshold_value || 80);
  const [isBlocking, setIsBlocking] = useState(gate?.is_blocking ?? true);

  React.useEffect(() => {
    if (open) {
      setName(gate?.gate_name || '');
      setDescription(gate?.description || '');
      setGateType(gate?.gate_type || 'pass_rate');
      setOperator(gate?.threshold_operator || '>=');
      setThreshold(gate?.threshold_value || 80);
      setIsBlocking(gate?.is_blocking ?? true);
    }
  }, [open, gate]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Gate name is required');
      return;
    }

    if (isEditing && gate) {
      updateGate.mutate({
        id: gate.id,
        gate_name: name,
        description: description || null,
        gate_type: gateType as any,
        threshold_operator: operator as any,
        threshold_value: threshold,
        is_blocking: isBlocking,
      }, { onSuccess: () => onOpenChange(false) });
    } else {
      createGate.mutate({
        release_id: releaseId,
        gate_name: name,
        description: description || null,
        gate_type: gateType as any,
        threshold_operator: operator as any,
        threshold_value: threshold,
        is_blocking: isBlocking,
        sort_order: 0,
      }, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createGate.isPending || updateGate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Quality Gate' : 'Create Quality Gate'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modify gate parameters' : 'Define a new quality gate for release readiness'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Gate Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Minimum Pass Rate" className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what this gate validates" className="mt-1" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Metric Type</Label>
              <Select value={gateType} onValueChange={setGateType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Operator</Label>
                <Select value={operator} onValueChange={setOperator}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24">
                <Label>Value</Label>
                <Input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="mt-1" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 border rounded-lg">
            <Switch id="blocking" checked={isBlocking} onCheckedChange={setIsBlocking} />
            <Label htmlFor="blocking">Blocking gate (must pass for release approval)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Gate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Waiver Dialog ──

function WaiverDialog({
  open,
  gate,
  releaseId,
  onOpenChange,
}: {
  open: boolean;
  gate: QualityGate | null;
  releaseId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const waiveGate = useWaiveQualityGate();
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  React.useEffect(() => {
    if (open) { setReason(''); setExpiresAt(''); }
  }, [open]);

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Waiver reason is required');
      return;
    }
    if (!gate) return;

    waiveGate.mutate({
      gateId: gate.id,
      userId: '00000000-0000-0000-0000-000000000001', // Current user placeholder
      reason,
      expiresAt: expiresAt || undefined,
      releaseId,
    }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="w-5 h-5 text-purple-600" />
            Request Waiver: {gate?.gate_name}
          </DialogTitle>
          <DialogDescription>
            Waivers document exceptions when business decisions override technical criteria.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {gate && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <div className="font-medium">Current: {formatMetricValue(gate)} | Threshold: {gate.threshold_operator} {gate.threshold_value}</div>
            </div>
          )}
          <div>
            <Label>Justification *</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this waiver is necessary..." rows={3} className="mt-1" />
          </div>
          <div>
            <Label>Waiver Expiry (optional)</Label>
            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">If set, the waiver will expire and the gate will be re-evaluated.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={waiveGate.isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
            {waiveGate.isPending ? 'Submitting...' : 'Submit Waiver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Gate History Sheet ──

function GateHistorySheet({
  open,
  gateId,
  gateName,
  onClose,
}: {
  open: boolean;
  gateId: string | null;
  gateName: string;
  onClose: () => void;
}) {
  const { data: history = [], isLoading } = useGateHistory(gateId);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Evaluation History
          </SheetTitle>
          <SheetDescription>{gateName}</SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No evaluation history yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3 pr-4">
                {history.map((entry: GateHistoryEntry) => {
                  const statusCfg = HISTORY_STATUS_CONFIG[entry.new_status] || HISTORY_STATUS_CONFIG.pending;
                  const Icon = statusCfg.icon;
                  return (
                    <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className={cn('p-2 rounded-lg', entry.new_status === 'passed' ? 'bg-teal-50 dark:bg-teal-950/30' : entry.new_status === 'failed' ? 'bg-red-50 dark:bg-red-950/30' : 'bg-purple-50 dark:bg-purple-950/30')}>
                        <Icon className={cn('w-4 h-4', statusCfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={cn('font-medium text-sm capitalize', statusCfg.color)}>
                            {entry.new_status}
                          </span>
                          <span className="text-lg font-bold">{entry.metric_value}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}</span>
                          {entry.evaluated_by_name && <span>by {entry.evaluated_by_name}</span>}
                          <Badge variant="outline" className="text-xs">{entry.evaluation_type}</Badge>
                        </div>
                        {entry.previous_status && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {entry.previous_status} → {entry.new_status} (threshold: {entry.threshold_value})
                          </div>
                        )}
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">"{entry.notes}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Delete Confirmation Dialog ──

function DeleteGateDialog({
  open,
  gate,
  releaseId,
  onOpenChange,
}: {
  open: boolean;
  gate: QualityGate | null;
  releaseId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteGate = useDeleteQualityGate();

  const handleDelete = () => {
    if (!gate) return;
    deleteGate.mutate({ id: gate.id, releaseId }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Delete Quality Gate
          </DialogTitle>
          <DialogDescription>
            This will permanently delete "{gate?.gate_name}" and all its evaluation history. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteGate.isPending}>
            {deleteGate.isPending ? 'Deleting...' : 'Delete Gate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──

export default function QualityGatesPage() {
  // Release selector
  const { releases, isLoading: releasesLoading } = useReleases({ status: 'all', health: 'all', search: '' });
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>('');

  // Auto-select first release
  React.useEffect(() => {
    if (releases.length > 0 && !selectedReleaseId) {
      setSelectedReleaseId(releases[0].id);
    }
  }, [releases, selectedReleaseId]);

  // Gates data
  const { data: gates = [], isLoading: gatesLoading } = useReleaseQualityGates(selectedReleaseId);
  const evaluateGates = useEvaluateQualityGates();

  // UI state
  const [expandedGates, setExpandedGates] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialogs
  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [editingGate, setEditingGate] = useState<QualityGate | null>(null);
  const [waiverGate, setWaiverGate] = useState<QualityGate | null>(null);
  const [historyGate, setHistoryGate] = useState<{ id: string; name: string } | null>(null);
  const [deletingGate, setDeletingGate] = useState<QualityGate | null>(null);

  // Filtered gates
  const filteredGates = useMemo(() => {
    return gates.filter(gate => {
      if (statusFilter !== 'all' && (gate.status || 'pending') !== statusFilter) return false;
      if (searchQuery && !gate.gate_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [gates, statusFilter, searchQuery]);

  // Summary
  const summary = useMemo(() => {
    const total = gates.length;
    const passed = gates.filter(g => g.status === 'passed').length;
    const failed = gates.filter(g => g.status === 'failed').length;
    const waived = gates.filter(g => g.status === 'waived').length;
    const pending = gates.filter(g => !g.status || g.status === 'pending').length;
    const blockingFailed = gates.filter(g => g.is_blocking && g.status === 'failed').length;
    const blockingTotal = gates.filter(g => g.is_blocking).length;
    const blockingPassed = gates.filter(g => g.is_blocking && (g.status === 'passed' || g.status === 'waived')).length;
    return { total, passed, failed, waived, pending, blockingFailed, blockingTotal, blockingPassed };
  }, [gates]);

  const toggleGate = (id: string) => {
    setExpandedGates(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleEvaluateAll = () => {
    if (!selectedReleaseId) return;
    evaluateGates.mutate({ releaseId: selectedReleaseId });
  };

  const handleEditGate = (gate: QualityGate) => {
    setEditingGate(gate);
    setCreateEditOpen(true);
  };

  const handleCreateGate = () => {
    setEditingGate(null);
    setCreateEditOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CatalystPageHeader title="Quality Gates" />
            </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedReleaseId} onValueChange={setSelectedReleaseId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select release..." />
                </SelectTrigger>
                <SelectContent>
                  {releases.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.version})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleEvaluateAll} disabled={evaluateGates.isPending || !selectedReleaseId}>
                <RefreshCw className={cn('w-4 h-4 mr-2', evaluateGates.isPending && 'animate-spin')} />
                Re-evaluate All
              </Button>
              <Button onClick={handleCreateGate} disabled={!selectedReleaseId}>
                <Plus className="w-4 h-4 mr-2" />
                Add Gate
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Summary Bar */}
        {selectedReleaseId && gates.length > 0 && (
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-foreground">{summary.total}</div>
                <div className="text-xs text-muted-foreground">Total Gates</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-teal-600">{summary.passed}</div>
                <div className="text-xs text-muted-foreground">Passed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-destructive">{summary.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{summary.waived}</div>
                <div className="text-xs text-muted-foreground">Waived</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-muted-foreground">{summary.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Blocking alert */}
        {summary.blockingFailed > 0 && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <div className="font-semibold text-destructive">
                {summary.blockingFailed} blocking gate{summary.blockingFailed > 1 ? 's' : ''} failed
              </div>
              <div className="text-sm text-muted-foreground">
                Release cannot proceed until all blocking gates pass or are waived. ({summary.blockingPassed}/{summary.blockingTotal} blocking gates met)
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search gates..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="waived">Waived</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gates List */}
        {gatesLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : !selectedReleaseId ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a Release</p>
              <p className="text-sm">Choose a release to view and manage its quality gates</p>
            </CardContent>
          </Card>
        ) : filteredGates.length === 0 && gates.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No Quality Gates</p>
              <p className="text-sm mb-4">Define quality gates to enforce release readiness criteria</p>
              <Button onClick={handleCreateGate}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Gate
              </Button>
            </CardContent>
          </Card>
        ) : filteredGates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No gates match your filters
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGates.map(gate => (
              <GateCard
                key={gate.id}
                gate={gate}
                expanded={expandedGates.has(gate.id)}
                onToggle={() => toggleGate(gate.id)}
                onEvaluate={() => evaluateGates.mutate({ releaseId: selectedReleaseId })}
                onWaive={() => setWaiverGate(gate)}
                onViewHistory={() => setHistoryGate({ id: gate.id, name: gate.gate_name })}
                onEdit={() => handleEditGate(gate)}
                onDelete={() => setDeletingGate(gate)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateEditGateDialog
        open={createEditOpen}
        gate={editingGate}
        releaseId={selectedReleaseId}
        onOpenChange={setCreateEditOpen}
      />

      <WaiverDialog
        open={!!waiverGate}
        gate={waiverGate}
        releaseId={selectedReleaseId}
        onOpenChange={(open) => !open && setWaiverGate(null)}
      />

      <GateHistorySheet
        open={!!historyGate}
        gateId={historyGate?.id || null}
        gateName={historyGate?.name || ''}
        onClose={() => setHistoryGate(null)}
      />

      <DeleteGateDialog
        open={!!deletingGate}
        gate={deletingGate}
        releaseId={selectedReleaseId}
        onOpenChange={(open) => !open && setDeletingGate(null)}
      />
    </div>
  );
}
