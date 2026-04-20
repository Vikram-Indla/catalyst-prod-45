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
import { adfToPlainText } from '@/components/shared/rich-text/atlaskit/adfHelpers';

// 2026-04-20 — Templates switched from HTML (TipTap consumer) to ADF
// JSON (Atlaskit consumer). Each template is a minimal ADF `doc` made
// of `heading` + `paragraph` + `bulletList` / `orderedList` nodes —
// the same primitives @atlaskit/editor-core renders natively.
interface Adf { version: 1; type: 'doc'; content: unknown[] }

const H = (level: 1 | 2 | 3, text: string) => ({
  type: 'heading',
  attrs: { level },
  content: [{ type: 'text', text }],
});
const P = (text = '') => ({
  type: 'paragraph',
  content: text ? [{ type: 'text', text }] : [],
});
const PStrongPrefix = (label: string, trail: string) => ({
  type: 'paragraph',
  content: [
    { type: 'text', text: label, marks: [{ type: 'strong' }] },
    { type: 'text', text: trail },
  ],
});
const UL = (items: string[]) => ({
  type: 'bulletList',
  content: items.map((t) => ({
    type: 'listItem',
    content: [P(t)],
  })),
});
const OL = (items: string[]) => ({
  type: 'orderedList',
  content: items.map((t) => ({
    type: 'listItem',
    content: [P(t)],
  })),
});
const doc = (...blocks: unknown[]): Adf => ({ version: 1, type: 'doc', content: blocks });

const templates = [
  { id: 'blank', title: 'Blank', icon: FileText, content: doc(P()) },
  {
    id: 'meeting', title: 'Meeting Notes', icon: Users,
    content: doc(
      H(1, 'Meeting Notes'),
      PStrongPrefix('Date: ', '[Date]'),
      PStrongPrefix('Attendees: ', ''),
      H(2, 'Agenda'),
      UL(['Item 1']),
      H(2, 'Action Items'),
      UL(['Action 1']),
    ),
  },
  {
    id: 'requirements', title: 'Requirements', icon: ListChecks,
    content: doc(
      H(1, 'Requirements'),
      H(2, 'Overview'),
      P('[Description]'),
      H(2, 'User Stories'),
      P('As a [user], I want [goal]'),
      H(2, 'Acceptance Criteria'),
      UL(['Criterion 1']),
    ),
  },
  {
    id: 'decision', title: 'Decision', icon: Target,
    content: doc(
      H(1, 'Decision Document'),
      PStrongPrefix('Status: ', 'Proposed'),
      H(2, 'Context'),
      P('[Background]'),
      H(2, 'Decision'),
      P('[Decision made]'),
      H(2, 'Consequences'),
      P('[Implications]'),
    ),
  },
  {
    id: 'retro', title: 'Retrospective', icon: Lightbulb,
    content: doc(
      H(1, 'Retrospective'),
      H(2, 'What Went Well'),
      UL(['']),
      H(2, 'What Could Improve'),
      UL(['']),
      H(2, 'Action Items'),
      UL(['']),
    ),
  },
  {
    id: 'howto', title: 'How-To Guide', icon: BookOpen,
    content: doc(
      H(1, 'How-To: [Topic]'),
      H(2, 'Prerequisites'),
      UL(['']),
      H(2, 'Steps'),
      OL(['Step 1', 'Step 2']),
      H(2, 'Tips'),
      UL(['']),
    ),
  },
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
      
      const adf = template?.content ?? doc(P());
      const serialized = JSON.stringify(adf);
      const { data, error } = await supabase
        .from('kb_documents')
        .insert({
          title: title.trim(),
          space_id: spaceId || null,
          content: serialized,
          content_text: adfToPlainText(adf),
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
            <Select value={spaceId || "none"} onValueChange={(val) => setSpaceId(val === "none" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a space" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No space</SelectItem>
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
                        ? 'border-brand-primary bg-brand-primary/5'
                        : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardContent className="flex flex-col items-center gap-1 p-3">
                      <Icon className={`h-5 w-5 ${selectedTemplate === template.id ? 'text-brand-primary' : 'text-muted-foreground'}`} />
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
