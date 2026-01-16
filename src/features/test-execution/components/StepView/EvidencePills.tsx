/**
 * EvidencePills - Display attached evidence with remove option
 */

import { Camera, Paperclip, X } from 'lucide-react';
import type { Evidence } from '../../stores/executionStore';

interface EvidencePillsProps {
  evidence: Evidence[];
  onRemove: (id: string) => void;
}

export function EvidencePills({ evidence, onRemove }: EvidencePillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {evidence.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm"
        >
          {item.type === 'screenshot' ? (
            <Camera className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className="text-foreground max-w-[150px] truncate">{item.name}</span>
          <button
            onClick={() => onRemove(item.id)}
            className="p-0.5 rounded-full hover:bg-background transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      ))}
    </div>
  );
}
