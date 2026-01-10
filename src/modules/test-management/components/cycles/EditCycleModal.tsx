/**
 * Edit Cycle Modal
 * For editing existing test cycles
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
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

interface EditCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle: TestCycle;
  environments?: Environment[];
  onSubmit: (data: {
    id: string;
    title: string;
    description?: string;
    environment_id?: string;
    build_version?: string;
    planned_start?: string;
    planned_end?: string;
  }) => void;
  isLoading?: boolean;
}

export function EditCycleModal({
  open,
  onOpenChange,
  cycle,
  environments = [],
  onSubmit,
  isLoading,
}: EditCycleModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [environmentId, setEnvironmentId] = useState<string>('');
  const [buildVersion, setBuildVersion] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Populate form when cycle changes
  useEffect(() => {
    if (cycle && open) {
      setTitle(cycle.title);
      setDescription(cycle.description || '');
      setEnvironmentId(cycle.environment_id || '');
      setBuildVersion('');
      setStartDate(cycle.planned_start ? new Date(cycle.planned_start) : undefined);
      setEndDate(cycle.planned_end ? new Date(cycle.planned_end) : undefined);
    }
  }, [cycle, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: cycle.id,
      title,
      description: description || undefined,
      environment_id: environmentId || undefined,
      build_version: buildVersion || undefined,
      planned_start: startDate?.toISOString(),
      planned_end: endDate?.toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Test Cycle</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Cycle Name *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sprint 23 Regression"
                required
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the cycle scope and objectives..."
                rows={3}
              />
            </div>

            {/* Environment */}
            <div className="grid gap-2">
              <Label htmlFor="edit-environment">Environment</Label>
              <Select value={environmentId} onValueChange={setEnvironmentId}>
                <SelectTrigger id="edit-environment">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {environments.map((env) => (
                    <SelectItem key={env.id} value={env.id}>
                      {env.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Build Version */}
            <div className="grid gap-2">
              <Label htmlFor="edit-build">Build Version</Label>
              <Input
                id="edit-build"
                value={buildVersion}
                onChange={(e) => setBuildVersion(e.target.value)}
                placeholder="v2.4.1"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'MMM d, yyyy') : 'Select date'}
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

              <div className="grid gap-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => startDate ? date < startDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditCycleModal;
