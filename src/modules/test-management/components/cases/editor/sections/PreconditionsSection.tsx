/**
 * Preconditions Section Component
 * List of numbered preconditions with add/remove functionality
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Precondition {
  id: string;
  text: string;
  details?: string;
}

interface PreconditionsSectionProps {
  preconditions: Precondition[];
  onChange: (preconditions: Precondition[]) => void;
  className?: string;
}

function generateId() {
  return `pre-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function PreconditionsSection({ preconditions, onChange, className }: PreconditionsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAdd = () => {
    onChange([...preconditions, { id: generateId(), text: '', details: '' }]);
  };

  const handleUpdate = (id: string, field: 'text' | 'details', value: string) => {
    onChange(preconditions.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleDelete = (id: string) => {
    onChange(preconditions.filter(p => p.id !== id));
  };

  return (
    <div
      className={cn(
        'bg-background rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-200',
        'hover:shadow-md focus-within:border-primary/30 focus-within:shadow-md focus-within:shadow-primary/5',
        className
      )}
    >
      {/* Section Header */}
      <div
        className="flex items-center justify-between px-5 py-3 bg-gradient-to-b from-muted/50 to-muted/80 border-b border-border cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Preconditions
          </h2>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold bg-primary/10 text-primary">
            {preconditions.length}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            + Add
          </button>
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Section Body */}
      {isExpanded && (
        <div className="p-5 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-2.5">
            {preconditions.map((precondition, index) => (
              <div
                key={precondition.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg',
                  'bg-muted/50 border border-border',
                  'hover:bg-background hover:border-border hover:shadow-sm',
                  'transition-all duration-150'
                )}
              >
                {/* Number badge */}
                <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full text-[11px] font-bold shadow-sm shrink-0">
                  {index + 1}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <Input
                    value={precondition.text}
                    onChange={(e) => handleUpdate(precondition.id, 'text', e.target.value)}
                    placeholder="Enter precondition..."
                    className="border-none bg-transparent p-0 h-auto text-sm focus-visible:ring-0"
                  />
                  {precondition.details && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {precondition.details}
                    </p>
                  )}
                </div>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => handleDelete(precondition.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add button */}
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 mt-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add precondition
          </button>
        </div>
      )}
    </div>
  );
}
