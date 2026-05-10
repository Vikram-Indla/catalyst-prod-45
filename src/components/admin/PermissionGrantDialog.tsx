import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/admin/admin-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import AdsSelect from '@atlaskit/select';
import Button from '@atlaskit/button/new';
import { Checkbox } from '@/components/ui/checkbox';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
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
        const { error } = await typedQuery('permission_grants')
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
        const { error } = await typedQuery('permission_grants')
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
                  <FormControl>
                    <AdsSelect
                      value={field.value ? { label: roles?.find(r => r.id === field.value)?.name || field.value, value: field.value } : null}
                      options={roles?.map(r => ({ label: r.name, value: r.id })) || []}
                      placeholder="Select role"
                      onChange={(opt) => field.onChange(opt?.value || '')}
                    />
                  </FormControl>
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
                  <FormControl>
                    <AdsSelect
                      value={field.value ? { label: field.value.replace(/_/g, ' '), value: field.value } : null}
                      options={entityTypes.map(type => ({ label: type.replace(/_/g, ' '), value: type }))}
                      placeholder="Select entity type"
                      onChange={(opt) => field.onChange(opt?.value || '')}
                    />
                  </FormControl>
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
                  <FormControl>
                    <AdsSelect
                      value={field.value ? { label: field.value.charAt(0).toUpperCase() + field.value.slice(1), value: field.value } : null}
                      options={[
                        { label: 'View', value: 'view' },
                        { label: 'Create', value: 'create' },
                        { label: 'Edit', value: 'edit' },
                        { label: 'Delete', value: 'delete' },
                        { label: 'Link', value: 'link' },
                        { label: 'Move', value: 'move' },
                        { label: 'Configure', value: 'configure' },
                      ]}
                      placeholder="Select action"
                      onChange={(opt) => field.onChange(opt?.value || 'view')}
                    />
                  </FormControl>
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
                  <FormControl>
                    <AdsSelect
                      value={field.value ? { label: field.value.charAt(0).toUpperCase() + field.value.slice(1), value: field.value } : null}
                      options={[
                        { label: 'Global', value: 'global' },
                        { label: 'Portfolio', value: 'portfolio' },
                        { label: 'Program', value: 'program' },
                        { label: 'Team', value: 'team' },
                      ]}
                      placeholder="Select scope"
                      onChange={(opt) => field.onChange(opt?.value || 'global')}
                    />
                  </FormControl>
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
              <Button appearance="default" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button appearance="primary" type="submit" isDisabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
