/**
 * Defects Page
 * Displays defects list with filters and management
 */

import React, { useState } from 'react';
import { 
  Bug, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  ExternalLink,
  Edit,
  Link2,
  AlertTriangle,
  AlertCircle,
  Info
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Mock data for defects
const mockDefects = [
  { 
    id: '1', 
    key: 'DEF-001', 
    title: 'Login button unresponsive on mobile', 
    severity: 'CRITICAL',
    status: 'OPEN',
    priority: 'High',
    assignee: 'John Doe',
    linkedCase: 'TC-001',
    createdAt: '2024-01-15'
  },
  { 
    id: '2', 
    key: 'DEF-002', 
    title: 'Dashboard charts not rendering correctly', 
    severity: 'MAJOR',
    status: 'IN_PROGRESS',
    priority: 'Medium',
    assignee: 'Jane Smith',
    linkedCase: 'TC-004',
    createdAt: '2024-01-14'
  },
  { 
    id: '3', 
    key: 'DEF-003', 
    title: 'Typo in error message', 
    severity: 'MINOR',
    status: 'RESOLVED',
    priority: 'Low',
    assignee: 'Bob Wilson',
    linkedCase: 'TC-002',
    createdAt: '2024-01-13'
  },
  { 
    id: '4', 
    key: 'DEF-004', 
    title: 'API timeout on large data sets', 
    severity: 'MAJOR',
    status: 'OPEN',
    priority: 'High',
    assignee: null,
    linkedCase: null,
    createdAt: '2024-01-16'
  },
  { 
    id: '5', 
    key: 'DEF-005', 
    title: 'Session expires without warning', 
    severity: 'CRITICAL',
    status: 'VERIFIED',
    priority: 'High',
    assignee: 'John Doe',
    linkedCase: 'TC-001',
    createdAt: '2024-01-12'
  },
];

const severityConfig: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  CRITICAL: { label: 'Critical', class: 'bg-danger text-danger-foreground', icon: AlertTriangle },
  MAJOR: { label: 'Major', class: 'bg-warning text-warning-foreground', icon: AlertCircle },
  MINOR: { label: 'Minor', class: 'bg-info/80 text-white', icon: Info },
  TRIVIAL: { label: 'Trivial', class: 'bg-muted text-muted-foreground', icon: Info },
};

const statusColors: Record<string, string> = {
  OPEN: 'bg-danger/10 text-danger border-danger/20',
  IN_PROGRESS: 'bg-info/10 text-info border-info/20',
  RESOLVED: 'bg-success/10 text-success border-success/20',
  VERIFIED: 'bg-success/10 text-success border-success/20',
  CLOSED: 'bg-muted text-muted-foreground',
  REJECTED: 'bg-muted text-muted-foreground',
};

export function DefectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  const filteredDefects = mockDefects.filter(defect => 
    (defect.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    defect.key.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!severityFilter || defect.severity === severityFilter)
  );

  // Summary stats
  const stats = {
    total: mockDefects.length,
    open: mockDefects.filter(d => d.status === 'OPEN').length,
    critical: mockDefects.filter(d => d.severity === 'CRITICAL').length,
    resolved: mockDefects.filter(d => ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(d.status)).length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Defects</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage defects found during testing
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Defect
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Defects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search defects..."
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
      <div className="rounded-lg border border-border-default bg-surface-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-2 hover:bg-surface-2">
              <TableHead className="w-[100px]">Key</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[100px]">Severity</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[120px]">Assignee</TableHead>
              <TableHead className="w-[100px]">Linked Case</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDefects.map((defect) => {
              const severityInfo = severityConfig[defect.severity];
              const SeverityIcon = severityInfo?.icon || Info;

              return (
                <TableRow 
                  key={defect.id}
                  className="cursor-pointer hover:bg-surface-2"
                >
                  <TableCell className="font-mono text-sm text-primary">
                    {defect.key}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Bug className="h-4 w-4 text-danger" />
                      {defect.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs gap-1', severityInfo?.class)}>
                      <SeverityIcon className="h-3 w-3" />
                      {severityInfo?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs', statusColors[defect.status])}
                    >
                      {defect.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {defect.assignee || (
                      <span className="text-muted-foreground italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {defect.linkedCase ? (
                      <Badge variant="outline" className="text-xs font-mono">
                        <Link2 className="h-3 w-3 mr-1" />
                        {defect.linkedCase}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
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
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link2 className="h-4 w-4 mr-2" />
                          Link Test Case
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in Jira
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default DefectsPage;
