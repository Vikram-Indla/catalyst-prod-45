import React, { useState } from 'react';
import { Plus } from 'lucide-react';
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
import { releaseOptions, environmentOptions, assigneeOptions } from '@/data/testCyclesData';

interface CreateCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCycle: (data: CreateCycleData) => void;
}

export interface CreateCycleData {
  name: string;
  releaseId: string;
  environment: 'dev' | 'beta' | 'staging' | 'uat' | 'production';
  assignee: {
    name: string;
    initials: string;
    color: string;
  };
  startDate: string;
  endDate: string;
  description: string;
}

export function CreateCycleModal({ open, onOpenChange, onCreateCycle }: CreateCycleModalProps) {
  const [name, setName] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [environment, setEnvironment] = useState('');
  const [assigneeValue, setAssigneeValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!name || !releaseId || !environment) return;
    
    const selectedAssignee = assigneeOptions.find(a => a.value === assigneeValue);
    
    onCreateCycle({
      name,
      releaseId,
      environment: environment as 'dev' | 'beta' | 'staging' | 'uat' | 'production',
      assignee: selectedAssignee ? {
        name: selectedAssignee.label,
        initials: selectedAssignee.initials,
        color: selectedAssignee.color
      } : {
        name: 'Unassigned',
        initials: 'UA',
        color: 'gray'
      },
      startDate,
      endDate,
      description
    });
    
    // Reset form
    setName('');
    setReleaseId('');
    setEnvironment('');
    setAssigneeValue('');
    setStartDate('');
    setEndDate('');
    setDescription('');
  };

  const releaseOptionsFiltered = releaseOptions.filter(r => r.value !== 'all');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Test Cycle</DialogTitle>
          <DialogDescription>
            Create a new test cycle to organize and track test execution.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Cycle Name */}
          <div>
            <label className="text-sm font-medium">Cycle Name <span className="text-red-500">*</span></label>
            <Input 
              placeholder="e.g., Smoke Testing, Regression Suite..." 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          {/* Release */}
          <div>
            <label className="text-sm font-medium">Release <span className="text-red-500">*</span></label>
            <Select value={releaseId} onValueChange={setReleaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select release" />
              </SelectTrigger>
              <SelectContent>
                {releaseOptionsFiltered.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Environment */}
          <div>
            <label className="text-sm font-medium">Environment <span className="text-red-500">*</span></label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger>
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dev">Development</SelectItem>
                <SelectItem value="beta">Beta</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="uat">UAT</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Assignee */}
          <div>
            <label className="text-sm font-medium">Assignee</label>
            <Select value={assigneeValue} onValueChange={setAssigneeValue}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {assigneeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          
          {/* Test Cases Selection */}
          <div>
            <label className="text-sm font-medium">Add Test Cases</label>
            <div className="border border-gray-200 rounded-lg p-3 mt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">0 test cases selected</span>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Test Cases
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Click "Add Test Cases" to select which tests to include in this cycle.
              </p>
            </div>
          </div>
          
          {/* Description */}
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea 
              placeholder="Optional description for this cycle..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            variant="default"
            onClick={handleSubmit}
            disabled={!name || !releaseId || !environment}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Cycle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
