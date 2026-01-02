/**
 * Test Executions Page
 * Execution workspace for running test cases
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  SkipForward,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Execution {
  id: string;
  testCaseKey: string;
  testCaseTitle: string;
  status: 'Passed' | 'Failed' | 'Blocked' | 'Not Run' | 'In Progress';
  executedBy: string | null;
  executedAt: string | null;
  duration: string | null;
}

const mockExecutions: Execution[] = [
  { id: '1', testCaseKey: 'TC-001', testCaseTitle: 'User login with valid credentials', status: 'Passed', executedBy: 'John Doe', executedAt: '2024-01-16 10:30', duration: '45s' },
  { id: '2', testCaseKey: 'TC-002', testCaseTitle: 'User login with invalid password', status: 'Passed', executedBy: 'John Doe', executedAt: '2024-01-16 10:32', duration: '32s' },
  { id: '3', testCaseKey: 'TC-003', testCaseTitle: 'Password reset flow', status: 'Failed', executedBy: 'Jane Smith', executedAt: '2024-01-16 09:15', duration: '1m 12s' },
  { id: '4', testCaseKey: 'TC-004', testCaseTitle: 'Create new project', status: 'In Progress', executedBy: 'John Doe', executedAt: null, duration: null },
  { id: '5', testCaseKey: 'TC-005', testCaseTitle: 'Delete project with dependencies', status: 'Not Run', executedBy: null, executedAt: null, duration: null },
  { id: '6', testCaseKey: 'TC-006', testCaseTitle: 'Bulk import users', status: 'Blocked', executedBy: 'Jane Smith', executedAt: '2024-01-16 08:45', duration: null },
];

function getStatusIcon(status: string) {
  switch (status) {
    case 'Passed': return <CheckCircle2 className="h-4 w-4 text-status-success" />;
    case 'Failed': return <XCircle className="h-4 w-4 text-status-error" />;
    case 'Blocked': return <AlertTriangle className="h-4 w-4 text-status-warning" />;
    case 'In Progress': return <PlayCircle className="h-4 w-4 text-accent-primary" />;
    case 'Not Run': return <Clock className="h-4 w-4 text-text-quaternary" />;
    default: return <Clock className="h-4 w-4 text-text-quaternary" />;
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'Passed': return 'text-status-success bg-status-success/10';
    case 'Failed': return 'text-status-error bg-status-error/10';
    case 'Blocked': return 'text-status-warning bg-status-warning/10';
    case 'In Progress': return 'text-accent-primary bg-accent-subtle';
    case 'Not Run': return 'text-text-tertiary bg-surface-3';
    default: return 'text-text-tertiary bg-surface-3';
  }
}

export function TestExecutionsPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(mockExecutions[3]);

  const handleSetResult = (result: 'Passed' | 'Failed' | 'Blocked') => {
    toast.success(`Test marked as ${result}`);
  };

  const handleSkip = () => {
    toast.info('Test skipped, moving to next');
  };

  const filteredExecutions = mockExecutions.filter(exec => 
    exec.testCaseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exec.testCaseKey.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex bg-surface-1">
      {/* Left Panel - Execution List */}
      <div className="w-96 border-r border-border-default flex flex-col">
        <div className="px-4 py-3 border-b border-border-default">
          <div className="flex items-center gap-2 text-sm text-text-tertiary mb-2">
            <span>{projectKey}</span>
            <span>/</span>
            <span>Tests</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Executions</span>
          </div>
          <h2 className="text-lg font-semibold text-text-primary">Execution Workspace</h2>
        </div>
        
        <div className="px-4 py-3 border-b border-border-default">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
            <Input
              placeholder="Search executions..."
              className="pl-9 bg-surface-2 border-border-default"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredExecutions.map((execution) => (
            <div
              key={execution.id}
              onClick={() => setSelectedExecution(execution)}
              className={cn(
                "px-4 py-3 border-b border-border-default cursor-pointer transition-colors",
                selectedExecution?.id === execution.id 
                  ? "bg-accent-subtle" 
                  : "hover:bg-surface-hover"
              )}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(execution.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-accent-primary">{execution.testCaseKey}</span>
                    <Badge className={cn("text-xs", getStatusBadgeClass(execution.status))} variant="secondary">
                      {execution.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-primary mt-1 truncate">{execution.testCaseTitle}</p>
                  {execution.executedAt && (
                    <p className="text-xs text-text-quaternary mt-1">{execution.executedAt}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-text-quaternary flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Execution Details */}
      <div className="flex-1 flex flex-col">
        {selectedExecution ? (
          <>
            <div className="px-6 py-4 border-b border-border-default">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-accent-primary">{selectedExecution.testCaseKey}</span>
                    <Badge className={getStatusBadgeClass(selectedExecution.status)} variant="secondary">
                      {selectedExecution.status}
                    </Badge>
                  </div>
                  <h1 className="text-xl font-semibold text-text-primary mt-1">
                    {selectedExecution.testCaseTitle}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSkip}>
                    <SkipForward className="h-4 w-4 mr-1.5" />
                    Skip
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <Tabs defaultValue="steps" className="w-full">
                <TabsList className="bg-surface-2 border border-border-default">
                  <TabsTrigger value="steps">Test Steps</TabsTrigger>
                  <TabsTrigger value="attachments">Attachments</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="steps" className="mt-4">
                  <Card className="bg-surface-2 border-border-default">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-text-primary">
                        Test Steps
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-4 p-3 bg-surface-1 rounded-lg border border-border-default">
                        <div className="w-6 h-6 rounded-full bg-surface-3 flex items-center justify-center text-xs font-medium text-text-secondary">
                          1
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-text-primary">Navigate to login page</p>
                          <p className="text-xs text-text-tertiary mt-1">Expected: Login form is displayed</p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-3 bg-surface-1 rounded-lg border border-border-default">
                        <div className="w-6 h-6 rounded-full bg-surface-3 flex items-center justify-center text-xs font-medium text-text-secondary">
                          2
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-text-primary">Enter valid username and password</p>
                          <p className="text-xs text-text-tertiary mt-1">Expected: Credentials are accepted</p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-3 bg-surface-1 rounded-lg border border-border-default">
                        <div className="w-6 h-6 rounded-full bg-surface-3 flex items-center justify-center text-xs font-medium text-text-secondary">
                          3
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-text-primary">Click login button</p>
                          <p className="text-xs text-text-tertiary mt-1">Expected: User is redirected to dashboard</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="attachments" className="mt-4">
                  <Card className="bg-surface-2 border-border-default">
                    <CardContent className="p-6">
                      <p className="text-sm text-text-tertiary text-center">No attachments yet</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="history" className="mt-4">
                  <Card className="bg-surface-2 border-border-default">
                    <CardContent className="p-6">
                      <p className="text-sm text-text-tertiary text-center">No execution history</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Execution Actions */}
            <div className="px-6 py-4 border-t border-border-default bg-surface-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-tertiary">Set execution result:</p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    className="text-status-success border-status-success hover:bg-status-success/10"
                    onClick={() => handleSetResult('Passed')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Pass
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-status-error border-status-error hover:bg-status-error/10"
                    onClick={() => handleSetResult('Failed')}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Fail
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-status-warning border-status-warning hover:bg-status-warning/10"
                    onClick={() => handleSetResult('Blocked')}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1.5" />
                    Blocked
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-tertiary">
            Select a test case to begin execution
          </div>
        )}
      </div>
    </div>
  );
}

export default TestExecutionsPage;
