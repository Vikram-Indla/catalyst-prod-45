/**
 * Traceability Page
 * Requirements to test coverage matrix
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Link2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface TraceabilityItem {
  id: string;
  workItemKey: string;
  workItemTitle: string;
  workItemType: 'Story' | 'Feature' | 'Epic';
  linkedTests: number;
  coverage: number;
  lastResult: 'Passed' | 'Failed' | 'Mixed' | 'Not Run';
}

const mockTraceability: TraceabilityItem[] = [
  { id: '1', workItemKey: 'PROJ-101', workItemTitle: 'User authentication flow', workItemType: 'Feature', linkedTests: 12, coverage: 100, lastResult: 'Passed' },
  { id: '2', workItemKey: 'PROJ-102', workItemTitle: 'Dashboard redesign', workItemType: 'Feature', linkedTests: 8, coverage: 75, lastResult: 'Mixed' },
  { id: '3', workItemKey: 'PROJ-201', workItemTitle: 'Login with SSO', workItemType: 'Story', linkedTests: 4, coverage: 100, lastResult: 'Passed' },
  { id: '4', workItemKey: 'PROJ-202', workItemTitle: 'Password complexity validation', workItemType: 'Story', linkedTests: 3, coverage: 100, lastResult: 'Failed' },
  { id: '5', workItemKey: 'PROJ-203', workItemTitle: 'Export reports to PDF', workItemType: 'Story', linkedTests: 0, coverage: 0, lastResult: 'Not Run' },
  { id: '6', workItemKey: 'PROJ-301', workItemTitle: 'API rate limiting', workItemType: 'Story', linkedTests: 5, coverage: 60, lastResult: 'Passed' },
];

function getCoverageColor(coverage: number) {
  if (coverage >= 80) return 'text-status-success';
  if (coverage >= 50) return 'text-status-warning';
  return 'text-status-error';
}

function getResultBadge(result: string) {
  switch (result) {
    case 'Passed': return <Badge className="text-status-success bg-status-success/10">Passed</Badge>;
    case 'Failed': return <Badge className="text-status-error bg-status-error/10">Failed</Badge>;
    case 'Mixed': return <Badge className="text-status-warning bg-status-warning/10">Mixed</Badge>;
    case 'Not Run': return <Badge className="text-text-tertiary bg-surface-3">Not Run</Badge>;
    default: return null;
  }
}

export function TraceabilityPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const handleAISuggest = () => {
    toast.success('AI analyzing coverage gaps...');
  };

  const handleLinkTests = (itemKey: string) => {
    toast.success(`Opening test linking dialog for ${itemKey}`);
  };

  const filteredItems = mockTraceability.filter(item => 
    item.workItemTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.workItemKey.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgCoverage = Math.round(
    mockTraceability.reduce((sum, item) => sum + item.coverage, 0) / mockTraceability.length
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
          <span className="text-text-primary font-medium">Traceability</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Traceability Autopilot</h1>
            <p className="text-sm text-text-tertiary mt-0.5">
              Requirements to test coverage matrix
            </p>
          </div>
          <Button size="sm" onClick={handleAISuggest}>
            <Sparkles className="h-4 w-4 mr-1.5" />
            AI Suggest Coverage
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-4 border-b border-border-default">
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-surface-2 border-border-default">
            <CardContent className="p-4">
              <p className="text-sm text-text-tertiary">Total Work Items</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">{mockTraceability.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-surface-2 border-border-default">
            <CardContent className="p-4">
              <p className="text-sm text-text-tertiary">Average Coverage</p>
              <p className={`text-2xl font-semibold mt-1 ${getCoverageColor(avgCoverage)}`}>
                {avgCoverage}%
              </p>
            </CardContent>
          </Card>
          <Card className="bg-surface-2 border-border-default">
            <CardContent className="p-4">
              <p className="text-sm text-text-tertiary">Fully Covered</p>
              <p className="text-2xl font-semibold text-status-success mt-1">
                {mockTraceability.filter(i => i.coverage === 100).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-surface-2 border-border-default">
            <CardContent className="p-4">
              <p className="text-sm text-text-tertiary">No Coverage</p>
              <p className="text-2xl font-semibold text-status-error mt-1">
                {mockTraceability.filter(i => i.coverage === 0).length}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border-default flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
          <Input
            placeholder="Search work items..."
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
              <TableHead className="text-text-tertiary font-medium">Work Item</TableHead>
              <TableHead className="text-text-tertiary font-medium">Type</TableHead>
              <TableHead className="text-text-tertiary font-medium">Linked Tests</TableHead>
              <TableHead className="text-text-tertiary font-medium">Coverage</TableHead>
              <TableHead className="text-text-tertiary font-medium">Last Result</TableHead>
              <TableHead className="text-text-tertiary font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow 
                key={item.id} 
                className="border-border-default hover:bg-surface-hover"
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-text-quaternary" />
                    <div>
                      <span className="text-sm font-mono text-accent-primary">{item.workItemKey}</span>
                      <p className="text-sm text-text-primary">{item.workItemTitle}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-text-secondary">
                    {item.workItemType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-text-quaternary" />
                    <span className="text-text-primary">{item.linkedTests}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="w-24">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={getCoverageColor(item.coverage)}>{item.coverage}%</span>
                    </div>
                    <Progress value={item.coverage} className="h-1.5" />
                  </div>
                </TableCell>
                <TableCell>
                  {getResultBadge(item.lastResult)}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleLinkTests(item.workItemKey)}
                  >
                    <Link2 className="h-4 w-4 mr-1.5" />
                    Link Tests
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default TraceabilityPage;
