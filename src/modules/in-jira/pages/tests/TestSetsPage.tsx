/**
 * Test Sets Page
 * Manage collections of test cases for execution
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Folder,
  PlayCircle,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface TestSet {
  id: string;
  name: string;
  description: string;
  caseCount: number;
  lastExecuted: string | null;
  createdBy: string;
  status: 'Active' | 'Archived';
}

const mockTestSets: TestSet[] = [
  { id: '1', name: 'Regression Suite', description: 'Full regression test suite for core features', caseCount: 248, lastExecuted: '2024-01-15', createdBy: 'John Doe', status: 'Active' },
  { id: '2', name: 'Smoke Tests', description: 'Quick validation of critical paths', caseCount: 42, lastExecuted: '2024-01-16', createdBy: 'Jane Smith', status: 'Active' },
  { id: '3', name: 'Authentication Tests', description: 'All authentication related test cases', caseCount: 56, lastExecuted: '2024-01-14', createdBy: 'John Doe', status: 'Active' },
  { id: '4', name: 'API Integration', description: 'Third-party API integration tests', caseCount: 89, lastExecuted: '2024-01-10', createdBy: 'Mike Johnson', status: 'Active' },
  { id: '5', name: 'Legacy Module Tests', description: 'Tests for deprecated modules', caseCount: 34, lastExecuted: '2023-12-01', createdBy: 'Jane Smith', status: 'Archived' },
];

export function TestSetsPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateSet = () => {
    toast.success('Create test set modal will open');
  };

  const handleExecuteSet = (setName: string) => {
    toast.success(`Starting execution for "${setName}"`);
  };

  const filteredSets = mockTestSets.filter(set => 
    set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    set.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-border-default">
        <div className="flex items-center gap-2 text-sm text-text-tertiary mb-2">
          <span>{projectKey}</span>
          <span>/</span>
          <span>Tests</span>
          <span>/</span>
          <span className="text-text-primary font-medium">Test Sets</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Test Sets</h1>
          <Button size="sm" onClick={handleCreateSet}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create Test Set
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border-default flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
          <Input
            placeholder="Search test sets..."
            className="pl-9 bg-surface-2 border-border-default"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-1.5" />
          Filters
        </Button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSets.map((set) => (
            <Card 
              key={set.id} 
              className="bg-surface-2 border-border-default hover:border-border-hover transition-colors cursor-pointer"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="h-5 w-5 text-accent-primary" />
                    <CardTitle className="text-base font-medium text-text-primary">
                      {set.name}
                    </CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.success('Opening test set...')}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success('Edit mode opened')}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExecuteSet(set.name)}>
                        Execute
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success('Cloning test set...')}>
                        Clone
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-status-error"
                        onClick={() => toast.success('Test set deleted')}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm text-text-tertiary mt-1 line-clamp-2">
                  {set.description}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <FileText className="h-4 w-4" />
                      {set.caseCount} cases
                    </div>
                    {set.status === 'Archived' && (
                      <Badge variant="secondary" className="text-text-tertiary">
                        Archived
                      </Badge>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-accent-primary hover:text-accent-primary"
                    onClick={() => handleExecuteSet(set.name)}
                  >
                    <PlayCircle className="h-4 w-4 mr-1.5" />
                    Execute
                  </Button>
                </div>
                {set.lastExecuted && (
                  <p className="text-xs text-text-quaternary mt-2">
                    Last executed: {set.lastExecuted}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TestSetsPage;
