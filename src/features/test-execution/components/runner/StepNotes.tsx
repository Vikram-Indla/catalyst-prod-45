/**
 * Module 3A-2: Step Notes Component
 * Inline notes input for test steps
 */
import React, { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MessageSquare, Check, X } from 'lucide-react';

interface StepNotesProps {
  stepId: string;
  initialNotes?: string;
  isOpen: boolean;
  onToggle: () => void;
  onSave: (notes: string) => Promise<void>;
  disabled?: boolean;
}

export function StepNotes({
  stepId,
  initialNotes = '',
  isOpen,
  onToggle,
  onSave,
  disabled = false,
}: StepNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes, stepId]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(notes);
      onToggle();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNotes(initialNotes);
    onToggle();
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        disabled={disabled}
        className="text-muted-foreground hover:text-foreground"
      >
        <MessageSquare className="h-4 w-4 mr-1" />
        {initialNotes ? 'Edit Notes' : 'Add Notes'}
        <span className="ml-1 text-xs opacity-60">(N)</span>
      </Button>
    );
  }

  return (
    <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Step Notes</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-7 px-2"
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-7 px-2 bg-brand-primary hover:bg-brand-primary/90"
          >
            <Check className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <Textarea
        ref={textareaRef}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes about this step..."
        className="min-h-[80px] resize-none"
        disabled={isSaving}
      />
    </div>
  );
}
