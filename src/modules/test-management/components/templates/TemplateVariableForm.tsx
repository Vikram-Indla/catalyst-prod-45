/**
 * Template Variable Form
 * Input form for template variables
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Variable, FileText } from 'lucide-react';
import type { TestCase } from '../../api/types';

interface TemplateVariableFormProps {
  template: TestCase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (variables: Record<string, string>) => void;
  isLoading?: boolean;
}

interface ExtractedVariable {
  name: string;
  displayName: string;
  usedIn: string[];
}

export function TemplateVariableForm({
  template,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: TemplateVariableFormProps) {
  // Extract variables from template steps
  const variables = useMemo<ExtractedVariable[]>(() => {
    const variableMap = new Map<string, Set<string>>();
    const regex = /\{\{(\w+)\}\}/g;

    template.steps?.forEach((step, index) => {
      const stepLabel = `Step ${index + 1}`;
      
      // Check action
      let match;
      while ((match = regex.exec(step.action)) !== null) {
        const varName = match[1];
        if (!variableMap.has(varName)) {
          variableMap.set(varName, new Set());
        }
        variableMap.get(varName)!.add(`${stepLabel} - Action`);
      }

      // Check expected result
      regex.lastIndex = 0;
      while ((match = regex.exec(step.expected_result)) !== null) {
        const varName = match[1];
        if (!variableMap.has(varName)) {
          variableMap.set(varName, new Set());
        }
        variableMap.get(varName)!.add(`${stepLabel} - Expected`);
      }

      // Check test data
      if (step.test_data) {
        regex.lastIndex = 0;
        while ((match = regex.exec(step.test_data)) !== null) {
          const varName = match[1];
          if (!variableMap.has(varName)) {
            variableMap.set(varName, new Set());
          }
          variableMap.get(varName)!.add(`${stepLabel} - Test Data`);
        }
      }
    });

    return Array.from(variableMap.entries()).map(([name, usedIn]) => ({
      name,
      displayName: name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      usedIn: Array.from(usedIn),
    }));
  }, [template.steps]);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    variables.forEach((v) => {
      initial[v.name] = '';
    });
    return initial;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const allFilled = variables.every((v) => values[v.name]?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Variable className="h-5 w-5" />
            Fill Template Variables
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{template.title}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {variables.length} variable(s) to fill
            </p>
          </div>

          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-4">
              {variables.map((variable) => (
                <div key={variable.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={variable.name} className="text-sm font-medium">
                      {variable.displayName}
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {`{{${variable.name}}}`}
                    </Badge>
                  </div>
                  <Input
                    id={variable.name}
                    value={values[variable.name]}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [variable.name]: e.target.value,
                      }))
                    }
                    placeholder={`Enter ${variable.displayName.toLowerCase()}...`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in: {variable.usedIn.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!allFilled || isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Create Test Case
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
