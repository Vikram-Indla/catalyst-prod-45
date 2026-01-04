/**
 * Template Preview Modal
 * Preview template details before using
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Clock,
  User,
  Tag,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import type { TestCase } from '../../api/types';

interface TemplatePreviewModalProps {
  template: TestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: () => void;
}

export function TemplatePreviewModal({
  template,
  open,
  onOpenChange,
  onUseTemplate,
}: TemplatePreviewModalProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Template Preview
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Header Info */}
            <div>
              <h3 className="text-lg font-semibold mb-2">{template.title}</h3>
              <p className="text-sm text-muted-foreground">
                {template.description || 'No description provided'}
              </p>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Est. {template.estimated_time_minutes || 15} min</span>
              </div>
              {template.owner_name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{template.owner_name}</span>
                </div>
              )}
              {template.priority && (
                <Badge variant="secondary" style={{ backgroundColor: template.priority.color }}>
                  {template.priority.name}
                </Badge>
              )}
            </div>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1 flex-wrap">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Preconditions */}
            {template.preconditions && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Preconditions</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {template.preconditions}
                  </p>
                </div>
              </>
            )}

            {/* Steps Preview */}
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">
                Test Steps ({template.steps?.length || 0})
              </h4>
              <div className="space-y-3">
                {template.steps?.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex gap-3 p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Action</span>
                        <p className="text-sm">{step.action}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Expected Result</span>
                        <p className="text-sm">{step.expected_result}</p>
                      </div>
                      {step.test_data && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Test Data</span>
                          <p className="text-sm font-mono bg-background p-2 rounded">
                            {step.test_data}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Variables Notice */}
            {template.steps?.some(
              (step) =>
                step.action.includes('{{') ||
                step.expected_result.includes('{{') ||
                step.test_data?.includes('{{')
            ) && (
              <>
                <Separator />
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      This template contains variables
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      You'll be prompted to fill in variable values when creating a test case from this template.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onUseTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            Use This Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
