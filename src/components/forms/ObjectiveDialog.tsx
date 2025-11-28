import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const formSchema = z.object({
  summary: z.string().min(1, 'Objective summary is required'),
  description: z.string().optional(),
  tier: z.enum(['portfolio', 'program', 'team', 'solution']),
  portfolio_id: z.string().optional(),
  program_id: z.string().optional(),
  team_id: z.string().optional(),
  parent_objective_id: z.string().optional(),
  owner_id: z.string().optional(),
  status: z.enum(['on_track', 'at_risk', 'off_track', 'pending', 'completed', 'paused']),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  tags: z.array(z.string()).optional(),
  program_increment_ids: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ObjectiveDialogProps {
  open: boolean;
  onClose: () => void;
  objectiveId?: string;
  scopeType?: 'portfolio' | 'program' | 'team' | 'enterprise';
  scopeId?: string;
}

export function ObjectiveDialog({ open, onClose, objectiveId, scopeType = 'portfolio', scopeId }: ObjectiveDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!objectiveId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      summary: '',
      description: '',
      tier: 'portfolio',
      portfolio_id: scopeType === 'portfolio' ? scopeId : '',
      program_id: scopeType === 'program' ? scopeId : '',
      team_id: scopeType === 'team' ? scopeId : '',
      parent_objective_id: '',
      owner_id: '',
      status: 'pending',
      start_date: '',
      due_date: '',
      tags: [],
      program_increment_ids: [],
    },
  });

  const selectedTier = form.watch('tier');
  const [currentTag, setCurrentTag] = useState('');

  // Fetch portfolios
  const { data: portfolios } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch programs
  const { data: programs } = useQuery({
    queryKey: ['programs', form.watch('portfolio_id')],
    queryFn: async () => {
      let query = supabase.from('programs').select('id, name, portfolio_id').order('name');
      const portfolioId = form.watch('portfolio_id');
      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ['teams', form.watch('program_id')],
    queryFn: async () => {
      let query = supabase.from('teams').select('id, name, program_id').order('name');
      const programId = form.watch('program_id');
      if (programId) {
        query = query.eq('program_id', programId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch program increments
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('id, name')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch users for owner selection
  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch parent objectives (filtered by tier hierarchy)
  const { data: parentObjectives } = useQuery({
    queryKey: ['parent-objectives', selectedTier],
    queryFn: async () => {
      const tierHierarchy: Record<string, string[]> = {
        team: ['program', 'portfolio', 'solution'],
        program: ['portfolio', 'solution'],
        solution: ['portfolio'],
        portfolio: [],
      };
      
      const allowedTiers = tierHierarchy[selectedTier] || [];
      if (allowedTiers.length === 0) return [];

      const { data, error } = await supabase
        .from('objectives')
        .select('id, summary, tier')
        .in('tier', allowedTiers)
        .order('summary');
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing objective for edit mode
  const { data: existingObjective } = useQuery({
    queryKey: ['objective', objectiveId],
    queryFn: async () => {
      if (!objectiveId) return null;
      const { data, error } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', objectiveId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingObjective) {
      form.reset({
        summary: existingObjective.summary || '',
        description: existingObjective.description || '',
        tier: (existingObjective.tier as 'portfolio' | 'program' | 'team' | 'solution') || 'portfolio',
        portfolio_id: existingObjective.portfolio_id || '',
        program_id: existingObjective.program_id || '',
        team_id: existingObjective.team_id || '',
        parent_objective_id: existingObjective.parent_objective_id || '',
        owner_id: existingObjective.owner_id || '',
        status: (existingObjective.status as 'on_track' | 'at_risk' | 'off_track' | 'pending' | 'completed' | 'paused') || 'pending',
        start_date: existingObjective.start_date || '',
        due_date: existingObjective.due_date || '',
        tags: existingObjective.tags || [],
        program_increment_ids: (Array.isArray(existingObjective.program_increment_ids)
          ? existingObjective.program_increment_ids.filter((id): id is string => typeof id === 'string')
          : []),
      });
    }
  }, [existingObjective, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: any = {
        summary: data.summary,
        description: data.description || null,
        tier: data.tier,
        portfolio_id: data.portfolio_id || null,
        program_id: data.program_id || null,
        team_id: data.team_id || null,
        parent_objective_id: data.parent_objective_id || null,
        owner_id: data.owner_id || null,
        status: data.status,
        start_date: data.start_date || null,
        due_date: data.due_date || null,
        tags: data.tags || [],
        program_increment_ids: data.program_increment_ids || [],
        level: data.tier, // Map tier to level field
      };

      if (isEdit) {
        const { error } = await supabase
          .from('objectives')
          .update(payload)
          .eq('id', objectiveId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('objectives')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast.success(isEdit ? 'Objective updated successfully' : 'Objective created successfully');
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} objective: ${error.message}`);
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const addTag = () => {
    if (currentTag.trim()) {
      const currentTags = form.getValues('tags') || [];
      if (!currentTags.includes(currentTag.trim())) {
        form.setValue('tags', [...currentTags, currentTag.trim()]);
        setCurrentTag('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
          <SheetTitle>{isEdit ? 'Edit Objective' : 'Create New Objective'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            {/* Objective Summary */}
            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objective Summary *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Increase customer satisfaction to 95%" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Short description of the objective" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tier Selection */}
            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tier *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="program">Program</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Portfolio Selection */}
            {(selectedTier === 'portfolio' || selectedTier === 'program' || selectedTier === 'team') && (
              <FormField
                control={form.control}
                name="portfolio_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio {selectedTier === 'portfolio' && '*'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select portfolio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {portfolios?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Program Selection */}
            {(selectedTier === 'program' || selectedTier === 'team') && (
              <FormField
                control={form.control}
                name="program_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program {selectedTier === 'program' && '*'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {programs?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Team Selection */}
            {selectedTier === 'team' && (
              <FormField
                control={form.control}
                name="team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {teams?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Parent Objective */}
            <FormField
              control={form.control}
              name="parent_objective_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Objective</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent objective" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {parentObjectives?.map((obj) => (
                        <SelectItem key={obj.id} value={obj.id}>
                          {obj.summary} ({obj.tier})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Owner */}
            <FormField
              control={form.control}
              name="owner_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="on_track">On Track</SelectItem>
                      <SelectItem value="at_risk">At Risk</SelectItem>
                      <SelectItem value="off_track">Off Track</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Program Increments */}
            <FormField
              control={form.control}
              name="program_increment_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program Increment(s)</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const currentValues = field.value || [];
                      if (!currentValues.includes(value) && value !== 'none') {
                        field.onChange([...currentValues, value]);
                      }
                    }}
                    value="none"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Add program increment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Select PI...</SelectItem>
                      {programIncrements?.map((pi) => (
                        <SelectItem key={pi.id} value={pi.id}>
                          {pi.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(field.value || []).map((piId) => {
                      const pi = programIncrements?.find(p => p.id === piId);
                      return pi ? (
                        <Badge key={piId} variant="secondary" className="flex items-center gap-1">
                          {pi.name}
                          <button
                            type="button"
                            onClick={() => {
                              field.onChange((field.value || []).filter(id => id !== piId));
                            }}
                            className="ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Type and press Enter"
                    />
                    <Button type="button" onClick={addTag} variant="outline">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(field.value || []).map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : isEdit ? 'Update Objective' : 'Create Objective'}
              </Button>
            </div>
          </form>
        </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
