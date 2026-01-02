/**
 * Test Cases Page
 * Library view for managing test cases
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MoreHorizontal,
  ChevronDown,
  Folder,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface TestCase {
  id: string;
  key: string;
  title: string;
  folder: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Draft' | 'Ready' | 'Deprecated';
  type: 'Manual' | 'Automated';
  lastRun: string | null;
  lastResult: 'Passed' | 'Failed' | 'Blocked' | null;
}

const mockTestCases: TestCase[] = [
  { id: '1', key: 'TC-001', title: 'User login with valid credentials', folder: 'Authentication', priority: 'Critical', status: 'Ready', type: 'Automated', lastRun: '2024-01-15', lastResult: 'Passed' },
  { id: '2', key: 'TC-002', title: 'User login with invalid password', folder: 'Authentication', priority: 'High', status: 'Ready', type: 'Automated', lastRun: '2024-01-15', lastResult: 'Passed' },
  { id: '3', key: 'TC-003', title: 'Password reset flow', folder: 'Authentication', priority: 'High', status: 'Ready', type: 'Manual', lastRun: '2024-01-14', lastResult: 'Failed' },
  { id: '4', key: 'TC-004', title: 'Create new project', folder: 'Projects', priority: 'Critical', status: 'Ready', type: 'Manual', lastRun: '2024-01-15', lastResult: 'Passed' },
  { id: '5', key: 'TC-005', title: 'Delete project with dependencies', folder: 'Projects', priority: 'Medium', status: 'Draft', type: 'Manual', lastRun: null, lastResult: null },
];

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'Critical': return 'text-status-error bg-status-error/10';
    case 'High': return 'text-status-warning bg-status-warning/10';
    case 'Medium': return 'text-accent-primary bg-accent-subtle';
    case 'Low': return 'text-text-tertiary bg-surface-3';
    default: return 'text-text-tertiary bg-surface-3';
  }
}

function getResultColor(result: string | null) {
  switch (result) {
    case 'Passed': return 'text-status-success bg-status-success/10';
    case 'Failed': return 'text-status-error bg-status-error/10';
    case 'Blocked': return 'text-status-warning bg-status-warning/10';
    default: return 'text-text-quaternary bg-surface-3';
  }
}

export function TestCasesPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCases(mockTestCases.map(tc => tc.id));
    } else {
      setSelectedCases([]);
    }
  };

  const handleSelectCase = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCases([...selectedCases, id]);
    } else {
      setSelectedCases(selectedCases.filter(cid => cid !== id));
    }
  };

  const handleCreateCase = () => {
    toast.success('Create test case modal will open');
  };

  const handleExport = () => {
    toast.success('Exporting test cases...');
  };

  const handleImport = () => {
    toast.info('Import dialog will open');
  };

  const filteredCases = mockTestCases.filter(tc => 
    tc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tc.key.toLowerCase().includes(searchQuery.toLowerCase())
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
          <span className="text-text-primary font-medium">Test Cases</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Test Case Library</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="h-4 w-4 mr-1.5" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
            <Button size="sm" onClick={handleCreateCase}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Test Case
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border-default flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
          <Input
            placeholder="Search test cases..."
            className="pl-9 bg-surface-2 border-border-default"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-1.5" />
          Filters
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Folder className="h-4 w-4 mr-1.5" />
              Folder
              <ChevronDown className="h-3 w-3 ml-1.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>All Folders</DropdownMenuItem>
            <DropdownMenuItem>Authentication</DropdownMenuItem>
            <DropdownMenuItem>Projects</DropdownMenuItem>
            <DropdownMenuItem>Reports</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {selectedCases.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-text-tertiary">
              {selectedCases.length} selected
            </span>
            <Button variant="outline" size="sm" onClick={() => toast.success('Adding to test set...')}>
              Add to Set
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.success('Bulk edit opened')}>
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-surface-1 z-10">
            <TableRow className="border-border-default hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedCases.length === mockTestCases.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="text-text-tertiary font-medium">Key</TableHead>
              <TableHead className="text-text-tertiary font-medium">Title</TableHead>
              <TableHead className="text-text-tertiary font-medium">Folder</TableHead>
              <TableHead className="text-text-tertiary font-medium">Priority</TableHead>
              <TableHead className="text-text-tertiary font-medium">Status</TableHead>
              <TableHead className="text-text-tertiary font-medium">Type</TableHead>
              <TableHead className="text-text-tertiary font-medium">Last Result</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCases.map((testCase) => (
              <TableRow 
                key={testCase.id} 
                className="border-border-default hover:bg-surface-hover cursor-pointer"
              >
                <TableCell>
                  <Checkbox 
                    checked={selectedCases.includes(testCase.id)}
                    onCheckedChange={(checked) => handleSelectCase(testCase.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell className="font-mono text-sm text-accent-primary">
                  {testCase.key}
                </TableCell>
                <TableCell className="text-text-primary">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-text-quaternary" />
                    {testCase.title}
                  </div>
                </TableCell>
                <TableCell className="text-text-secondary">{testCase.folder}</TableCell>
                <TableCell>
                  <Badge className={getPriorityColor(testCase.priority)} variant="secondary">
                    {testCase.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-text-secondary">
                    {testCase.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-text-secondary">{testCase.type}</TableCell>
                <TableCell>
                  {testCase.lastResult ? (
                    <Badge className={getResultColor(testCase.lastResult)} variant="secondary">
                      {testCase.lastResult}
                    </Badge>
                  ) : (
                    <span className="text-text-quaternary">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.success('Opening test case...')}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success('Edit mode opened')}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success('Cloning test case...')}>
                        Clone
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-status-error"
                        onClick={() => toast.success('Test case deleted')}
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

export default TestCasesPage;
