import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { TestSet, TEST_SET_TYPE_CONFIG, TestSetType, TestSetMembership, DynamicCriteria } from '@/types/test-sets';
import { useCreateTestSet, useUpdateTestSet } from '@/hooks/useTestSets';
import { useFolders } from '@/hooks/test-management/useFolders';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onClose: () => void;
  editingSet?: TestSet | null;
  projectId: string;
}

const PRIORITIES = ['critical', 'high', 'medium', 'low'];

export function CreateTestSetModal({ open, onClose, editingSet, projectId }: Props) {
  const { user } = useAuth();
  const createMutation = useCreateTestSet();
  const updateMutation = useUpdateTestSet();
  const isEditing = !!editingSet;

  const { data: folders } = useFolders(projectId);
  const { data: allTags } = useQuery({
    queryKey: ['th-tags-all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('th_tags').select('id, name, slug, color, category').order('name');
      if (error) throw new Error(error.message);
      return data as { id: string; name: string; slug: string; color: string; category: string | null }[];
    },
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [setType, setSetType] = useState<TestSetType>('custom');
  const [membershipType, setMembershipType] = useState<TestSetMembership>('static');
  const [criteria, setCriteria] = useState<DynamicCriteria>({ priority: [], tags: [] });

  useEffect(() => {
    if (editingSet) {
      setName(editingSet.name);
      setDescription(editingSet.description || '');
      setSetType(editingSet.set_type);
      setMembershipType(editingSet.membership_type);
      setCriteria(editingSet.dynamic_criteria || { priority: [], tags: [] });
    } else {
      setName(''); setDescription(''); setSetType('custom'); setMembershipType('static');
      setCriteria({ priority: [], tags: [] });
    }
  }, [editingSet, open]);

  const addPriority = (p: string) => {
    if (!(criteria.priority || []).includes(p)) {
      setCriteria({ ...criteria, priority: [...(criteria.priority || []), p] });
    }
  };
  const removePriority = (p: string) => {
    setCriteria({ ...criteria, priority: (criteria.priority || []).filter(x => x !== p) });
  };

  const addTag = (tag: string) => {
    if (!(criteria.tags || []).includes(tag)) {
      setCriteria({ ...criteria, tags: [...(criteria.tags || []), tag] });
    }
  };
  const removeTag = (tag: string) => {
    setCriteria({ ...criteria, tags: (criteria.tags || []).filter(t => t !== tag) });
  };

  const setFolder = (folderId: string) => {
    setCriteria({ ...criteria, folder_id: folderId === 'none' ? undefined : folderId });
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: editingSet.id,
          data: { name, description, set_type: setType, membership_type: membershipType, dynamic_criteria: criteria, owner_id: editingSet.owner_id || undefined },
        });
      } else {
        await createMutation.mutateAsync({
          name, description, set_type: setType, membership_type: membershipType,
          dynamic_criteria: criteria, project_id: projectId, owner_id: user?.id, created_by: user?.id,
        });
      }
      onClose();
    } catch { /* handled by mutation */ }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Test Set' : 'Create Test Set'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-1.5 block">Name *</Label>
            <Input placeholder="Login Smoke Tests" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div>
            <Label className="mb-1.5 block">Description</Label>
            <Textarea placeholder="Describe the purpose..." rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div>
            <Label className="mb-1.5 block">Set Type *</Label>
            <Select value={setType} onValueChange={v => setSetType(v as TestSetType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TEST_SET_TYPE_CONFIG).map(([k, c]) => (
                  <SelectItem key={k} value={k}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block">Membership Type</Label>
            <RadioGroup value={membershipType} onValueChange={v => setMembershipType(v as TestSetMembership)} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="static" id="ts-static" />
                <Label htmlFor="ts-static" className="font-normal cursor-pointer">
                  <span className="font-medium">Static</span>
                  <span className="text-muted-foreground ml-1">— Manually add test cases</span>
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="dynamic" id="ts-dynamic" />
                <Label htmlFor="ts-dynamic" className="font-normal cursor-pointer">
                  <span className="font-medium">Dynamic</span>
                  <span className="text-muted-foreground ml-1">— Auto-populate from criteria</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {membershipType === 'dynamic' && (
            <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">Dynamic Criteria</p>
                <p className="text-xs text-muted-foreground">Test cases matching these criteria will be included</p>
              </div>

              {/* Priority selector */}
              <div>
                <Label className="text-sm mb-1.5 block">Priority</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(criteria.priority || []).map(p => (
                    <Badge key={p} variant="secondary" className="capitalize">
                      {p}
                      <button type="button" onClick={() => removePriority(p)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select onValueChange={addPriority}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Add priority..." /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.filter(p => !(criteria.priority || []).includes(p)).map(p => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags selector */}
              <div>
                <Label className="text-sm mb-1.5 block">Tags</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(criteria.tags || []).map(tag => (
                    <Badge key={tag} variant="secondary" className="capitalize">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select onValueChange={addTag}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Add tag..." /></SelectTrigger>
                  <SelectContent>
                    {(allTags || []).filter(t => !(criteria.tags || []).includes(t.name)).map(t => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Folder selector */}
              <div>
                <Label className="text-sm mb-1.5 block">Folder</Label>
                <Select value={criteria.folder_id || 'none'} onValueChange={setFolder}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Any folder" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any folder</SelectItem>
                    {folders?.map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                Test cases will be refreshed when you click the Refresh button on the test set.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Test Set'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
