/**
 * Test Cases Page
 * Displays folder tree and test cases with CRUD operations
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  FolderTree,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit,
  ChevronRight
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Mock data for test cases
const mockCases = [
  { 
    id: '1', 
    key: 'TC-001', 
    title: 'User can login with valid credentials', 
    status: 'APPROVED', 
    priority: 'High', 
    type: 'Functional',
    folder: 'Authentication'
  },
  { 
    id: '2', 
    key: 'TC-002', 
    title: 'User sees error for invalid password', 
    status: 'APPROVED', 
    priority: 'High', 
    type: 'Negative',
    folder: 'Authentication'
  },
  { 
    id: '3', 
    key: 'TC-003', 
    title: 'Password reset email is sent', 
    status: 'DRAFT', 
    priority: 'Medium', 
    type: 'Functional',
    folder: 'Authentication'
  },
  { 
    id: '4', 
    key: 'TC-004', 
    title: 'Dashboard loads within 3 seconds', 
    status: 'REVIEW', 
    priority: 'High', 
    type: 'Performance',
    folder: 'Dashboard'
  },
  { 
    id: '5', 
    key: 'TC-005', 
    title: 'User can create new project', 
    status: 'APPROVED', 
    priority: 'Medium', 
    type: 'Functional',
    folder: 'Projects'
  },
];

// Mock folder tree
const mockFolders = [
  { id: 'root', name: 'All Test Cases', children: [
    { id: 'auth', name: 'Authentication', count: 15 },
    { id: 'dash', name: 'Dashboard', count: 8 },
    { id: 'proj', name: 'Projects', count: 12 },
    { id: 'user', name: 'User Management', count: 6 },
    { id: 'api', name: 'API Tests', count: 24 },
  ]},
];

const statusColors: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  REVIEW: 'bg-info/10 text-info border-info/20',
  APPROVED: 'bg-success/10 text-success border-success/20',
  DEPRECATED: 'bg-warning/10 text-warning border-warning/20',
};

const priorityColors: Record<string, string> = {
  High: 'text-danger',
  Medium: 'text-warning',
  Low: 'text-muted-foreground',
};

export function TestCasesPage() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCases, setSelectedCases] = useState<string[]>([]);

  const filteredCases = mockCases.filter(tc => 
    tc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tc.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full gap-4">
      {/* Folder Tree Sidebar */}
      <div className="w-64 shrink-0 rounded-lg border border-border-default bg-surface-0 p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Folders</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {mockFolders[0].children?.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                selectedFolder === folder.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                <span>{folder.name}</span>
              </div>
              <Badge variant="secondary" className={cn(
                'text-xs',
                selectedFolder === folder.id && 'bg-primary-foreground/20 text-primary-foreground'
              )}>
                {folder.count}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Test Cases</h1>
            <p className="text-sm text-muted-foreground">
              Manage and organize your test cases
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Test Case
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search test cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Table */}
        <div className="flex-1 rounded-lg border border-border-default bg-surface-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-2 hover:bg-surface-2">
                <TableHead className="w-[100px]">Key</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Priority</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((testCase) => (
                <TableRow 
                  key={testCase.id}
                  className="cursor-pointer hover:bg-surface-2"
                >
                  <TableCell className="font-mono text-sm text-primary">
                    {testCase.key}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {testCase.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs', statusColors[testCase.status])}
                    >
                      {testCase.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn('text-sm font-medium', priorityColors[testCase.priority])}>
                      {testCase.priority}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {testCase.type}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
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
    </div>
  );
}

export default TestCasesPage;
