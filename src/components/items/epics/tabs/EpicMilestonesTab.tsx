import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Calendar, MoreHorizontal, ChevronDown, ChevronUp, ArrowDownAZ, ArrowUpAZ, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EpicMilestonesTabProps {
  epic: any;
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

export function EpicMilestonesTab({ epic }: EpicMilestonesTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
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

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('epic_id', epic.id)
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
      const { error } = await supabase
        .from('milestones')
        .insert({ ...data, epic_id: epic.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Milestone created');
      resetForm();
      setShowAddForm(false);
    },
    onError: (e: any) => toast.error(e.message)
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('milestones')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
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
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
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
    if (!formData.due_date) {
      setFormError('Due date is required');
      return;
    }
    
    const payload = {
      title: formData.title,
      start_date: formData.start_date || null,
      due_date: formData.due_date,
      description: formData.description || null,
      state: formData.state,
      category: formData.category || null,
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

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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

  return (
    <div className="space-y-4">
      {/* Header with Sort and Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px] h-8">
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
        />
      )}

      {/* Milestones List */}
      <div className="space-y-3">
        {sortedMilestones.map((milestone) => {
          const isEditing = editingId === milestone.id;
          const isExpanded = expandedIds.has(milestone.id);
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
              />
            );
          }

          return (
            <div
              key={milestone.id}
              className="border rounded-lg bg-card overflow-hidden"
            >
              {/* Collapsed View */}
              <div
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(milestone.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{milestone.title}</h4>
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Start: {formatDate(milestone.start_date)}</span>
                      <span className="mx-1">—</span>
                      <span>Due: {formatDate(milestone.due_date)}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(milestone)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
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

              {/* Expanded View */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t bg-muted/20">
                  <div className="pt-3 space-y-2">
                    <div className="text-sm text-foreground font-medium">{milestone.title}</div>
                    <div>
                      <span className="text-sm text-muted-foreground">State</span>
                      <div className="mt-1">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded text-xs font-medium uppercase",
                          stateConfig.color
                        )}>
                          {stateConfig.label}
                        </span>
                      </div>
                    </div>
                    {milestone.category && (
                      <div>
                        <span className="text-sm text-muted-foreground">Category</span>
                        <div className="text-sm mt-0.5 capitalize">{milestone.category}</div>
                      </div>
                    )}
                    {milestone.description && (
                      <div>
                        <span className="text-sm text-muted-foreground">Description</span>
                        <div className="text-sm mt-0.5">{milestone.description}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sortedMilestones.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No milestones defined yet. Click "Add milestone" to create one.
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
      {/* Name Field */}
      <div>
        <label className="text-sm font-medium">
          Name<span className="text-destructive">*</span>
        </label>
        <Input
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          placeholder="What is a name for your milestone?"
          className="mt-1"
        />
        {formError && formError.includes('name') && (
          <div className="flex items-center gap-1 mt-1 text-destructive text-sm">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{formError}</span>
          </div>
        )}
      </div>

      {/* Date Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium flex items-center gap-1">
            Start date
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          </label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
            className="mt-1"
            placeholder="mm/dd/yyyy"
          />
        </div>
        <div>
          <label className="text-sm font-medium flex items-center gap-1">
            Due date
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          </label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={e => setFormData({ ...formData, due_date: e.target.value })}
            className="mt-1"
            placeholder="mm/dd/yyyy"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Add description"
          className="mt-1 min-h-[80px]"
        />
      </div>

      {/* State and Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">State</label>
          <Select
            value={formData.state}
            onValueChange={v => setFormData({ ...formData, state: v })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {MILESTONE_STATES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium flex items-center gap-1">
            Category
            <span className="text-muted-foreground text-xs">ⓘ</span>
          </label>
          <Select
            value={formData.category}
            onValueChange={v => setFormData({ ...formData, category: v })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {MILESTONE_CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
