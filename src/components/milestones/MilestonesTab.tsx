import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { Plus, Calendar, MoreHorizontal, ArrowDownAZ, ArrowUpAZ, Pencil, Trash2, AlertCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface MilestonesTabProps {
  entityId: string;
  entityType: 'epic' | 'demand';
  hideCategory?: boolean;
}

const MILESTONE_STATES = [
  { value: 'pending', label: 'Pending', color: 'bg-muted text-muted-foreground' },
  { value: 'on_track', label: 'On Track', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'at_risk', label: 'At Risk', color: 'bg-amber-100 text-amber-700' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-700' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-700' },
];

const MILESTONE_CATEGORIES = [
  { value: 'release', label: 'Release' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'checkpoint', label: 'Checkpoint' },
  { value: 'review', label: 'Review' },
  { value: 'delivery', label: 'Delivery' },
];

const SORT_OPTIONS = [
  { value: 'title', label: 'Name' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'start_date', label: 'Start Date' },
  { value: 'state', label: 'State' },
];

export function MilestonesTab({ entityId, entityType, hideCategory = false }: MilestonesTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [sortBy, setSortBy] = useState('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    start_date: '',
    due_date: '',
    description: '',
    state: 'pending',
    category: '',
  });
  const [formError, setFormError] = useState('');
  
  const queryClient = useQueryClient();

  // Determine the column to filter by based on entity type
  const entityColumn = entityType === 'epic' ? 'epic_id' : 'business_request_id';

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['milestones', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq(entityColumn, entityId)
        .order('due_date');
      if (error) throw error;
      return data || [];
    }
  });

  // Sort milestones
  const sortedMilestones = [...milestones].sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';
    if (sortBy === 'due_date' || sortBy === 'start_date') {
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
      const insertData = { 
        ...data, 
        [entityColumn]: entityId,
        // Ensure category is null for demand
        category: hideCategory ? null : data.category || null
      };
      const { error } = await supabase
        .from('milestones')
        .insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', entityType, entityId] });
      toast.success('Milestone created');
      resetForm();
      setShowAddForm(false);
    },
    onError: (e: any) => toast.error(e.message)
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const updateData = {
        ...data,
        category: hideCategory ? null : data.category || null
      };
      const { error } = await supabase
        .from('milestones')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', entityType, entityId] });
      toast.success('Milestone updated');
      setEditingId(null);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', entityType, entityId] });
      toast.success('Milestone deleted');
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message)
  });

  const resetForm = () => {
    setFormData({
      title: '',
      start_date: '',
      due_date: '',
      description: '',
      state: 'pending',
      category: '',
    });
    setFormError('');
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      setFormError('Enter a name to save your milestone');
      return;
    }
    
    const payload = {
      title: formData.title,
      start_date: formData.start_date || null,
      due_date: formData.due_date || null,
      description: formData.description || null,
      state: formData.state,
      category: hideCategory ? null : formData.category || null,
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

  const handleEdit = (milestone: any) => {
    setEditingId(milestone.id);
    setFormData({
      title: milestone.title || '',
      start_date: milestone.start_date || '',
      due_date: milestone.due_date || '',
      description: milestone.description || '',
      state: milestone.state || 'pending',
      category: milestone.category || '',
    });
    setShowAddForm(false);
  };

  const handleCopy = (milestone: any) => {
    const copyPayload = {
      title: `${milestone.title} (Copy)`,
      start_date: milestone.start_date || null,
      due_date: milestone.due_date || null,
      description: milestone.description || null,
      state: 'pending', // Reset state to pending for the copy
      category: hideCategory ? null : milestone.category || null,
    };
    createMutation.mutate(copyPayload);
  };

  const getStateConfig = (state: string) => {
    return MILESTONE_STATES.find(s => s.value === state) || MILESTONE_STATES[0];
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
        <div className="text-sm text-muted-foreground">Loading milestones...</div>
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
            <SelectTrigger className="w-[120px] h-9 text-sm">
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
          Add milestone
        </Button>
      </div>

      {/* Inline Add Form */}
      {showAddForm && !editingId && (
        <MilestoneForm
          formData={formData}
          setFormData={setFormData}
          formError={formError}
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={createMutation.isPending}
          hideCategory={hideCategory}
        />
      )}

      {/* Milestones List */}
      <div className="space-y-3">
        {sortedMilestones.map((milestone) => {
          const isEditing = editingId === milestone.id;
          const stateConfig = getStateConfig(milestone.state);

          if (isEditing) {
            return (
              <MilestoneForm
                key={milestone.id}
                formData={formData}
                setFormData={setFormData}
                formError={formError}
                onSave={handleSave}
                onCancel={handleCancel}
                isLoading={updateMutation.isPending}
                isEdit
                hideCategory={hideCategory}
              />
            );
          }

          return (
            <div
              key={milestone.id}
              className="border rounded-xl overflow-hidden shadow-sm"
              style={{ 
                borderColor: 'var(--border-color)', 
                backgroundColor: 'var(--surface-1)' 
              }}
            >
              <div 
                className="p-4 transition-colors"
                style={{ backgroundColor: 'var(--surface-1)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-1)'}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground">{milestone.title}</h4>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Start: {formatDate(milestone.start_date)}</span>
                      <span className="mx-1">—</span>
                      <span>Due: {formatDate(milestone.due_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                      stateConfig.color
                    )}>
                      {stateConfig.label}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-[400]">
                        <DropdownMenuItem onClick={() => handleEdit(milestone)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopy(milestone)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(milestone.id)}
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

        {sortedMilestones.length === 0 && !showAddForm && (
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
              <Calendar className="h-6 w-6" style={{ color: 'var(--text-3)' }} />
            </div>
            <h4 
              className="text-sm font-medium mb-1"
              style={{ color: 'var(--text-1)' }}
            >
              No milestones yet
            </h4>
            <p 
              className="text-xs max-w-[280px] mb-4"
              style={{ color: 'var(--text-2)' }}
            >
              Create milestones to track delivery checkpoints for this demand.
            </p>
            <Button
              size="sm"
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              onClick={() => { resetForm(); setShowAddForm(true); setEditingId(null); }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add milestone
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milestone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this milestone? This action cannot be undone.
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

// Inline Milestone Form Component
function MilestoneForm({
  formData,
  setFormData,
  formError,
  onSave,
  onCancel,
  isLoading,
  isEdit = false,
  hideCategory = false
}: {
  formData: any;
  setFormData: (data: any) => void;
  formError: string;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
  isEdit?: boolean;
  hideCategory?: boolean;
}) {
  return (
    <div 
      className="border rounded-xl p-5 space-y-5 shadow-sm"
      style={{ 
        borderColor: 'var(--border-color)', 
        backgroundColor: 'var(--surface-1)' 
      }}
    >
      {/* Name Field */}
      <div>
        <label className="text-xs font-medium">
          Name<span className="text-destructive">*</span>
        </label>
        <Input
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          placeholder="What is a name for your milestone?"
          className="mt-1 h-9 text-sm"
        />
        {formError && formError.includes('name') && (
          <div className="flex items-center gap-1 mt-1 text-destructive text-xs">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{formError}</span>
          </div>
        )}
      </div>

      {/* Date Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium mb-1.5 block">
            Start date
          </Label>
          <CatalystDatePicker
            value={formData.start_date || null}
            onChange={(date) => setFormData({ ...formData, start_date: date ? format(date, 'yyyy-MM-dd') : '' })}
            placeholder="Select start date"
          />
        </div>
        <div>
          <Label className="text-xs font-medium mb-1.5 block">
            Due date
          </Label>
          <CatalystDatePicker
            value={formData.due_date || null}
            onChange={(date) => setFormData({ ...formData, due_date: date ? format(date, 'yyyy-MM-dd') : '' })}
            placeholder="Select due date"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Add description"
          className="mt-1 min-h-[80px] text-sm"
        />
      </div>

      {/* State and Category */}
      <div className={cn("grid gap-3", hideCategory ? "grid-cols-1" : "grid-cols-2")}>
        <div>
          <label className="text-xs font-medium">State</label>
          <Select
            value={formData.state}
            onValueChange={v => setFormData({ ...formData, state: v })}
          >
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg z-[400]">
              {MILESTONE_STATES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!hideCategory && (
          <div>
            <label className="text-xs font-medium flex items-center gap-1">
              Category
              <span className="text-muted-foreground text-xs">ⓘ</span>
            </label>
            <Select
              value={formData.category}
              onValueChange={v => setFormData({ ...formData, category: v })}
            >
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-[400]">
                {MILESTONE_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground"
        >
          Save
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
