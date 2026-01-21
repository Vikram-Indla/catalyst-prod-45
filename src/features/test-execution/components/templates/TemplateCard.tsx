/**
 * Module 4C-1: Run Template Card
 */

import React from 'react';
import { Play, MoreHorizontal, Copy, Edit, Trash2, FileText, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { RunTemplate } from '../../types/run-assignments';
import { ENVIRONMENT_CONFIG } from '../../types/test-execution';

interface TemplateCardProps {
  template: RunTemplate;
  onCreateRun: (templateId: string) => void;
  onEdit?: (template: RunTemplate) => void;
  onDelete?: (templateId: string) => void;
}

export function TemplateCard({
  template,
  onCreateRun,
  onEdit,
  onDelete,
}: TemplateCardProps) {
  const envConfig = ENVIRONMENT_CONFIG[template.environment as keyof typeof ENVIRONMENT_CONFIG] 
    || ENVIRONMENT_CONFIG.staging;

  const hasFilter = template.test_case_filter && Object.keys(template.test_case_filter).length > 0;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <h3 className="font-medium truncate">{template.name}</h3>
            </div>

            {template.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {template.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="outline" className={cn('text-xs', envConfig.bgClass, envConfig.textClass)}>
                {envConfig.label}
              </Badge>

              {hasFilter && (
                <Badge variant="secondary" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Auto-select
                </Badge>
              )}

              {template.default_testers.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {template.default_testers.length} tester(s)
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={() => onCreateRun(template.id)}
              className="gap-1"
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onCreateRun(template.id)}>
                  <Play className="h-4 w-4 mr-2" />
                  Create Run
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(template)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Template
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(template.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
