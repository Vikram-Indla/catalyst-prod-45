import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { releaseOptions, environmentOptions, assigneeOptions } from '@/data/testCyclesData';

interface CreateCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCycle: (data: CreateCycleData) => void;
}

export interface CreateCycleData {
  name: string;
  releaseId: string;
  environment: 'dev' | 'qa' | 'beta' | 'staging' | 'uat' | 'production';
  assignee: {
    name: string;
    initials: string;
    color: string;
  };
  startDate: string;
  endDate: string;
  description: string;
  testCaseIds?: string[];
}

// Mock test cases for selection
const mockTestCases = [
  { id: 'tc-1', title: 'Login with valid credentials', priority: 'High', module: 'Authentication' },
  { id: 'tc-2', title: 'Password reset flow', priority: 'High', module: 'Authentication' },
  { id: 'tc-3', title: 'User registration', priority: 'Medium', module: 'Authentication' },
  { id: 'tc-4', title: 'Dashboard data loading', priority: 'High', module: 'Dashboard' },
  { id: 'tc-5', title: 'Filter functionality', priority: 'Medium', module: 'Dashboard' },
  { id: 'tc-6', title: 'Export to CSV', priority: 'Low', module: 'Reports' },
  { id: 'tc-7', title: 'Generate PDF report', priority: 'Medium', module: 'Reports' },
  { id: 'tc-8', title: 'Search functionality', priority: 'High', module: 'Core' },
];

export function CreateCycleModal({ open, onOpenChange, onCreateCycle }: CreateCycleModalProps) {
  const [name, setName] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [environment, setEnvironment] = useState('');
  const [assigneeValue, setAssigneeValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  const [showTestCasePicker, setShowTestCasePicker] = useState(false);

  const toggleTestCase = (id: string) => {
    setSelectedTestCases(prev => 
      prev.includes(id) ? prev.filter(tc => tc !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!name || !releaseId || !environment) return;
    
    const selectedAssignee = assigneeOptions.find(a => a.value === assigneeValue);
    
    onCreateCycle({
      name,
      releaseId,
      environment: environment as 'dev' | 'qa' | 'beta' | 'staging' | 'uat' | 'production',
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
      description,
      testCaseIds: selectedTestCases
    });
    
    // Reset form
    setName('');
    setReleaseId('');
    setEnvironment('');
    setAssigneeValue('');
    setStartDate('');
    setEndDate('');
    setDescription('');
    setSelectedTestCases([]);
    setShowTestCasePicker(false);
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
                <SelectItem value="qa">QA</SelectItem>
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
            <div className="border border-border rounded-lg p-3 mt-1">
              {!showTestCasePicker ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedTestCases.length} test case{selectedTestCases.length !== 1 ? 's' : ''} selected
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setShowTestCasePicker(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Test Cases
                    </Button>
                  </div>
                  {selectedTestCases.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Click "Add Test Cases" to select which tests to include in this cycle.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedTestCases.slice(0, 3).map(id => {
                        const tc = mockTestCases.find(t => t.id === id);
                        return tc ? (
                          <span key={id} className="text-xs bg-muted px-2 py-1 rounded">
                            {tc.title.slice(0, 20)}...
                          </span>
                        ) : null;
                      })}
                      {selectedTestCases.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{selectedTestCases.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Select test cases</span>
                    <Button variant="ghost" size="sm" onClick={() => setShowTestCasePicker(false)}>
                      <Check className="w-4 h-4 mr-1" />
                      Done
                    </Button>
                  </div>
                  <ScrollArea className="h-40">
                    <div className="space-y-1">
                      {mockTestCases.map(tc => (
                        <div
                          key={tc.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                          onClick={() => toggleTestCase(tc.id)}
                        >
                          <Checkbox 
                            checked={selectedTestCases.includes(tc.id)} 
                            onCheckedChange={() => toggleTestCase(tc.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{tc.title}</p>
                            <p className="text-xs text-muted-foreground">{tc.module} • {tc.priority}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
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
