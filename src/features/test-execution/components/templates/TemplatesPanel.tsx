/**
 * Module 4C-1: Run Templates Panel
 */

import React, { useState } from 'react';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateCard } from './TemplateCard';
import { CreateTemplateDialog } from './CreateTemplateDialog';
import { useRunTemplates, useDeleteTemplate, useCreateRunFromTemplate } from '../../hooks/useRunTemplates';

interface TemplatesPanelProps {
  projectId: string;
  onRunCreated?: (runId: string) => void;
}

export function TemplatesPanel({ projectId, onRunCreated }: TemplatesPanelProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: templates = [], isLoading } = useRunTemplates(projectId);
  const deleteTemplate = useDeleteTemplate();
  const createRunFromTemplate = useCreateRunFromTemplate();

  const handleCreateRun = async (templateId: string) => {
    try {
      const result = await createRunFromTemplate.mutateAsync({ templateId });
      if (result?.run_id) {
        onRunCreated?.(result.run_id);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (templateId: string) => {
    await deleteTemplate.mutateAsync({ templateId, projectId });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Run Templates
          </CardTitle>
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/20">
            <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-foreground">No Templates Yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create templates to quickly start new test runs with predefined settings
            </p>
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Template
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onCreateRun={handleCreateRun}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>

      <CreateTemplateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        projectId={projectId}
      />
    </Card>
  );
}
