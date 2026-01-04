/**
 * Create/Edit Cycle Modal
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { TestCycle, Environment } from '../../api/types';

interface CreateCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle?: TestCycle | null;
  environments?: Environment[];
  onSubmit: (data: {
    title: string;
    description?: string;
    environment_id?: string;
    build_version?: string;
    planned_start?: string;
    planned_end?: string;
  }) => void;
  isLoading?: boolean;
}

export function CreateCycleModal({
  open,
  onOpenChange,
  cycle,
  environments = [],
  onSubmit,
  isLoading,
}: CreateCycleModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [environmentId, setEnvironmentId] = useState<string>('');
  const [buildVersion, setBuildVersion] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Populate form when editing
  useEffect(() => {
    if (cycle) {
      setTitle(cycle.title);
      setDescription(cycle.description || '');
      setEnvironmentId(cycle.environment_id || '');
      setBuildVersion(''); // Not in type, would need to add
      setStartDate(cycle.planned_start ? new Date(cycle.planned_start) : undefined);
      setEndDate(cycle.planned_end ? new Date(cycle.planned_end) : undefined);
    } else {
      setTitle('');
      setDescription('');
      setEnvironmentId('');
      setBuildVersion('');
      setStartDate(undefined);
      setEndDate(undefined);
    }
  }, [cycle, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || undefined,
      environment_id: environmentId || undefined,
      build_version: buildVersion || undefined,
      planned_start: startDate?.toISOString(),
      planned_end: endDate?.toISOString(),
    });
  };

  const isEdit = !!cycle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Test Cycle' : 'Create Test Cycle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Name *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sprint 24 Regression Testing"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Full regression suite for Sprint 24 release..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select value={environmentId} onValueChange={setEnvironmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {environments.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="build">Build Version</Label>
                <Input
                  id="build"
                  value={buildVersion}
                  onChange={(e) => setBuildVersion(e.target.value)}
                  placeholder="2.4.0-rc1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title || isLoading}>
              {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Cycle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
