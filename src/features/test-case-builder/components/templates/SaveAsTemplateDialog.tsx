/**
 * Save As Template Dialog
 * Create a template from an existing test case
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText } from 'lucide-react';
import {
  useTemplateCategories,
  useCreateTemplateFromTestCase,
} from '../../hooks/useTemplates';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCaseId: string;
  testCaseTitle?: string;
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  testCaseId,
  testCaseTitle,
}: SaveAsTemplateDialogProps) {
  const { data: categories = [] } = useTemplateCategories();
  const createFromTestCase = useCreateTemplateFromTestCase();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isGlobal, setIsGlobal] = useState(false);

  // Reset when dialog opens
  React.useEffect(() => {
    if (open) {
      setName(testCaseTitle ? `${testCaseTitle} Template` : '');
      setCategoryId('');
      setIsGlobal(false);
    }
  }, [open, testCaseTitle]);

  const handleSubmit = async () => {
    await createFromTestCase.mutateAsync({
      testCaseId,
      templateName: name,
      categoryId: categoryId || undefined,
      isGlobal,
    });
    onOpenChange(false);
  };

  const canSubmit = name.trim().length > 0 && !createFromTestCase.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Create a reusable template from this test case including all steps and
            configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Login Flow Template"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Uncategorized</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="global-switch">Make Global</Label>
              <p className="text-xs text-muted-foreground">
                Available across all projects
              </p>
            </div>
            <Switch
              id="global-switch"
              checked={isGlobal}
              onCheckedChange={setIsGlobal}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {createFromTestCase.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
