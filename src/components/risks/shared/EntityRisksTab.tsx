/**
 * EntityRisksTab - Unified Risks tab for all entity drawers
 * 
 * Used in: Business Request Drawer, Epic Drawer, Feature Drawer, Theme Drawer, etc.
 * Uses RiskFormV2 for the canonical risk form UI.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, MoreHorizontal, ArrowDownAZ, ArrowUpAZ, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RiskFormV2, RiskFormDataV2, getDefaultRiskFormData, RiskContext } from './RiskFormV2';

// Entity type configuration
type EntityType = 'business_request' | 'epic' | 'feature' | 'story' | 'theme' | 'project' | 'program';

interface EntityRisksTabProps {
  entityType: EntityType;
  entityId: string;
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
  business_request_id: string | null;
  epic_id?: string | null;
  feature_id?: string | null;
  story_id?: string | null;
  theme_id?: string | null;
  created_at: string;
  owner_id: string | null;
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

const SORT_OPTIONS = [
  { value: 'title', label: 'Name' },
  { value: 'status', label: 'Status' },
  { value: 'target_resolution_date', label: 'Target Resolution Date' },
  { value: 'occurrence', label: 'Occurrence' },
];

// Get the ID column based on entity type
function getIdColumn(entityType: EntityType): string {
  switch (entityType) {
    case 'business_request':
      return 'business_request_id';
    case 'epic':
      return 'related_item_id';
    case 'feature':
      return 'related_item_id';
    case 'story':
      return 'related_item_id';
    case 'theme':
      return 'related_item_id';
    case 'project':
      return 'related_item_id';
    case 'program':
      return 'program_id';
    default:
      return 'business_request_id';
  }
}

// Get relationship type for non-BR entities
function getRelationship(entityType: EntityType): string | null {
  switch (entityType) {
    case 'epic':
      return 'Epic';
    case 'feature':
      return 'Feature';
    case 'story':
      return 'Story';
    case 'theme':
      return 'Theme';
    default:
      return null;
  }
}

export function EntityRisksTab({ entityType, entityId }: EntityRisksTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RiskFormDataV2>(getDefaultRiskFormData());
  
  const queryClient = useQueryClient();
  const idColumn = getIdColumn(entityType);
  const relationship = getRelationship(entityType);

  // Fetch risks for this entity
  const { data: risks = [], isLoading } = useQuery({
    queryKey: ['entity-risks', entityType, entityId],
    queryFn: async (): Promise<DemandRisk[]> => {
      // Use different queries based on entity type to avoid TypeScript depth issues
      if (entityType === 'business_request') {
        const { data, error } = await supabase
          .from('risks')
          .select('*')
          .eq('business_request_id', entityId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as DemandRisk[];
      } else if (relationship) {
        const { data, error } = await supabase
          .from('risks')
          .select('*')
          .eq('related_item_id', entityId)
          .eq('relationship', relationship)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as DemandRisk[];
      } else {
        const { data, error } = await supabase
          .from('risks')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as DemandRisk[];
      }
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: RiskFormDataV2) => {
      const { data: maxRisk } = await supabase
        .from('risks')
        .select('risk_number')
        .order('risk_number', { ascending: false })
        .limit(1)
        .single();
      
      const nextRiskNumber = (maxRisk?.risk_number || 0) + 1;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const insertPayload = {
        title: data.title,
        description: data.description,
        status: data.status,
        resolution_method: data.resolution_method,
        occurrence: data.occurrence,
        impact: data.impact,
        critical_path: data.critical_path,
        target_resolution_date: data.target_resolution_date,
        consequence: data.consequence,
        mitigation: data.mitigation,
        contingency: data.contingency,
        resolution_status: data.resolution_status,
        owner_id: data.owner_id,
        risk_number: nextRiskNumber,
        program_id: null as string | null,
        program_increment_id: null as string | null,
        created_by: user?.id || null,
        notify: 'None',
        tags: '',
        business_request_id: null as string | null,
        related_item_id: null as string | null,
        relationship: '' as string,
      };

      // Set the correct ID column and relationship based on entity type
      // Note: program_id FK references projects table, not programs - so we don't set it for epic/feature/theme risks
      // The check constraint now allows: program_id OR business_request_id OR (related_item_id + relationship)
      if (entityType === 'business_request') {
        insertPayload.business_request_id = entityId;
        insertPayload.relationship = 'Demand';
      } else if (entityType === 'epic') {
        insertPayload.related_item_id = entityId;
        insertPayload.relationship = 'Epic';
      } else if (entityType === 'feature') {
        insertPayload.related_item_id = entityId;
        insertPayload.relationship = 'Feature';
      } else if (entityType === 'theme') {
        insertPayload.related_item_id = entityId;
        insertPayload.relationship = 'Theme';
      } else if (entityType === 'program') {
        // program_id is for projects, not programs - skip setting it
        insertPayload.related_item_id = entityId;
        insertPayload.relationship = 'Program';
      } else if (relationship) {
        insertPayload.related_item_id = entityId;
        insertPayload.relationship = relationship;
      }

      const { error } = await supabase.from('risks').insert(insertPayload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-risks', entityType, entityId] });
      toast.success('Risk created');
      resetForm();
      setShowAddForm(false);
    },
    onError: (e: any) => toast.error(e.message)
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RiskFormDataV2 }) => {
      const { error } = await supabase.from('risks').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-risks', entityType, entityId] });
      toast.success('Risk updated');
      setEditingId(null);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message)
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('risks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-risks', entityType, entityId] });
      toast.success('Risk deleted');
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message)
  });

  const resetForm = () => {
    setFormData(getDefaultRiskFormData());
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
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
      occurrence: risk.occurrence,
      impact: risk.impact,
      critical_path: risk.critical_path,
      target_resolution_date: risk.target_resolution_date,
      consequence: risk.consequence,
      mitigation: risk.mitigation,
      contingency: risk.contingency,
      resolution_status: risk.resolution_status,
      owner_id: risk.owner_id,
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
    <div className="flex flex-col h-full space-y-4" style={{ backgroundColor: 'var(--surface-1)' }}>
      {/* Header with Sort and Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Sort by</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg z-[400]">
              {SORT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
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
          className="text-foreground text-sm"
          onClick={() => { resetForm(); setShowAddForm(true); setEditingId(null); }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add risk
        </Button>
      </div>

      {/* Inline Add Form */}
      {showAddForm && !editingId && (
        <div 
          className="border rounded-xl p-5 shadow-sm"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-1)' }}
        >
          <RiskFormV2
            mode="edit"
            value={formData}
            onChange={setFormData}
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={createMutation.isPending}
            context={entityType as RiskContext}
          />
        </div>
      )}

      {/* Risks List */}
      <div className="space-y-3">
        {sortedRisks.map((risk) => {
          const isEditing = editingId === risk.id;
          const statusConfig = getStatusConfig(risk.status);
          const resolutionConfig = getResolutionMethodConfig(risk.resolution_method);

          if (isEditing) {
            return (
              <div 
                key={risk.id} 
                className="border rounded-xl p-5 shadow-sm"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-1)' }}
              >
                <RiskFormV2
                  mode="edit"
                  value={formData}
                  onChange={setFormData}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isLoading={updateMutation.isPending}
                  context={entityType as RiskContext}
                />
              </div>
            );
          }

          return (
            <div
              key={risk.id}
              className="border rounded-xl overflow-hidden shadow-sm"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-1)' }}
            >
              <div 
                className="p-4 transition-colors"
                style={{ backgroundColor: 'var(--surface-1)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-1)'}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      <h4 className="text-sm font-medium text-foreground">
                        Risk #{risk.risk_number} – {risk.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground ml-6">
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
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-[400]">
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
          <div 
            className="flex flex-col items-center justify-center py-12 px-6 rounded-lg text-center"
            style={{ 
              backgroundColor: 'var(--surface-2)',
              border: '1px dashed var(--border-color)'
            }}
          >
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--surface-3)' }}
            >
              <AlertTriangle className="h-6 w-6" style={{ color: 'var(--text-3)' }} />
            </div>
            <h4 
              className="text-sm font-medium mb-1"
              style={{ color: 'var(--text-1)' }}
            >
              No risks yet
            </h4>
            <p 
              className="text-xs max-w-[280px] mb-4"
              style={{ color: 'var(--text-2)' }}
            >
              Track and manage risks associated with this item.
            </p>
            <Button
              size="sm"
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              onClick={() => { resetForm(); setShowAddForm(true); setEditingId(null); }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add risk
            </Button>
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
