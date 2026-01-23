import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formSchema = z.object({
  role_id: z.string().min(1, 'Role is required'),
  entity_type: z.string().min(1, 'Entity type is required'),
  action: z.enum(['view', 'create', 'edit', 'delete', 'link', 'move', 'configure']),
  scope_type: z.enum(['global', 'portfolio', 'program', 'team']),
  allowed: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface PermissionGrantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grant?: any;
}

const entityTypes = [
  'strategic_themes',
  'initiatives',
  'epics',
  'features',
  'stories',
  'subtasks',
  'risks',
  'dependencies',
  'program_increments',
  'iterations',
  'releases',
  'portfolios',
  'programs',
  'teams',
];

export function PermissionGrantDialog({ open, onOpenChange, grant }: PermissionGrantDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!grant;

  const { data: roles } = useQuery({
    queryKey: ['permission-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_roles')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role_id: grant?.role_id || '',
      entity_type: grant?.entity_type || '',
      action: grant?.action || 'view',
      scope_type: grant?.scope_type || 'global',
      allowed: grant?.allowed ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEditing) {
        const { error } = await supabase
          .from('permission_grants')
          .update({
            role_id: values.role_id,
            entity_type: values.entity_type,
            action: values.action,
            scope_type: values.scope_type,
            allowed: values.allowed,
          })
          .eq('id', grant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('permission_grants')
          .insert([{
            role_id: values.role_id,
            entity_type: values.entity_type,
            action: values.action,
            scope_type: values.scope_type,
            allowed: values.allowed,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-grants'] });
      toast.success(isEditing ? 'Grant updated successfully' : 'Grant created successfully');
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Permission Grant' : 'Create Permission Grant'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <FormField
              control={form.control}
              name="role_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles?.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="entity_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {entityTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="move">Move</SelectItem>
                      <SelectItem value="configure">Configure</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scope_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="program">Program</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowed"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Allowed</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
