/**
 * QuickExecuteButton — Inline quick execution for test cases
 * Allows marking a test case as passed/failed without the full dialog
 */

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type QuickResult = 'passed' | 'failed' | 'blocked' | 'skipped';

interface QuickExecuteButtonProps {
  testCaseId: string;
  testCaseTitle: string;
  onExecute?: (result: QuickResult, notes?: string) => void;
  size?: 'sm' | 'default';
  variant?: 'ghost' | 'outline' | 'default';
  className?: string;
}

export function QuickExecuteButton({
  testCaseId,
  testCaseTitle,
  onExecute,
  size = 'sm',
  variant = 'ghost',
  className,
}: QuickExecuteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedResult, setSelectedResult] = useState<QuickResult | null>(null);

  const handleSubmit = () => {
    if (!selectedResult) return;

    onExecute?.(selectedResult, notes);
    toast.success(`Test case marked as ${selectedResult}`, {
      description: testCaseTitle,
    });

    // Reset
    setNotes('');
    setSelectedResult(null);
    setIsOpen(false);
  };

  const resultOptions: { value: QuickResult; label: string; icon: React.ReactNode; color: string }[] = [
    { 
      value: 'passed', 
      label: 'Pass', 
      icon: <CheckCircle2 className="w-4 h-4" />, 
      color: 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100' 
    },
    { 
      value: 'failed', 
      label: 'Fail', 
      icon: <XCircle className="w-4 h-4" />, 
      color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' 
    },
    { 
      value: 'blocked', 
      label: 'Blocked', 
      icon: <AlertTriangle className="w-4 h-4" />, 
      color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100' 
    },
    { 
      value: 'skipped', 
      label: 'Skip', 
      icon: <SkipForward className="w-4 h-4" />, 
      color: 'text-muted-foreground bg-muted border-muted hover:bg-muted/80' 
    },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Play className="w-3.5 h-3.5" />
          {size !== 'sm' && <span className="ml-1.5">Quick Run</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-1">Quick Execution</h4>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {testCaseTitle}
            </p>
          </div>

          {/* Result Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {resultOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedResult(option.value)}
                className={cn(
                  "flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all",
                  selectedResult === option.value
                    ? cn(option.color, "ring-2 ring-offset-1 ring-primary/50")
                    : "hover:bg-muted border-border"
                )}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>

          {/* Notes */}
          <Textarea
            placeholder="Add notes (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[60px] text-sm"
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={!selectedResult}
            >
              Submit
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
