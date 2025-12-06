import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, MoreHorizontal, ArrowDownAZ, ArrowUpAZ, Pencil, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RisksViewTabProps {
  requestId: string;
}

interface DemandRisk {
  id: string;
  risk_number: number;
  title: string;
  description: string;
  status: 'Open' | 'Closed';
  resolution_method: 'Resolved' | 'Owned' | 'Accepted' | 'Mitigated';
  occurrence: 'Low' | 'Medium' | 'High' | 'Critical' | null;
  impact: 'Low' | 'Medium' | 'High' | 'Critical' | null;
  critical_path: 'Yes' | 'No' | null;
  target_resolution_date: string | null;
  consequence: string | null;
  mitigation: string | null;
  contingency: string | null;
  resolution_status: string | null;
  business_request_id: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open', color: 'bg-red-100 text-red-700' },
  { value: 'Closed', label: 'Closed', color: 'bg-muted text-muted-foreground' },
];

const RESOLUTION_METHOD_OPTIONS = [
  { value: 'Resolved', label: 'Resolved', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'Owned', label: 'Owned', color: 'bg-blue-100 text-blue-700' },
  { value: 'Accepted', label: 'Accepted', color: 'bg-amber-100 text-amber-700' },
  { value: 'Mitigated', label: 'Mitigated', color: 'bg-purple-100 text-purple-700' },
];

const SEVERITY_OPTIONS = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

const CRITICAL_PATH_OPTIONS = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

const SORT_OPTIONS = [
  { value: 'title', label: 'Name' },
  { value: 'status', label: 'Status' },
  { value: 'target_resolution_date', label: 'Target Resolution Date' },
  { value: 'occurrence', label: 'Occurrence' },
];

