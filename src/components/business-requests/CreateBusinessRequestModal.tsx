import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateBusinessRequest } from '@/hooks/useBusinessRequests';
import {
  createBusinessRequestSchema,
  CreateBusinessRequestFormData,
  PLATFORM_OPTIONS,
  COMPLEXITY_OPTIONS,
  URGENCY_OPTIONS,
  TRACK_OPTIONS,
} from '@/types/business-request';

interface CreateBusinessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBusinessRequestModal({ isOpen, onClose }: CreateBusinessRequestModalProps) {
  const createMutation = useCreateBusinessRequest();
  
  const form = useForm<CreateBusinessRequestFormData>({
    resolver: zodResolver(createBusinessRequestSchema),
    defaultValues: {
      title: '',
      description: '',
      platform: '',
      complexity: '',
      urgency: '',
      track: '',
      requestor: '',
      business_justification: '',
    },
  });

  const onSubmit = async (data: CreateBusinessRequestFormData) => {
    await createMutation.mutateAsync(data);
    form.reset();
    onClose();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-[#feffff]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1a1a1a]">Create Business Request</DialogTitle>
          <DialogDescription className="text-[#6b7280]">
            Submit a new business request for review
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#1a1a1a] font-medium">
                    Title <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter request title" 
                      {...field} 
                      className="border-[#e5e5e5] focus:border-brand-gold focus:ring-brand-gold/20"
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
                  <FormLabel className="text-[#1a1a1a] font-medium">Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your request..." 
                      {...field} 
                      className="border-[#e5e5e5] focus:border-brand-gold focus:ring-brand-gold/20 min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#1a1a1a] font-medium">
                      Platform <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-[#e5e5e5] focus:border-brand-gold focus:ring-brand-gold/20">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="complexity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#1a1a1a] font-medium">
                      Complexity <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-[#e5e5e5] focus:border-brand-gold focus:ring-brand-gold/20">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMPLEXITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#1a1a1a] font-medium">
                      Urgency <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-[#e5e5e5] focus:border-brand-gold focus:ring-brand-gold/20">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {URGENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="track"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#1a1a1a] font-medium">Track</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-[#e5e5e5] focus:border-brand-gold focus:ring-brand-gold/20">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRACK_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requestor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#1a1a1a] font-medium">Requestor</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter requestor name" 
                        {...field} 
                        className="border-[#e5e5e5] focus:border-brand-gold focus:ring-brand-gold/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="business_justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#1a1a1a] font-medium">Business Justification</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Explain business value..." 
                      {...field} 
                      className="border-[#e5e5e5] focus:border-brand-gold focus:ring-brand-gold/20 min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="border-[#e5e5e5]">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="bg-brand-gold text-white hover:bg-brand-gold-hover"
              >
                {createMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
