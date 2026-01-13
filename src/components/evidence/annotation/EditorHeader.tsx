// ═══════════════════════════════════════════════════════════════════════════
// ANNOTATION EDITOR HEADER
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { X, Save, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditorHeaderProps {
  fileName: string;
  annotationCount: number;
  onSave: () => void;
  onCancel: () => void;
  hasChanges: boolean;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  fileName,
  annotationCount,
  onSave,
  onCancel,
  hasChanges
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-foreground/95 border-b border-foreground/80">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-background">
          <Pencil className="w-5 h-5" />
          <span className="font-medium">Annotation Editor</span>
        </div>
        <span className="text-background/60 text-sm">{fileName}</span>
        {annotationCount > 0 && (
          <span className="text-xs bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-full">
            {annotationCount} annotation{annotationCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-background hover:bg-background/10"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={!hasChanges}
          className="bg-primary hover:bg-primary/90"
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
};
