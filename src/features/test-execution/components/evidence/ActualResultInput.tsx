// ============================================================
// ActualResultInput - Text area with quick templates
// ============================================================

import { useState, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { QUICK_TEMPLATES } from './templates';
import type { QuickTemplate } from '../../types/evidence';

interface ActualResultInputProps {
  value: string;
  onChange: (value: string) => void;
  expectedResult?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function ActualResultInput({
  value,
  onChange,
  expectedResult,
  disabled = false,
  placeholder = 'Enter actual result observed during testing...',
}: ActualResultInputProps) {
  const [showExpected, setShowExpected] = useState(false);

  const handleTemplateClick = useCallback((templateId: QuickTemplate) => {
    const template = QUICK_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      onChange(template.content);
    }
  }, [onChange]);

  return (
    <div className="space-y-3">
      {/* Quick Templates */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center mr-1">Quick:</span>
        {QUICK_TEMPLATES.map((template) => (
          <Button
            key={template.id}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleTemplateClick(template.id)}
            disabled={disabled}
            className={cn(
              'h-7 text-xs font-medium transition-colors',
              template.bgColor,
              template.textColor,
              'border-transparent hover:border-current'
            )}
          >
            {template.label}
          </Button>
        ))}
      </div>

      {/* Expected Result Toggle (if available) */}
      {expectedResult && (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowExpected(!showExpected)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showExpected ? 'Hide' : 'Show'} Expected Result
          </Button>
          {showExpected && (
            <div className="mt-2 p-3 rounded-md bg-muted/50 border border-dashed text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Expected:</span>
              <p className="mt-1 whitespace-pre-wrap">{expectedResult}</p>
            </div>
          )}
        </div>
      )}

      {/* Main Text Area */}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={4}
        className="resize-none"
      />

      {/* Character count */}
      <div className="text-xs text-muted-foreground text-right">
        {value.length} characters
      </div>
    </div>
  );
}
