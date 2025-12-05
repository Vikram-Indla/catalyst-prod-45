import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, ListChecks, Lightbulb, BookOpen, Target, Users } from 'lucide-react';

const templates = [
  { id: 'blank', title: 'Blank', icon: FileText, content: '<p></p>' },
  { id: 'meeting', title: 'Meeting Notes', icon: Users, content: '<h1>Meeting Notes</h1><p><strong>Date:</strong> [Date]</p><p><strong>Attendees:</strong></p><h2>Agenda</h2><ul><li>Item 1</li></ul><h2>Action Items</h2><ul><li>[ ] Action 1</li></ul>' },
  { id: 'requirements', title: 'Requirements', icon: ListChecks, content: '<h1>Requirements</h1><h2>Overview</h2><p>[Description]</p><h2>User Stories</h2><p>As a [user], I want [goal]</p><h2>Acceptance Criteria</h2><ul><li>Criterion 1</li></ul>' },
  { id: 'decision', title: 'Decision', icon: Target, content: '<h1>Decision Document</h1><p><strong>Status:</strong> Proposed</p><h2>Context</h2><p>[Background]</p><h2>Decision</h2><p>[Decision made]</p><h2>Consequences</h2><p>[Implications]</p>' },
  { id: 'retro', title: 'Retrospective', icon: Lightbulb, content: '<h1>Retrospective</h1><h2>What Went Well 🎉</h2><ul><li></li></ul><h2>What Could Improve 🔧</h2><ul><li></li></ul><h2>Action Items 📋</h2><ul><li></li></ul>' },
  { id: 'howto', title: 'How-To Guide', icon: BookOpen, content: '<h1>How-To: [Topic]</h1><h2>Prerequisites</h2><ul><li></li></ul><h2>Steps</h2><ol><li>Step 1</li><li>Step 2</li></ol><h2>Tips</h2><ul><li></li></ul>' },
];

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
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
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
      const template = templates.find(t => t.id === selectedTemplate);
      
      const { data, error } = await supabase
        .from('kb_documents')
        .insert({
          title: title.trim(),
          space_id: spaceId || null,
          content: template?.content || '<p></p>',
          content_text: template?.content?.replace(/<[^>]*>/g, '') || '',
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
      setSelectedTemplate('blank');
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
      <DialogContent className="sm:max-w-[600px]">
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
          <div className="grid gap-2">
            <Label>Template</Label>
            <div className="grid grid-cols-3 gap-2">
              {templates.map((template) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-brand-gold bg-brand-gold/5'
                        : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardContent className="flex flex-col items-center gap-1 p-3">
                      <Icon className={`h-5 w-5 ${selectedTemplate === template.id ? 'text-brand-gold' : 'text-muted-foreground'}`} />
                      <span className="text-xs font-medium">{template.title}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
