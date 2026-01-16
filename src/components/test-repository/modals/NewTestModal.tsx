/**
 * New Test Modal
 * Create a new test case
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TestCasePriority } from '@/types/test-repository';

interface NewTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suiteId: string;
  suiteName: string;
}

interface TestStep {
  action: string;
  expectedResult: string;
}

export function NewTestModal({ 
  open, 
  onOpenChange, 
  suiteId,
  suiteName 
}: NewTestModalProps) {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<TestCasePriority>('medium');
  const [preconditions, setPreconditions] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<TestStep[]>([{ action: '', expectedResult: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast({
      title: 'Test case created',
      description: `"${name}" has been added to ${suiteName}.`,
    });
    
    resetForm();
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    setName('');
    setPriority('medium');
    setPreconditions('');
    setDescription('');
    setSteps([{ action: '', expectedResult: '' }]);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const addStep = () => {
    setSteps([...steps, { action: '', expectedResult: '' }]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, field: keyof TestStep, value: string) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            New Test Case
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
            Adding to: <span className="font-medium text-foreground">{suiteName}</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="test-name">Test Name *</Label>
              <Input
                id="test-name"
                placeholder="e.g., Valid email and password login"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TestCasePriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-description">Description</Label>
            <Textarea
              id="test-description"
              placeholder="What does this test verify?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-preconditions">Preconditions</Label>
            <Textarea
              id="test-preconditions"
              placeholder="Setup requirements before running this test..."
              value={preconditions}
              onChange={(e) => setPreconditions(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Test Steps</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={addStep}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Step
              </Button>
            </div>
            
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={index} className="p-3 border border-border rounded-lg bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                      Step {index + 1}
                    </span>
                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Action to perform..."
                    value={step.action}
                    onChange={(e) => updateStep(index, 'action', e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Expected result..."
                    value={step.expectedResult}
                    onChange={(e) => updateStep(index, 'expectedResult', e.target.value)}
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
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
              {isSubmitting ? 'Creating...' : 'Create Test Case'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
