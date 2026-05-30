import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/admin/admin-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Button from '@atlaskit/button/new';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PermissionRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: { id: string; name: string; description: string | null } | null;
}

export function PermissionRoleDialog({ open, onOpenChange, role }: PermissionRoleDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!role;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: role?.name || '',
      description: role?.description || '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEditing) {
        const { error } = await supabase
          .from('permission_roles')
          .update({
            name: values.name,
            description: values.description || null,
          })
          .eq('id', role.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('permission_roles')
          .insert([{
            name: values.name,
            description: values.description || null,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-roles'] });
      catalystToast.success(isEditing ? 'Role updated successfully' : 'Role created successfully');
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      catalystToast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Permission Role' : 'Create Permission Role'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Textfield
                      value={field.value}
                      onChange={(e) => field.onChange((e.target as HTMLInputElement).value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      placeholder="e.g., Portfolio Manager"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <TextArea
                      value={field.value}
                      onChange={(e) => field.onChange((e.target as HTMLTextAreaElement).value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      placeholder="Role description..."
                      minimumRows={3}
                    />
                  </FormControl>
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
