/**
 * New Suite Modal
 * Create a new test suite
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NewSuiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolderId?: string | null;
  parentFolderName?: string;
}

export function NewSuiteModal({ 
  open, 
  onOpenChange, 
  parentFolderId,
  parentFolderName 
}: NewSuiteModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast({
      title: 'Test suite created',
      description: `"${name}" has been created successfully.`,
    });
    
    resetForm();
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTags('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            New Test Suite
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {parentFolderName && (
            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              Creating in: <span className="font-medium text-foreground">{parentFolderName}</span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="suite-name">Suite Name *</Label>
            <Input
              id="suite-name"
              placeholder="e.g., Login Tests"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suite-description">Description</Label>
            <Textarea
              id="suite-description"
              placeholder="Brief description of what this suite tests..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suite-tags">Tags</Label>
            <Input
              id="suite-tags"
              placeholder="e.g., smoke, critical-path (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Separate multiple tags with commas
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Suite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
