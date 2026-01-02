/**
 * Test Cycles Page
 * Manage test execution cycles and sprints
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlayCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface TestCycle {
  id: string;
  name: string;
  status: 'Active' | 'Completed' | 'Planned';
  startDate: string;
  endDate: string;
  totalCases: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  assignee: string;
}

const mockCycles: TestCycle[] = [
  { id: '1', name: 'Sprint 24 - Regression', status: 'Active', startDate: '2024-01-15', endDate: '2024-01-29', totalCases: 248, passed: 180, failed: 12, blocked: 6, notRun: 50, assignee: 'QA Team' },
  { id: '2', name: 'Sprint 24 - New Features', status: 'Active', startDate: '2024-01-15', endDate: '2024-01-29', totalCases: 56, passed: 25, failed: 3, blocked: 2, notRun: 26, assignee: 'John Doe' },
  { id: '3', name: 'Integration Tests Q1', status: 'Active', startDate: '2024-01-01', endDate: '2024-03-31', totalCases: 89, passed: 78, failed: 5, blocked: 1, notRun: 5, assignee: 'Jane Smith' },
  { id: '4', name: 'Sprint 23 - Regression', status: 'Completed', startDate: '2024-01-01', endDate: '2024-01-14', totalCases: 248, passed: 235, failed: 8, blocked: 0, notRun: 5, assignee: 'QA Team' },
  { id: '5', name: 'Sprint 25 - Planning', status: 'Planned', startDate: '2024-01-29', endDate: '2024-02-12', totalCases: 0, passed: 0, failed: 0, blocked: 0, notRun: 0, assignee: 'TBD' },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'Active': return 'text-status-success bg-status-success/10';
    case 'Completed': return 'text-accent-primary bg-accent-subtle';
    case 'Planned': return 'text-text-tertiary bg-surface-3';
    default: return 'text-text-tertiary bg-surface-3';
  }
}

export function TestCyclesPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateCycle = () => {
    toast.success('Create test cycle modal will open');
  };

  const filteredCycles = mockCycles.filter(cycle => 
    cycle.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProgress = (cycle: TestCycle) => {
    if (cycle.totalCases === 0) return 0;
    return Math.round(((cycle.passed + cycle.failed + cycle.blocked) / cycle.totalCases) * 100);
  };

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-border-default">
        <div className="flex items-center gap-2 text-sm text-text-tertiary mb-2">
          <span>{projectKey}</span>
          <span>/</span>
          <span>Tests</span>
          <span>/</span>
          <span className="text-text-primary font-medium">Test Cycles</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Test Cycles</h1>
          <Button size="sm" onClick={handleCreateCycle}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create Cycle
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border-default flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
          <Input
            placeholder="Search cycles..."
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

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-surface-1 z-10">
            <TableRow className="border-border-default hover:bg-transparent">
              <TableHead className="text-text-tertiary font-medium">Cycle</TableHead>
              <TableHead className="text-text-tertiary font-medium">Status</TableHead>
              <TableHead className="text-text-tertiary font-medium">Timeline</TableHead>
              <TableHead className="text-text-tertiary font-medium">Progress</TableHead>
              <TableHead className="text-text-tertiary font-medium">Results</TableHead>
              <TableHead className="text-text-tertiary font-medium">Assignee</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCycles.map((cycle) => (
              <TableRow 
                key={cycle.id} 
                className="border-border-default hover:bg-surface-hover cursor-pointer"
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-text-quaternary" />
                    <span className="text-text-primary font-medium">{cycle.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(cycle.status)} variant="secondary">
                    {cycle.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-text-secondary text-sm">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {cycle.startDate} → {cycle.endDate}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="w-32">
                    <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                      <span>{getProgress(cycle)}%</span>
                      <span>{cycle.totalCases} cases</span>
                    </div>
                    <Progress value={getProgress(cycle)} className="h-1.5" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-status-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {cycle.passed}
                    </span>
                    <span className="flex items-center gap-1 text-status-error">
                      <XCircle className="h-3.5 w-3.5" />
                      {cycle.failed}
                    </span>
                    <span className="flex items-center gap-1 text-status-warning">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {cycle.blocked}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-text-secondary">{cycle.assignee}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.success('Opening cycle...')}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success('Opening execution workspace...')}>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Execute
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success('Edit mode opened')}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success('Cloning cycle...')}>
                        Clone
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-status-error"
                        onClick={() => toast.success('Cycle deleted')}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default TestCyclesPage;
