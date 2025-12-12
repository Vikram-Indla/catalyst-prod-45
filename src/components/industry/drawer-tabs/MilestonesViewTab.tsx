import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Milestone, Plus, Calendar, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { BusinessRequest } from '@/types/business-request';
import { cn } from '@/lib/utils';

interface MilestoneData {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  due_date: string;
  state: string | null;
  category: string | null;
  business_request_id: string;
  created_at: string;
}

interface MilestonesViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const STATE_OPTIONS = ['Pending', 'In Progress', 'Complete', 'Blocked'];
const CATEGORY_OPTIONS = ['General', 'Technical', 'Business', 'Compliance', 'Delivery'];

const getStateColor = (state: string | null) => {
  switch (state?.toLowerCase()) {
    case 'in progress':
      return 'text-blue-600 bg-blue-100';
    case 'complete':
      return 'text-emerald-600 bg-emerald-100';
    case 'blocked':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-slate-600 bg-slate-100';
  }
};

export function MilestonesViewTab({ data }: MilestonesViewTabProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneData | null>(null);
  const [sortBy, setSortBy] = useState('due_date');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [state, setState] = useState('Pending');
  const [category, setCategory] = useState('');

  const requestId = data.id;

  // Fetch milestones for this business request
  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['milestones', requestId],
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('business_request_id', requestId)
        .order(sortBy, { ascending: true });
      if (error) throw error;
      return data as MilestoneData[];
    },
    enabled: !!requestId,
  });

  // Create milestone
  const createMutation = useMutation({
    mutationFn: async (milestone: Omit<MilestoneData, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('milestones').insert(milestone);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', requestId] });
      toast.success('Milestone created');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to create milestone: ${error.message}`);
    },
  });

  // Update milestone
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MilestoneData> & { id: string }) => {
      const { error } = await supabase.from('milestones').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', requestId] });
      toast.success('Milestone updated');
      resetForm();
      setIsDialogOpen(false);
      setEditingMilestone(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to update milestone: ${error.message}`);
    },
  });

  // Delete milestone
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('milestones').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', requestId] });
      toast.success('Milestone deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete milestone: ${error.message}`);
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setDueDate('');
    setState('Pending');
    setCategory('');
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingMilestone(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (milestone: MilestoneData) => {
    setEditingMilestone(milestone);
    setTitle(milestone.title);
    setDescription(milestone.description || '');
    setStartDate(milestone.start_date || '');
    setDueDate(milestone.due_date);
    setState(milestone.state || 'Pending');
    setCategory(milestone.category || '');
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!dueDate) {
      toast.error('Due date is required');
      return;
    }

    const milestoneData = {
      title: title.trim(),
      description: description.trim() || null,
      start_date: startDate || null,
      due_date: dueDate,
      state,
      category: category || null,
      business_request_id: requestId!,
    };

    if (editingMilestone) {
      updateMutation.mutate({ id: editingMilestone.id, ...milestoneData });
    } else {
      createMutation.mutate(milestoneData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this milestone?')) {
      deleteMutation.mutate(id);
    }
  };

  if (!requestId) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          <Milestone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Save the request first to add milestones.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Sort by</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">Due Date</SelectItem>
              <SelectItem value="title">Name</SelectItem>
              <SelectItem value="state">State</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreateDialog} variant="ghost" size="sm" className="gap-2 text-brand-gold hover:text-brand-gold">
          <Plus className="h-4 w-4" />
          Add milestone
        </Button>
      </div>

      {/* Milestones List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading milestones...</div>
      ) : milestones.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Milestone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No milestones yet</h3>
          <p className="text-sm max-w-md mx-auto">
            Track key milestones and deliverables for this demand request.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="p-4 border border-border rounded-lg bg-card hover:border-brand-gold/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-base font-medium text-foreground">{milestone.title}</h4>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(milestone)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(milestone.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                {milestone.start_date && <span>Start: {format(new Date(milestone.start_date), 'MMM d, yyyy')}</span>}
                {milestone.start_date && <span>—</span>}
                <span>Due: {format(new Date(milestone.due_date), 'MMM d, yyyy')}</span>
              </div>

              {milestone.description && (
                <p className="text-sm text-muted-foreground mb-3">{milestone.description}</p>
              )}

              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded", getStateColor(milestone.state))}>
                  {milestone.state || 'Pending'}
                </span>
                {milestone.category && (
                  <span className="text-xs text-muted-foreground">
                    {milestone.category}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingMilestone ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Milestone name"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">
                  Due Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description..."
                className="mt-1 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingMilestone ? 'Save Changes' : 'Create Milestone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}