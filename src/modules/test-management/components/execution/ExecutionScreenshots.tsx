/**
 * Execution Screenshots Component
 * Displays pasted screenshots with remove option
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Image as ImageIcon } from 'lucide-react';

interface Screenshot {
  id: string;
  preview: string;
}

interface ExecutionScreenshotsProps {
  screenshots: Screenshot[];
  onRemove: (id: string) => void;
}

export function ExecutionScreenshots({
  screenshots,
  onRemove,
}: ExecutionScreenshotsProps) {
  if (screenshots.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <ImageIcon className="h-3 w-3" />
        <span>Ctrl+V to paste screenshots</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ImageIcon className="h-3 w-3" />
        <span>{screenshots.length} screenshot(s) attached</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {screenshots.map((screenshot) => (
          <div
            key={screenshot.id}
            className="relative group w-20 h-20 rounded-lg overflow-hidden border"
          >
            <img
              src={screenshot.preview}
              alt="Screenshot"
              className="w-full h-full object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(screenshot.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