export function RisksViewTab({ requestId }: RisksViewTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Open' as 'Open' | 'Closed',
    resolution_method: 'Owned' as 'Resolved' | 'Owned' | 'Accepted' | 'Mitigated',
    occurrence: '' as string,
    impact: '' as string,
    critical_path: '' as string,
    target_resolution_date: '',
    consequence: '',
    mitigation: '',
    contingency: '',
    resolution_status: '',
  });
  const [formError, setFormError] = useState('');
  
  const queryClient = useQueryClient();

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ['demand-risks', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risks')
        .select('*')
        .eq('business_request_id', requestId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as DemandRisk[];
    }
  });

  // Sort risks
  const sortedRisks = [...risks].sort((a, b) => {
    let aVal = (a as any)[sortBy] || '';
    let bVal = (b as any)[sortBy] || '';
    if (sortBy === 'target_resolution_date') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }
    if (sortDir === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Get the next risk number
      const { data: maxRisk } = await supabase
        .from('risks')
        .select('risk_number')
        .order('risk_number', { ascending: false })
        .limit(1)
        .single();
      
      const nextRiskNumber = (maxRisk?.risk_number || 0) + 1;

      const { error } = await supabase
        .from('risks')
        .insert({
          ...data,
          risk_number: nextRiskNumber,
          business_request_id: requestId,
          // Required fields with defaults for demand context
          program_id: '00000000-0000-0000-0000-000000000000',
          program_increment_id: '00000000-0000-0000-0000-000000000000',
          owner_id: '00000000-0000-0000-0000-000000000000',
          created_by: '00000000-0000-0000-0000-000000000000',
          relationship: 'Feature',
          notify: 'None',
          tags: '',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demand-risks', requestId] });
      toast.success('Risk created');
      resetForm();
      setShowAddForm(false);
    },
    onError: (e: any) => toast.error(e.message)
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('risks')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demand-risks', requestId] });
      toast.success('Risk updated');
      setEditingId(null);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('risks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demand-risks', requestId] });
      toast.success('Risk deleted');
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message)
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'Open',
      resolution_method: 'Owned',
      occurrence: '',
      impact: '',
      critical_path: '',
      target_resolution_date: '',
      consequence: '',
      mitigation: '',
      contingency: '',
      resolution_status: '',
    });
    setFormError('');
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('Description is required');
      return;
    }
    
    const payload = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      resolution_method: formData.resolution_method,
      occurrence: formData.occurrence || null,
      impact: formData.impact || null,
      critical_path: formData.critical_path || null,
      target_resolution_date: formData.target_resolution_date || null,
      consequence: formData.consequence || null,
      mitigation: formData.mitigation || null,
      contingency: formData.contingency || null,
      resolution_status: formData.resolution_status || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCancel = () => {
    resetForm();
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleEdit = (risk: DemandRisk) => {
    setEditingId(risk.id);
    setFormData({
      title: risk.title || '',
      description: risk.description || '',
      status: risk.status || 'Open',
      resolution_method: risk.resolution_method || 'Owned',
      occurrence: risk.occurrence || '',
      impact: risk.impact || '',
      critical_path: risk.critical_path || '',
      target_resolution_date: risk.target_resolution_date || '',
      consequence: risk.consequence || '',
      mitigation: risk.mitigation || '',
      contingency: risk.contingency || '',
      resolution_status: risk.resolution_status || '',
    });
    setShowAddForm(false);
  };

  const getStatusConfig = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  const getResolutionMethodConfig = (method: string) => {
    return RESOLUTION_METHOD_OPTIONS.find(m => m.value === method) || RESOLUTION_METHOD_OPTIONS[1];
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Not set';
    try {
      return format(new Date(date), 'MMM d, yyyy');
    } catch {
      return 'Not set';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading risks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Sort and Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          >
            {sortDir === 'asc' ? (
              <ArrowDownAZ className="h-4 w-4" />
            ) : (
              <ArrowUpAZ className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-foreground"
          onClick={() => { resetForm(); setShowAddForm(true); setEditingId(null); }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add risk
        </Button>
      </div>

      {/* Inline Add Form */}
      {showAddForm && !editingId && (
        <RiskForm
          formData={formData}
          setFormData={setFormData}
          formError={formError}
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Risks List */}
      <div className="space-y-3">
        {sortedRisks.map((risk) => {
          const isEditing = editingId === risk.id;
          const statusConfig = getStatusConfig(risk.status);
          const resolutionConfig = getResolutionMethodConfig(risk.resolution_method);

          if (isEditing) {
            return (
              <RiskForm
                key={risk.id}
                formData={formData}
                setFormData={setFormData}
                formError={formError}
                onSave={handleSave}
                onCancel={handleCancel}
                isLoading={updateMutation.isPending}
                isEdit
              />
            );
          }

          return (
            <div
              key={risk.id}
              className="border rounded-lg bg-card overflow-hidden"
            >
              <div className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      <h4 className="font-medium text-foreground">
                        Risk #{risk.risk_number} – {risk.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground ml-6">
                      <span>Target Resolution: {formatDate(risk.target_resolution_date)}</span>
                      {risk.occurrence && (
                        <>
                          <span className="mx-1">·</span>
                          <span>Occurrence: {risk.occurrence}</span>
                        </>
                      )}
                      {risk.impact && (
                        <>
                          <span className="mx-1">·</span>
                          <span>Impact: {risk.impact}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                      statusConfig.color
                    )}>
                      {statusConfig.label}
                    </span>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                      resolutionConfig.color
                    )}>
                      {resolutionConfig.label}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(risk)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(risk.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {sortedRisks.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No risks defined yet. Click "Add risk" to create one.
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Risk</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this risk? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Inline Risk Form Component
function RiskForm({
  formData,
  setFormData,
  formError,
  onSave,
  onCancel,
  isLoading,
  isEdit = false
}: {
  formData: any;
  setFormData: (data: any) => void;
  formError: string;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
  isEdit?: boolean;
}) {
  return (
    <div className="border rounded-lg bg-card p-4 space-y-4">
      {/* Section: Risk Details */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground border-b pb-2">Risk Details</h4>
        
        {/* Status and Resolution Method */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select 
              value={formData.status} 
              onValueChange={v => setFormData({ ...formData, status: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Resolution Method</label>
            <Select 
              value={formData.resolution_method} 
              onValueChange={v => setFormData({ ...formData, resolution_method: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_METHOD_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium">
            Title<span className="text-destructive">*</span>
          </label>
          <Input
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="Risk title"
            className="mt-1"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium">
            Description<span className="text-destructive">*</span>
          </label>
          <Textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the risk..."
            className="mt-1 min-h-[80px]"
          />
        </div>

        {/* Occurrence, Impact, Critical Path */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Occurrence</label>
            <Select 
              value={formData.occurrence} 
              onValueChange={v => setFormData({ ...formData, occurrence: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Impact</label>
            <Select 
              value={formData.impact} 
              onValueChange={v => setFormData({ ...formData, impact: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Critical Path</label>
            <Select 
              value={formData.critical_path} 
              onValueChange={v => setFormData({ ...formData, critical_path: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {CRITICAL_PATH_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Target Resolution Date */}
        <div>
          <label className="text-sm font-medium">Target Resolution Date</label>
          <Input
            type="date"
            value={formData.target_resolution_date}
            onChange={e => setFormData({ ...formData, target_resolution_date: e.target.value })}
            className="mt-1"
          />
        </div>

        {/* Consequence */}
        <div>
          <label className="text-sm font-medium">Consequence</label>
          <Textarea
            value={formData.consequence}
            onChange={e => setFormData({ ...formData, consequence: e.target.value })}
            placeholder="What are the consequences if this risk occurs?"
            className="mt-1 min-h-[60px]"
          />
        </div>
      </div>

      {/* Section: Mitigation */}
      <div className="space-y-4 pt-2">
        <h4 className="text-sm font-semibold text-foreground border-b pb-2">Mitigation</h4>
        
        {/* Mitigation Plan */}
        <div>
          <label className="text-sm font-medium">Mitigation Plan</label>
          <Textarea
            value={formData.mitigation}
            onChange={e => setFormData({ ...formData, mitigation: e.target.value })}
            placeholder="How will this risk be mitigated?"
            className="mt-1 min-h-[60px]"
          />
        </div>

        {/* Contingency Plan */}
        <div>
          <label className="text-sm font-medium">Contingency Plan</label>
          <Textarea
            value={formData.contingency}
            onChange={e => setFormData({ ...formData, contingency: e.target.value })}
            placeholder="What is the backup plan if mitigation fails?"
            className="mt-1 min-h-[60px]"
          />
        </div>

        {/* Resolution Status */}
        <div>
          <label className="text-sm font-medium">Resolution Status</label>
          <Textarea
            value={formData.resolution_status}
            onChange={e => setFormData({ ...formData, resolution_status: e.target.value })}
            placeholder="Current resolution status..."
            className="mt-1 min-h-[60px]"
          />
        </div>
      </div>

      {/* Error message */}
      {formError && (
        <div className="flex items-center gap-1 text-destructive text-sm">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{formError}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
