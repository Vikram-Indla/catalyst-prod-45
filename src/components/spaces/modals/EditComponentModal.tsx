// ════════════════════════════════════════════════════════════════════════════
// EDIT COMPONENT MODAL
// ════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useSpaceStore } from '@/stores/spaceStore';
import type { SpaceComponent } from '@/types/spaces';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  lead_user_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditComponentModalProps {
  component?: SpaceComponent | null;
  onSave: (data: FormData) => void;
}

export function EditComponentModal({ component, onSave }: EditComponentModalProps) {
  const { editComponentId, closeEditComponentModal } = useSpaceStore();
  const isOpen = !!editComponentId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      lead_user_id: '',
    },
  });

  useEffect(() => {
    if (component) {
      form.reset({
        name: component.name,
        description: component.description || '',
        lead_user_id: component.lead_id || '',
      });
    }
  }, [component, form]);

  const handleSubmit = (data: FormData) => {
    onSave(data);
    closeEditComponentModal();
    form.reset();
  };

  const handleClose = () => {
    closeEditComponentModal();
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Component</DialogTitle>
          <DialogDescription>
            Update the component details below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Component name" {...field} />
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
                    <Textarea
                      placeholder="Brief description of the component"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
