import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  objective_level_id: z.string().min(1, 'Objective level is required'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  confidence: z.enum(['high', 'med', 'low']),
  progress_pct: z.number().min(0).max(100).optional(),
  theme_ids: z.array(z.string()).optional(),
  initiative_ids: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ObjectiveDialogProps {
  open: boolean;
  onClose: () => void;
  objectiveId?: string;
  scopeType?: 'company' | 'portfolio' | 'program';
}

export function ObjectiveDialog({ open, onClose, objectiveId, scopeType }: ObjectiveDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!objectiveId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      objective_level_id: '',
      start_date: '',
      end_date: '',
      confidence: 'med',
      progress_pct: 0,
      theme_ids: [],
      initiative_ids: [],
    },
  });

  const { data: objectiveLevels } = useQuery({
    queryKey: ['objective-levels', scopeType],
    queryFn: async () => {
      let query = supabase.from('objective_levels').select('*');
      if (scopeType) {
        query = query.eq('scope_type', scopeType);
      }
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: themes } = useQuery({
    queryKey: ['strategic-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: initiatives } = useQuery({
    queryKey: ['initiatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('initiatives')
        .select('id, name')
        .in('status', ['proposed', 'active'])
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: existingObjective } = useQuery({
    queryKey: ['objective', objectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', objectiveId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  const { data: existingThemeLinks } = useQuery({
    queryKey: ['objective-theme-links', objectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objective_theme_links')
        .select('theme_id')
        .eq('objective_id', objectiveId!);
      if (error) throw error;
      return data.map(link => link.theme_id);
    },
    enabled: isEdit,
  });

  const { data: existingInitiativeLinks } = useQuery({
    queryKey: ['objective-initiative-links', objectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objective_initiative_links')
        .select('initiative_id')
        .eq('objective_id', objectiveId!);
      if (error) throw error;
      return data.map(link => link.initiative_id);
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingObjective) {
      form.reset({
        name: existingObjective.name,
        objective_level_id: existingObjective.objective_level_id,
        start_date: existingObjective.start_date || '',
        end_date: existingObjective.end_date || '',
        confidence: existingObjective.confidence || 'med',
        progress_pct: existingObjective.progress_pct || 0,
        theme_ids: existingThemeLinks || [],
        initiative_ids: existingInitiativeLinks || [],
      });
    }
  }, [existingObjective, existingThemeLinks, existingInitiativeLinks, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        objective_level_id: data.objective_level_id,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        confidence: data.confidence,
        progress_pct: data.progress_pct || 0,
      };

      let objId = objectiveId;
      
      if (isEdit) {
        const { error } = await supabase
          .from('objectives')
          .update(payload)
          .eq('id', objectiveId);
        if (error) throw error;
      } else {
        const { data: newObj, error } = await supabase
          .from('objectives')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        objId = newObj.id;
      }

      // Update theme links
      await supabase.from('objective_theme_links').delete().eq('objective_id', objId);
      if (data.theme_ids && data.theme_ids.length > 0) {
        const themeLinks = data.theme_ids.map(themeId => ({
          objective_id: objId,
          theme_id: themeId,
        }));
        const { error } = await supabase.from('objective_theme_links').insert(themeLinks);
        if (error) throw error;
      }

      // Update initiative links
      await supabase.from('objective_initiative_links').delete().eq('objective_id', objId);
      if (data.initiative_ids && data.initiative_ids.length > 0) {
        const initiativeLinks = data.initiative_ids.map(initiativeId => ({
          objective_id: objId,
          initiative_id: initiativeId,
        }));
        const { error } = await supabase.from('objective_initiative_links').insert(initiativeLinks);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast.success(isEdit ? 'Objective updated' : 'Objective created');
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} objective: ${error.message}`);
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'Create'} Objective</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Increase market share" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="objective_level_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objective Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {objectiveLevels?.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="confidence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confidence</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="med">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="progress_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progress %</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="theme_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked Themes</FormLabel>
                  <ScrollArea className="h-32 border rounded-md p-3">
                    {themes?.map((theme) => (
                      <div key={theme.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          checked={field.value?.includes(theme.id)}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            field.onChange(
                              checked
                                ? [...current, theme.id]
                                : current.filter((id) => id !== theme.id)
                            );
                          }}
                        />
                        <label className="text-sm">{theme.name}</label>
                      </div>
                    ))}
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initiative_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked Initiatives</FormLabel>
                  <ScrollArea className="h-32 border rounded-md p-3">
                    {initiatives?.map((initiative) => (
                      <div key={initiative.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          checked={field.value?.includes(initiative.id)}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            field.onChange(
                              checked
                                ? [...current, initiative.id]
                                : current.filter((id) => id !== initiative.id)
                            );
                          }}
                        />
                        <label className="text-sm">{initiative.name}</label>
                      </div>
                    ))}
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
