/**
 * BasicInfoTab - Tab 1: Name, Release, Dates, Status
 * GOD-TIER 9.8 Implementation
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TestPlanFormState, TestPlanFormErrors } from '../CreateEditTestPlanDialog.types';
import { CharacterCounter } from '../components/CharacterCounter';
import { useReleases } from '@/hooks/useWorkItemVersions';

interface BasicInfoTabProps {
  formState: TestPlanFormState;
  errors: TestPlanFormErrors;
  setField: <K extends keyof TestPlanFormState>(field: K, value: TestPlanFormState[K]) => void;
  setFields: (updates: Partial<TestPlanFormState>) => void;
  validateField: (field: keyof TestPlanFormState) => boolean;
  isFieldValid: (field: keyof TestPlanFormState) => boolean;
  projectId?: string;
}

export function BasicInfoTab({
  formState,
  errors,
  setField,
  setFields,
  validateField,
  isFieldValid,
  projectId,
}: BasicInfoTabProps) {
  const { data: releases = [] } = useReleases();
  const [autoFillMessage, setAutoFillMessage] = React.useState<string | null>(null);

  const handleReleaseChange = (releaseId: string) => {
    const release = releases.find(r => r.id === releaseId);
    if (release) {
      const updates: Partial<TestPlanFormState> = { release_id: releaseId };
      
      // Auto-fill dates from release
      if (release.target_date) {
        updates.end_date = new Date(release.target_date);
        setAutoFillMessage('Dates auto-filled from release');
        setTimeout(() => setAutoFillMessage(null), 3000);
      }
      
      setFields(updates);
    } else {
      setField('release_id', releaseId);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Plan Name */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="name" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Plan Name *
          </Label>
          <CharacterCounter current={formState.name.length} max={100} />
        </div>
        <div className="relative">
          <Input
            id="name"
            placeholder="e.g., Release 2.0 Regression Test Plan"
            value={formState.name}
            onChange={(e) => setField('name', e.target.value)}
            onBlur={() => validateField('name')}
            className={cn(
              'pr-10 transition-all',
              errors.name && 'border-destructive focus-visible:ring-destructive animate-shake',
              isFieldValid('name') && 'border-success'
            )}
          />
          {isFieldValid('name') && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />
          )}
        </div>
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </Label>
          <CharacterCounter current={formState.description.length} max={500} />
        </div>
        <Textarea
          id="description"
          placeholder="Brief description of what this test plan covers..."
          value={formState.description}
          onChange={(e) => setField('description', e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Release & Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Release
          </Label>
          <Select value={formState.release_id || ''} onValueChange={handleReleaseChange}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select release..." />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {releases.map((release) => (
                <SelectItem key={release.id} value={release.id}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{release.name}</span>
                    {release.target_date && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(release.target_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {autoFillMessage && (
            <p className="text-xs text-success flex items-center gap-1">
              <Info className="w-3 h-3" />
              {autoFillMessage}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </Label>
          <Select value={formState.status} onValueChange={(v) => setField('status', v as any)}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Start Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formState.start_date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formState.start_date ? format(formState.start_date, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background" align="start">
              <Calendar
                mode="single"
                selected={formState.start_date || undefined}
                onSelect={(date) => setField('start_date', date || null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            End Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formState.end_date && 'text-muted-foreground',
                  errors.end_date && 'border-destructive'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formState.end_date ? format(formState.end_date, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background" align="start">
              <Calendar
                mode="single"
                selected={formState.end_date || undefined}
                onSelect={(date) => setField('end_date', date || null)}
                disabled={(date) => formState.start_date ? date < formState.start_date : false}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.end_date && (
            <p className="text-xs text-destructive">{errors.end_date}</p>
          )}
        </div>
      </div>

      {/* Objectives */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="objectives" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Objectives
          </Label>
          <CharacterCounter current={formState.objectives.length} max={1000} />
        </div>
        <Textarea
          id="objectives"
          placeholder="What are the main testing objectives for this plan?"
          value={formState.objectives}
          onChange={(e) => setField('objectives', e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>
    </div>
  );
}
