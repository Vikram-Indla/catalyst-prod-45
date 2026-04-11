/**
 * CreateCycleModalEnhanced - Create cycle modal with real data
 * Uses releases from DB, profiles for assignees, environments from th_environments
 */

import React, { useState, useEffect } from 'react';
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
import { supabase, typedQuery } from '@/integrations/supabase/client';

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
  environment_id?: string;
  assigned_to?: string;
  planned_start?: string;
  planned_end?: string;
}

interface EnvironmentOption {
  id: string;
  name: string;
  type: string;
  health_status: string;
}

export function CreateCycleModalEnhanced({ 
  open, 
  onOpenChange, 
  onCreateCycle,
  isCreating 
}: CreateCycleModalEnhancedProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [environment, setEnvironment] = useState('');
  const [environmentId, setEnvironmentId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [environments, setEnvironments] = useState<EnvironmentOption[]>([]);

  // Fetch releases and team members
  const { data: releases, isLoading: releasesLoading } = useReleases();
  const { data: teamMembers, isLoading: membersLoading } = useTeamMembers(null);

  useEffect(() => {
    if (open) {
      typedQuery('th_environments').select('id, name, type, health_status').eq('status', 'active').order('name').then(({ data }: any) => {
        if (data) setEnvironments(data);
      });
    }
  }, [open]);

  const handleSubmit = () => {
    if (!name.trim() || !environment) return;
    
    onCreateCycle({
      name: name.trim(),
      description: description.trim() || undefined,
      release_id: releaseId && releaseId !== 'none' ? releaseId : undefined,
      environment: environment || 'staging',
      environment_id: environmentId && environmentId !== 'none' ? environmentId : undefined,
      assigned_to: assignedTo && assignedTo !== 'none' ? assignedTo : undefined,
      planned_start: startDate || undefined,
      planned_end: endDate || undefined,
    });
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setReleaseId('');
    setEnvironment('');
    setEnvironmentId('');
    setAssignedTo('');
    setStartDate('');
    setEndDate('');
    onOpenChange(false);
  };

  const isValid = name.trim().length > 0;

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
                <SelectItem value="none">No release</SelectItem>
                {releases?.filter(r => r.id).map(release => (
                  <SelectItem key={release.id} value={release.id}>
                    {release.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Environment */}
          <div>
            <label className="text-sm font-medium text-foreground">
              Environment
            </label>
            <Select value={environmentId} onValueChange={(val) => {
              setEnvironmentId(val);
              const env = environments.find(e => e.id === val);
              setEnvironment(env?.type || '');
            }}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={environments.length === 0 ? 'Loading...' : 'Select environment'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No environment</SelectItem>
                {environments.map(env => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name} ({env.type}) {env.health_status === 'healthy' ? '🟢' : env.health_status === 'degraded' ? '🟡' : env.health_status === 'down' ? '🔴' : '⚪'}
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
                <SelectItem value="none">Unassigned</SelectItem>
                {teamMembers?.filter(m => m.id).map(member => (
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
