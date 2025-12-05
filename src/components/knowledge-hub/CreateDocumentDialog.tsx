import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (documentId: string) => void;
  defaultSpaceId?: string;
}

export function CreateDocumentDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  defaultSpaceId 
}: CreateDocumentDialogProps) {
  const [title, setTitle] = useState('');
  const [spaceId, setSpaceId] = useState(defaultSpaceId || '');
  const [isCreating, setIsCreating] = useState(false);

  const { data: spaces } = useQuery({
    queryKey: ['kb-spaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_doc_spaces')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a document title');
      return;
    }

    setIsCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || '00000000-0000-0000-0000-000000000000';
      
      const { data, error } = await supabase
        .from('kb_documents')
        .insert({
          title: title.trim(),
          space_id: spaceId || null,
          content: { type: 'doc', content: [{ type: 'paragraph' }] },
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Document created');
      onOpenChange(false);
      setTitle('');
      setSpaceId(defaultSpaceId || '');
      onSuccess?.(data.id);
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('Failed to create document');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Document</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="space">Space (Optional)</Label>
            <Select value={spaceId} onValueChange={setSpaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a space" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No space</SelectItem>
                {spaces?.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
