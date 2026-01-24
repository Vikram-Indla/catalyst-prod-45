/**
 * CreateCycleModalEnhanced - Create cycle modal with real data
 * Uses releases from DB, profiles for assignees
 */

import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReleases } from '@/hooks/test-management/useReleases';
import { useTeamMembers } from '@/hooks/test-management';

interface CreateCycleModalEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCycle: (data: CreateCycleFormData) => void;
  isCreating?: boolean;
}

export interface CreateCycleFormData {
  name: string;
  description?: string;
  release_id?: string;
  environment: string;
  assigned_to?: string;
  planned_start?: string;
  planned_end?: string;
}

const ENVIRONMENT_OPTIONS = [
  { value: 'dev', label: 'Development' },
  { value: 'qa', label: 'QA' },
  { value: 'staging', label: 'Staging' },
  { value: 'uat', label: 'UAT' },
  { value: 'prod', label: 'Production' },
];

export function CreateCycleModalEnhanced({ 
  open, 
  onOpenChange, 
  onCreateCycle,
  isCreating 
}: CreateCycleModalEnhancedProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [environment, setEnvironment] = useState('staging');
  const [assignedTo, setAssignedTo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch releases and team members
  const { data: releases, isLoading: releasesLoading } = useReleases();
  // Use null for projectId since we want all QA testers across the system
  const { data: teamMembers, isLoading: membersLoading } = useTeamMembers(null);

  const handleSubmit = () => {
    if (!name.trim() || !environment) return;
    
    onCreateCycle({
      name: name.trim(),
      description: description.trim() || undefined,
      release_id: releaseId || undefined,
      environment,
      assigned_to: assignedTo || undefined,
      planned_start: startDate || undefined,
      planned_end: endDate || undefined,
    });
  };

  const handleClose = () => {
    // Reset form
    setName('');
    setDescription('');
    setReleaseId('');
    setEnvironment('staging');
    setAssignedTo('');
    setStartDate('');
    setEndDate('');
    onOpenChange(false);
  };

  const isValid = name.trim().length > 0 && environment;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Test Cycle</DialogTitle>
          <DialogDescription>
            Create a new test cycle to organize and track test execution.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Cycle Name */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Cycle Name <span className="text-red-500">*</span>
            </label>
            <Input 
              placeholder="e.g., Regression Cycle - v2.4 Release" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          
          {/* Release */}
          <div>
            <label className="text-sm font-medium text-gray-700">Release</label>
            <Select value={releaseId} onValueChange={setReleaseId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={releasesLoading ? 'Loading...' : 'Select release'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No release</SelectItem>
                {releases?.map(release => (
                  <SelectItem key={release.id} value={release.id}>
                    {release.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Environment */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Environment <span className="text-red-500">*</span>
            </label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                {ENVIRONMENT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Assignee */}
          <div>
            <label className="text-sm font-medium text-foreground">Assignee</label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={membersLoading ? 'Loading...' : 'Select assignee'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {teamMembers?.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <Input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">End Date</label>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          
          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <Textarea 
              placeholder="Optional description for this cycle..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button 
            variant="default"
            onClick={handleSubmit}
            disabled={!isValid || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Cycle
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
