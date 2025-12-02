/**
 * Traceability Matrix - Links requirements to test cases
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Network,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Link2,
  ExternalLink,
} from 'lucide-react';

interface Requirement {
  id: string;
  key: string;
  name: string;
  type: 'epic' | 'feature' | 'story';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface TestCase {
  id: string;
  key: string;
  title: string;
  status: 'passed' | 'failed' | 'blocked' | 'not_executed';
}

interface TraceabilityLink {
  requirementId: string;
  testCaseId: string;
}

interface TraceabilityMatrixProps {
  requirements: Requirement[];
  testCases: TestCase[];
  links: TraceabilityLink[];
  onExport?: () => void;
  onLinkClick?: (requirementId: string, testCaseId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  passed: 'bg-green-500',
  failed: 'bg-red-500',
  blocked: 'bg-amber-500',
  not_executed: 'bg-muted',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-500',
  high: 'text-amber-500',
  medium: 'text-blue-500',
  low: 'text-muted-foreground',
};

export const TraceabilityMatrix: React.FC<TraceabilityMatrixProps> = ({
  requirements,
  testCases,
  links,
  onExport,
  onLinkClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRequirements = requirements.filter((req) =>
    searchQuery === '' ||
    req.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLinkedTestCases = (requirementId: string) =>
    links
      .filter((link) => link.requirementId === requirementId)
      .map((link) => testCases.find((tc) => tc.id === link.testCaseId))
      .filter(Boolean) as TestCase[];

  const getCoverageStatus = (requirementId: string) => {
    const linkedTests = getLinkedTestCases(requirementId);
    if (linkedTests.length === 0) return 'none';
    const hasFailed = linkedTests.some((tc) => tc.status === 'failed');
    const allPassed = linkedTests.every((tc) => tc.status === 'passed');
    if (hasFailed) return 'failed';
    if (allPassed) return 'passed';
    return 'partial';
  };

  const summary = {
    total: requirements.length,
    covered: requirements.filter((r) => getLinkedTestCases(r.id).length > 0).length,
    passed: requirements.filter((r) => getCoverageStatus(r.id) === 'passed').length,
    failed: requirements.filter((r) => getCoverageStatus(r.id) === 'failed').length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-brand-gold" />
            Traceability Matrix
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex flex-wrap gap-4 mt-4">
          <Badge variant="outline">
            {summary.total} Requirements
          </Badge>
          <Badge variant="outline" className="text-brand-gold border-brand-gold/30">
            {summary.covered} Covered ({Math.round((summary.covered / summary.total) * 100)}%)
          </Badge>
          <Badge variant="outline" className="text-green-500 border-green-500/30">
            {summary.passed} Passing
          </Badge>
          <Badge variant="outline" className="text-red-500 border-red-500/30">
            {summary.failed} Failing
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {filteredRequirements.map((requirement) => {
              const linkedTests = getLinkedTestCases(requirement.id);
              const coverageStatus = getCoverageStatus(requirement.id);

              return (
                <div
                  key={requirement.id}
                  className="p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-brand-gold">{requirement.key}</span>
                        <Badge variant="outline" className="text-xs">
                          {requirement.type}
                        </Badge>
                        <span className={`text-xs ${PRIORITY_COLORS[requirement.priority]}`}>
                          {requirement.priority}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {requirement.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {coverageStatus === 'none' && (
                        <Badge variant="outline" className="text-red-500 border-red-500/30">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          No Coverage
                        </Badge>
                      )}
                      {coverageStatus === 'passed' && (
                        <Badge variant="outline" className="text-green-500 border-green-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Passing
                        </Badge>
                      )}
                      {coverageStatus === 'failed' && (
                        <Badge variant="outline" className="text-red-500 border-red-500/30">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failing
                        </Badge>
                      )}
                      {coverageStatus === 'partial' && (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                          Partial
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Linked Test Cases */}
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Link2 className="h-3 w-3" />
                      <span>{linkedTests.length} linked test case(s)</span>
                    </div>
                    {linkedTests.length > 0 && (
                      <TooltipProvider>
                        <div className="flex flex-wrap gap-2">
                          {linkedTests.map((tc) => (
                            <Tooltip key={tc.id}>
                              <TooltipTrigger asChild>
                                <button
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-colors hover:opacity-80 ${
                                    tc.status === 'passed'
                                      ? 'bg-green-500/10 border-green-500/30 text-green-500'
                                      : tc.status === 'failed'
                                      ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                      : tc.status === 'blocked'
                                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                      : 'bg-muted border-border text-muted-foreground'
                                  }`}
                                  onClick={() => onLinkClick?.(requirement.id, tc.id)}
                                >
                                  <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[tc.status]}`} />
                                  {tc.key}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{tc.key}</p>
                                <p className="text-xs text-muted-foreground">{tc.title}</p>
                                <p className="text-xs capitalize mt-1">Status: {tc.status.replace('_', ' ')}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TooltipProvider>
                    )}
                    {linkedTests.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        No test cases linked to this requirement
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredRequirements.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No requirements found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
