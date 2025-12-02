/**
 * CATALYST TESTS - Cycle Details Tab
 * Name, Objective, Dates, Environment, Template selection
 */

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CycleTemplate } from '@/types/cycleManagement';
import { ENVIRONMENT_OPTIONS } from '@/types/cycleManagement';
import { FileText, Calendar, Server, LayoutTemplate } from 'lucide-react';

interface CycleDetailsTabProps {
  form: UseFormReturn<any>;
  templates: CycleTemplate[];
  onTemplateSelect: (templateId: string) => void;
}

export function CycleDetailsTab({ form, templates, onTemplateSelect }: CycleDetailsTabProps) {
  const { register, watch, setValue, formState: { errors } } = form;

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      {templates.length > 0 && (
        <Card className="border-border">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4 text-brand-gold" />
              Quick Start from Template
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onTemplateSelect(template.id)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    watch('template_id') === template.id
                      ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                      : 'border-border hover:border-brand-gold/50'
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Details */}
      <div className="grid gap-4">
        <div>
          <Label htmlFor="name" className="text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Cycle Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="e.g., Sprint 1 Regression Tests"
            className="mt-1.5"
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="objective" className="text-foreground">Objective</Label>
          <Textarea
            id="objective"
            {...register('objective')}
            placeholder="What is the goal of this test cycle?"
            className="mt-1.5 min-h-[80px]"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date" className="text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Start Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="start_date"
            type="date"
            {...register('start_date')}
            className="mt-1.5"
          />
          {errors.start_date && (
            <p className="text-sm text-destructive mt-1">{errors.start_date.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="end_date" className="text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            End Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="end_date"
            type="date"
            {...register('end_date')}
            className="mt-1.5"
          />
          {errors.end_date && (
            <p className="text-sm text-destructive mt-1">{errors.end_date.message as string}</p>
          )}
        </div>
      </div>

      {/* Environment & Build */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="environment" className="text-foreground flex items-center gap-2">
            <Server className="h-4 w-4" />
            Environment
          </Label>
          <Select
            value={watch('environment')}
            onValueChange={(value) => setValue('environment', value)}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              {ENVIRONMENT_OPTIONS.map((env) => (
                <SelectItem key={env.value} value={env.value}>
                  {env.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="build_version" className="text-foreground">Build Version</Label>
          <Input
            id="build_version"
            {...register('build_version')}
            placeholder="e.g., v2.1.0"
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}
