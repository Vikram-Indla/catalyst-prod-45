/**
 * Template Card Component
 * Displays a single template with preview and actions
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Globe,
  Folder,
  ListChecks,
} from 'lucide-react';
import type { TestCaseTemplate } from '../../types/template';

interface TemplateCardProps {
  template: TestCaseTemplate;
  onSelect?: (template: TestCaseTemplate) => void;
  onEdit?: (template: TestCaseTemplate) => void;
  onDelete?: (template: TestCaseTemplate) => void;
  onDuplicate?: (template: TestCaseTemplate) => void;
  selectable?: boolean;
}

export function TemplateCard({
  template,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  selectable = false,
}: TemplateCardProps) {
  const stepCount = template.template_data.steps?.length || 0;
  const priority = template.template_data.priority;
  const testType = template.template_data.test_type;

  const priorityColors: Record<string, string> = {
    critical: 'bg-destructive/10 text-destructive',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-muted text-muted-foreground',
  };

  return (
    <Card
      className={`group transition-all ${
        selectable ? 'cursor-pointer hover:border-primary hover:shadow-md' : ''
      }`}
      onClick={selectable && onSelect ? () => onSelect(template) : undefined}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <h4 className="font-medium text-sm truncate">{template.name}</h4>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {template.is_global && (
              <span title="Global template">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            )}

            {(onEdit || onDelete || onDuplicate) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(template)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={() => onDuplicate(template)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(template)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {template.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {template.category && (
            <Badge variant="outline" className="text-xs">
              <Folder className="h-3 w-3 mr-1" />
              {template.category.name}
            </Badge>
          )}

          {priority && (
            <Badge className={`text-xs ${priorityColors[priority] || ''}`}>
              {priority}
            </Badge>
          )}

          {testType && (
            <Badge variant="secondary" className="text-xs">
              {testType}
            </Badge>
          )}

          {stepCount > 0 && (
            <Badge variant="outline" className="text-xs">
              <ListChecks className="h-3 w-3 mr-1" />
              {stepCount} step{stepCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {selectable && (
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-2"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(template);
            }}
          >
            Use Template
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
