/**
 * Create Issue Modal
 * Jira-style create dialog with keyboard navigation
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Separator } from '@/components/ui/separator';
import { useInJira } from '../context/InJiraContext';
import { IssueType, IssuePriority } from '../types';
import { cn } from '@/lib/utils';

// Issue type icons/labels
const ISSUE_TYPES: { value: IssueType; label: string; color: string }[] = [
  { value: 'feature', label: 'Feature', color: 'bg-purple-500' },
  { value: 'story', label: 'Story', color: 'bg-green-500' },
  { value: 'subtask', label: 'Sub-task', color: 'bg-blue-400' },
  { value: 'defect', label: 'Bug', color: 'bg-red-500' },
  { value: 'incident', label: 'Incident', color: 'bg-orange-500' },
];

// Priority options
const PRIORITIES: { value: IssuePriority; label: string; color: string }[] = [
  { value: 'highest', label: 'Highest', color: 'text-red-600' },
  { value: 'high', label: 'High', color: 'text-orange-500' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'low', label: 'Low', color: 'text-green-500' },
  { value: 'lowest', label: 'Lowest', color: 'text-blue-400' },
];

export function CreateIssueModal() {
  const { isCreateModalOpen, createModalDefaults, closeCreateModal } = useInJira();
  const summaryRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [issueType, setIssueType] = useState<IssueType>('story');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isCreateModalOpen) {
      setIssueType(createModalDefaults?.type || 'story');
      setSummary(createModalDefaults?.summary || '');
      setDescription(createModalDefaults?.description || '');
      setPriority(createModalDefaults?.priority || 'medium');
      
      // Focus summary input after a short delay
      setTimeout(() => {
        summaryRef.current?.focus();
      }, 100);
    }
  }, [isCreateModalOpen, createModalDefaults]);

  // Keyboard navigation
  useEffect(() => {
    if (!isCreateModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        closeCreateModal();
        return;
      }

      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateModalOpen, closeCreateModal, summary]);

  const handleSubmit = async () => {
    if (!summary.trim()) {
      summaryRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    
    // TODO: Implement actual creation logic
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsSubmitting(false);
    closeCreateModal();
    
    // Reset form
    setSummary('');
    setDescription('');
    setIssueType('story');
    setPriority('medium');
  };

  const selectedType = ISSUE_TYPES.find(t => t.value === issueType);
  const selectedPriority = PRIORITIES.find(p => p.value === priority);

  return (
    <Dialog open={isCreateModalOpen} onOpenChange={() => closeCreateModal()}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border-default">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Create issue</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={closeCreateModal}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Project (read-only for now) */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-text-secondary">
              Project <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 rounded-md border border-border-default">
              <span className="text-sm text-text-primary">
                {createModalDefaults?.projectKey || 'PROJ'}
              </span>
            </div>
          </div>

          {/* Issue Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-text-secondary">
              Issue type <span className="text-red-500">*</span>
            </Label>
            <Select value={issueType} onValueChange={(v) => setIssueType(v as IssueType)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-sm", selectedType?.color)} />
                    <span>{selectedType?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-sm", type.color)} />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-text-secondary">
              Summary <span className="text-red-500">*</span>
            </Label>
            <Input
              ref={summaryRef}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What needs to be done?"
              className="text-base"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-text-secondary">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-text-secondary">
              Priority
            </Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as IssuePriority)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <Flag className={cn("h-4 w-4", selectedPriority?.color)} />
                    <span>{selectedPriority?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex items-center gap-2">
                      <Flag className={cn("h-4 w-4", p.color)} />
                      <span>{p.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-default bg-surface-2 flex items-center justify-between">
          <div className="text-xs text-text-tertiary">
            <kbd className="px-1.5 py-0.5 bg-surface-3 rounded text-xs font-mono">⌘</kbd>
            {' + '}
            <kbd className="px-1.5 py-0.5 bg-surface-3 rounded text-xs font-mono">Enter</kbd>
            {' to create'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!summary.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateIssueModal;
