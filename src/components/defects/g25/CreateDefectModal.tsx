import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bug, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { defectSchema, DefectFormValues } from '@/schemas/defectSchema';
import { useCreateDefectG25 } from '@/hooks/useDefectsG25';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props { open: boolean; onClose: () => void; linkedTestCaseId?: string; linkedExecutionId?: string; }

export function CreateDefectModalG25({ open, onClose, linkedTestCaseId, linkedExecutionId }: Props) {
  const create = useCreateDefectG25();
  const { data: users } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => { const { data } = await supabase.from('profiles').select('id, full_name').order('full_name'); return data || []; },
  });

  const form = useForm<DefectFormValues>({
    resolver: zodResolver(defectSchema),
    defaultValues: { title: '', description: '', severity: 'medium', priority: 'medium', assigned_to: null, component: '', environment: '', affected_version: '', due_date: null, folder_id: null, steps_to_reproduce: '', expected_result: '', actual_result: '' },
  });

  const onSubmit = async (values: DefectFormValues) => {
    await create.mutateAsync(values);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Bug className="h-5 w-5 text-destructive" />New Defect</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title *</FormLabel><FormControl><Input placeholder="Brief description of the issue" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Detailed description..." rows={3} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="severity" render={({ field }) => (
                <FormItem><FormLabel>Severity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="critical">🔴 Critical</SelectItem><SelectItem value="high">🟠 High</SelectItem><SelectItem value="medium">🟡 Medium</SelectItem><SelectItem value="low">🟢 Low</SelectItem></SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem><FormLabel>Priority</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="urgent">⚡ Urgent</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="assigned_to" render={({ field }) => (
                <FormItem><FormLabel>Assigned To</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select assignee..." /></SelectTrigger></FormControl>
                  <SelectContent>{users?.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="environment" render={({ field }) => (
                <FormItem><FormLabel>Environment</FormLabel><FormControl><Input placeholder="e.g., Production" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="component" render={({ field }) => (
                <FormItem><FormLabel>Component</FormLabel><FormControl><Input placeholder="e.g., Authentication" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="affected_version" render={({ field }) => (
                <FormItem><FormLabel>Affected Version</FormLabel><FormControl><Input placeholder="e.g., v2.3.1" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="steps_to_reproduce" render={({ field }) => (
              <FormItem><FormLabel>Steps to Reproduce</FormLabel><FormControl><Textarea placeholder="1. Go to...\n2. Click on...\n3. Observe..." rows={4} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="expected_result" render={({ field }) => (
                <FormItem><FormLabel>Expected Result</FormLabel><FormControl><Textarea placeholder="What should happen..." rows={2} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="actual_result" render={({ field }) => (
                <FormItem><FormLabel>Actual Result</FormLabel><FormControl><Textarea placeholder="What actually happens..." rows={2} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="due_date" render={({ field }) => (
              <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bug className="h-4 w-4 mr-2" />}Create Defect
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
