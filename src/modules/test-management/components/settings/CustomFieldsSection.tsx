/**
 * Custom Fields Section
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreHorizontal,
  GripVertical,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Link,
  Mail,
  User,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomFieldDefinition, FieldType, FieldEntity } from '../../types/settings';

interface CustomFieldsSectionProps {
  fields: CustomFieldDefinition[];
  onCreateField: () => void;
  onEditField: (field: CustomFieldDefinition) => void;
  onDeleteField: (fieldId: string) => void;
  isLoading?: boolean;
}

const fieldTypeIcons: Record<FieldType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  textarea: <Type className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  datetime: <Calendar className="h-4 w-4" />,
  select: <List className="h-4 w-4" />,
  multi_select: <List className="h-4 w-4" />,
  checkbox: <CheckSquare className="h-4 w-4" />,
  url: <Link className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
};

const entityLabels: Record<FieldEntity, string> = {
  test_case: 'Test Case',
  test_cycle: 'Test Cycle',
  defect: 'Defect',
  test_run: 'Test Run',
};

export function CustomFieldsSection({
  fields,
  onCreateField,
  onEditField,
  onDeleteField,
  isLoading,
}: CustomFieldsSectionProps) {
  const groupedFields = fields.reduce((acc, field) => {
    const entity = field.entity_type;
    if (!acc[entity]) acc[entity] = [];
    acc[entity].push(field);
    return acc;
  }, {} as Record<FieldEntity, CustomFieldDefinition[]>);

  return (
    <div className="space-y-6">
      <section className="bg-background border border-border rounded-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Custom Fields</h2>
            <p className="text-sm text-muted-foreground">
              Add custom fields to capture additional data
            </p>
          </div>
          <Button onClick={onCreateField} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Field
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {Object.entries(groupedFields).length === 0 ? (
            <div className="text-center py-12">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Type className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">No custom fields</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create custom fields to capture additional information
              </p>
              <Button onClick={onCreateField} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add First Field
              </Button>
            </div>
          ) : (
            Object.entries(groupedFields).map(([entity, entityFields]) => (
              <div key={entity}>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {entityLabels[entity as FieldEntity]} Fields
                </h3>
                <div className="space-y-2">
                  {entityFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-4 p-4 bg-muted/30 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="text-muted-foreground cursor-grab">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                        {fieldTypeIcons[field.field_type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{field.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="capitalize">{field.field_type.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{field.field_key}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize text-xs">
                        {field.field_type.replace('_', ' ')}
                      </Badge>
                      {field.is_required && (
                        <div className="flex items-center gap-1 text-amber-600 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          Required
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditField(field)}>
                            Edit Field
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDeleteField(field.id)}
                          >
                            Delete Field
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
