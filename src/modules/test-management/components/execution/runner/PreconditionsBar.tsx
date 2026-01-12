/**
 * Preconditions Bar - Displays and verifies test preconditions with checkable items
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Shield, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PreconditionsBarProps {
  preconditions: string;
  verified: boolean;
  onVerify: () => void;
}

export function PreconditionsBar({ preconditions, verified, onVerify }: PreconditionsBarProps) {
  // Parse preconditions - split by common delimiters
  const items = preconditions
    .split(/[•\n,;]/)
    .map(s => s.trim())
    .filter(Boolean);
  
  const hasMultipleItems = items.length > 1;
  
  // Track which items are checked
  const [checkedItems, setCheckedItems] = useState<boolean[]>([]);
  const [isExpanded, setIsExpanded] = useState(!verified && hasMultipleItems);
  
  // Initialize checked items
  useEffect(() => {
    if (verified) {
      setCheckedItems(items.map(() => true));
    } else {
      setCheckedItems(items.map(() => false));
    }
  }, [preconditions, verified]);
  
  const allChecked = checkedItems.length > 0 && checkedItems.every(Boolean);
  const someChecked = checkedItems.some(Boolean) && !allChecked;
  const checkedCount = checkedItems.filter(Boolean).length;
  
  const handleItemToggle = (index: number) => {
    if (verified) return;
    
    const newChecked = [...checkedItems];
    newChecked[index] = !newChecked[index];
    setCheckedItems(newChecked);
  };
  
  const handleVerify = () => {
    // Mark all as checked and verify
    setCheckedItems(items.map(() => true));
    onVerify();
    setIsExpanded(false);
  };
  
  // Simple display for single item
  if (!hasMultipleItems) {
    return (
      <div className="flex items-center gap-3 px-3.5 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
        <Shield className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
          Preconditions
        </span>
        <span className="text-xs text-muted-foreground flex-1">
          {preconditions}
        </span>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 px-2.5 text-[11px] font-medium gap-1 transition-colors",
            verified
              ? "bg-teal-100 border-teal-300 text-teal-700 hover:bg-teal-200"
              : "bg-background border-primary/20 text-primary hover:bg-primary/10"
          )}
          onClick={onVerify}
          disabled={verified}
        >
          <Check className="h-3 w-3" />
          {verified ? 'Verified' : 'Verify'}
        </Button>
      </div>
    );
  }
  
  // Expandable display for multiple items
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn(
        "rounded-xl border transition-colors",
        verified 
          ? "bg-teal-50/50 border-teal-200 dark:bg-teal-950/20 dark:border-teal-800"
          : "bg-primary/5 border-primary/20"
      )}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-primary/5 transition-colors rounded-t-xl">
            <Shield className={cn(
              "h-4 w-4 flex-shrink-0",
              verified ? "text-teal-600" : "text-primary"
            )} />
            <span className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              verified ? "text-teal-700" : "text-primary"
            )}>
              Preconditions
            </span>
            
            {/* Progress indicator */}
            <div className="flex items-center gap-2 flex-1">
              <div className="h-1.5 flex-1 bg-muted rounded-full max-w-32 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    verified || allChecked ? "bg-teal-500" : someChecked ? "bg-primary" : "bg-transparent"
                  )}
                  style={{ width: `${(checkedCount / items.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {checkedCount}/{items.length}
              </span>
            </div>
            
            {/* Verify button */}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-7 px-2.5 text-[11px] font-medium gap-1 transition-colors",
                verified
                  ? "bg-teal-100 border-teal-300 text-teal-700"
                  : allChecked
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-background border-primary/20 text-primary hover:bg-primary/10"
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleVerify();
              }}
              disabled={verified}
            >
              <Check className="h-3 w-3" />
              {verified ? 'Verified' : 'Verify All'}
            </Button>
            
            {/* Expand/Collapse */}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>
        
        {/* Checklist */}
        <CollapsibleContent>
          <div className="px-3.5 pb-3 pt-1 space-y-2 border-t border-primary/10">
            {items.map((item, index) => (
              <label 
                key={index}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                  checkedItems[index] 
                    ? "bg-teal-50 dark:bg-teal-950/30" 
                    : "hover:bg-muted/50",
                  verified && "cursor-default"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox 
                  checked={checkedItems[index] || false}
                  onCheckedChange={() => handleItemToggle(index)}
                  disabled={verified}
                  className={cn(
                    "mt-0.5",
                    checkedItems[index] && "border-teal-500 bg-teal-500 text-white"
                  )}
                />
                <span className={cn(
                  "text-sm flex-1",
                  checkedItems[index] 
                    ? "text-teal-700 dark:text-teal-400" 
                    : "text-foreground"
                )}>
                  {item}
                </span>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
