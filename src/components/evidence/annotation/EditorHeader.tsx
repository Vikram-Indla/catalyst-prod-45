// ═══════════════════════════════════════════════════════════════════════════
// ANNOTATION EDITOR HEADER
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ArrowLeft, Save, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface EditorHeaderProps {
  fileName: string;
  annotationCount: number;
  lastSaved?: string;
  onSave: () => void;
  onCancel: () => void;
  hasChanges: boolean;
  saving: boolean;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  fileName,
  annotationCount,
  lastSaved,
  onSave,
  onCancel,
  hasChanges,
  saving
}) => {
  const formatLastSaved = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-foreground/95 border-b border-foreground/80">
      <div className="flex items-center gap-4">
        <button 
          onClick={onCancel} 
          className="p-1 hover:bg-background/10 rounded text-background/60 hover:text-background"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-background">
            <Pencil className="w-4 h-4" />
            <span className="font-medium">{fileName}</span>
          </div>
          <p className="text-xs text-background/60">
            {annotationCount} annotation{annotationCount !== 1 ? 's' : ''}
            {lastSaved && ` • Last saved ${formatLastSaved(lastSaved)}`}
            {hasChanges && <span className="text-warning"> • Unsaved changes</span>}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-background/80 hover:text-background hover:bg-background/10"
        >
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={saving || !hasChanges}
          className="bg-primary hover:bg-primary/90"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
};
