/**
 * Quick Defect Dialog Component
 * Fast defect creation from execution context
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bug, Loader2 } from 'lucide-react';

interface QuickDefectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepAction?: string;
  expectedResult?: string;
  actualResult?: string;
  onSubmit: (data: DefectData) => Promise<void>;
}

interface DefectData {
  title: string;
  severity: string;
  priority: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
}

export function QuickDefectDialog({
  open,
  onOpenChange,
  stepAction = '',
  expectedResult = '',
  actualResult = '',
  onSubmit,
}: QuickDefectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('major');
  const [priority, setPriority] = useState('high');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title || `Defect from step: ${stepAction.slice(0, 50)}`,
        severity,
        priority,
        description,
        stepsToReproduce: stepAction,
        expectedResult,
        actualResult,
      });
      onOpenChange(false);
      // Reset form
      setTitle('');
      setDescription('');
      setSeverity('major');
      setPriority('high');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-500" />
            Log Quick Defect
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief defect summary..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="trivial">Trivial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highest">Highest</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional Notes</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any additional context..."
              rows={3}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 space-y-2 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium">Step:</span> {stepAction || 'N/A'}
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium">Expected:</span> {expectedResult || 'N/A'}
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium">Actual:</span> {actualResult || 'N/A'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bug className="h-4 w-4 mr-2" />
            )}
            Log Defect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
