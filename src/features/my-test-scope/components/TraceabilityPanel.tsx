/**
 * Traceability Panel
 * Shows requirement-to-test traceability matrix for user's scope
 */

import React, { useState } from 'react';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import SearchIcon from '@atlaskit/icon/core/search';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import FileIcon from '@atlaskit/icon/core/file';
// No @atlaskit/icon equivalent — inline SVG
const NetworkIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="16" y="16" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="9" y="2" width="6" height="6" rx="1" /><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /><path d="M12 12V8" />
  </svg>
);
const XCircleIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
  </svg>
);
const CircleIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
    <circle cx="12" cy="12" r="10" />
  </svg>
);
const TestTubeIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2" /><path d="M8.5 2h7" /><path d="M14.5 16h-5" />
  </svg>
);
import type { TestAssignment } from '../types';

interface TraceabilityPanelProps {
  tests: TestAssignment[];
}

interface RequirementGroup {
  id: string;
  key: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  coverage: number;
  tests: TestAssignment[];
}

// Group tests by linked stories to create requirement groups
function groupTestsByRequirement(tests: TestAssignment[]): RequirementGroup[] {
  const groups: RequirementGroup[] = [
    {
      id: 'req-001',
      key: 'REQ-001',
      title: 'OAuth 2.0 Authentication Flow',
      priority: 'critical',
      coverage: 40,
      tests: tests.filter(t => ['tc-2401', 'tc-2402', 'tc-2403'].includes(t.id)),
    },
    {
      id: 'req-002',
      key: 'REQ-002',
      title: 'Multi-Factor Authentication',
      priority: 'high',
      coverage: 0,
      tests: tests.filter(t => ['tc-2404'].includes(t.id)),
    },
    {
      id: 'req-003',
      key: 'REQ-003',
      title: 'Session Management',
      priority: 'medium',
      coverage: 100,
      tests: tests.filter(t => ['tc-2405', 'tc-2406'].includes(t.id)),
    },
    {
      id: 'req-004',
      key: 'REQ-004',
      title: 'Data Encryption Standards',
      priority: 'high',
      coverage: 0,
      tests: tests.filter(t => ['tc-2407'].includes(t.id)),
    },
    {
      id: 'req-005',
      key: 'REQ-005',
      title: 'API Rate Limiting & CORS',
      priority: 'medium',
      coverage: 50,
      tests: tests.filter(t => ['tc-2408', 'tc-2409'].includes(t.id)),
    },
    {
      id: 'req-006',
      key: 'REQ-006',
      title: 'Real-time Communication',
      priority: 'medium',
      coverage: 0,
      tests: tests.filter(t => ['tc-2410'].includes(t.id)),
    },
    {
      id: 'req-007',
      key: 'REQ-007',
      title: 'Performance & Scalability',
      priority: 'high',
      coverage: 50,
      tests: tests.filter(t => ['tc-2411', 'tc-2412'].includes(t.id)),
    },
  ];

  // Recalculate coverage based on actual test status
  return groups.map(group => ({
    ...group,
    coverage: group.tests.length > 0 
      ? Math.round((group.tests.filter(t => t.status === 'passed').length / group.tests.length) * 100)
      : 0,
  }));
}

// §L38 Atlaskit Lozenge appearances replace bespoke className overrides.
const PRIORITY_CONFIG: Record<string, { label: string; appearance: LozengeAppearance }> = {
  critical: { label: 'Critical', appearance: 'removed' },  // red
  high:     { label: 'High',     appearance: 'moved' },    // yellow
  medium:   { label: 'Medium',   appearance: 'default' },  // grey
  low:      { label: 'Low',      appearance: 'default' },  // grey
};

const STATUS_CONFIG: Record<string, { renderIcon: () => React.ReactNode; className: string }> = {
  not_run: { renderIcon: () => <CircleIcon size={16} />, className: 'text-muted-foreground' },
  passed:  { renderIcon: () => <CheckCircleIcon label="" size="small" primaryColor="currentColor" />, className: 'text-success' },
  failed:  { renderIcon: () => <XCircleIcon size={16} />, className: 'text-danger' },
  blocked: { renderIcon: () => <CircleIcon size={16} />, className: 'text-warning' },
};

export function TraceabilityPanel({ tests }: TraceabilityPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const requirements = groupTestsByRequirement(tests);

  const filteredRequirements = requirements.filter(req => {
    if (priorityFilter !== 'all' && req.priority !== priorityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        req.key.toLowerCase().includes(query) ||
        req.title.toLowerCase().includes(query) ||
        req.tests.some(t => t.key.toLowerCase().includes(query) || t.title.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calculate overall stats
  const totalRequirements = requirements.length;
  const coveredRequirements = requirements.filter(r => r.coverage === 100).length;
  const partialRequirements = requirements.filter(r => r.coverage > 0 && r.coverage < 100).length;
  const uncoveredRequirements = requirements.filter(r => r.coverage === 0).length;

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg border border-border text-center">
          <NetworkIcon size={20} />
          <p className="text-2xl font-bold text-foreground">{totalRequirements}</p>
          <p className="text-xs text-muted-foreground">Requirements</p>
        </div>
        <div className="p-4 bg-success/10 rounded-lg border border-success/20 text-center">
          <CheckCircleIcon label="" size="small" primaryColor="currentColor" />
          <p className="text-2xl font-bold text-success">{coveredRequirements}</p>
          <p className="text-xs text-muted-foreground">Covered</p>
        </div>
        <div className="p-4 bg-warning/10 rounded-lg border border-warning/20 text-center">
          <CircleIcon size={20} />
          <p className="text-2xl font-bold text-warning">{partialRequirements}</p>
          <p className="text-xs text-muted-foreground">Partial</p>
        </div>
        <div className="p-4 bg-danger/10 rounded-lg border border-danger/20 text-center">
          <XCircleIcon size={20} />
          <p className="text-2xl font-bold text-danger">{uncoveredRequirements}</p>
          <p className="text-xs text-muted-foreground">Uncovered</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground"><SearchIcon label="" size="small" primaryColor="currentColor" /></span>
          <Input
            placeholder="Search requirements or tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requirements List */}
      <div className="space-y-2">
        {filteredRequirements.map((req) => {
          const isExpanded = expandedGroups.has(req.id);
          const priorityConfig = PRIORITY_CONFIG[req.priority];
          
          return (
            <div key={req.id} className="border border-border rounded-lg overflow-hidden">
              {/* Requirement Header */}
              <button
                onClick={() => toggleGroup(req.id)}
                className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDownIcon label="" size="small" primaryColor="currentColor" />
                  ) : (
                    <ChevronRightIcon label="" size="small" primaryColor="currentColor" />
                  )}
                  <FileIcon label="" size="small" primaryColor="currentColor" />
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{req.key}</span>
                      <Lozenge appearance={priorityConfig.appearance}>
                        {priorityConfig.label}
                      </Lozenge>
                    </div>
                    <p className="text-sm text-muted-foreground">{req.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={cn(
                      'text-sm font-medium',
                      req.coverage === 100 ? 'text-success' :
                      req.coverage > 0 ? 'text-warning' : 'text-danger'
                    )}>
                      {req.coverage}% covered
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {req.tests.length} test{req.tests.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {/* Mini progress bar */}
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        'h-full rounded-full transition-all',
                        req.coverage === 100 ? 'bg-success' :
                        req.coverage > 0 ? 'bg-warning' : 'bg-danger'
                      )}
                      style={{ width: `${req.coverage}%` }}
                    />
                  </div>
                </div>
              </button>

              {/* Tests List */}
              {isExpanded && (
                <div className="border-t border-border">
                  {req.tests.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No tests linked to this requirement
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {req.tests.map((test) => {
                        const statusConfig = STATUS_CONFIG[test.status];

                        return (
                          <div key={test.id} className="flex items-center justify-between p-3 pl-12 hover:bg-muted/30">
                            <div className="flex items-center gap-3">
                              <TestTubeIcon size={16} />
                              <div>
                                <span className="text-sm font-medium text-foreground">{test.key}</span>
                                <p className="text-xs text-muted-foreground">{test.title}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={statusConfig.className}>{statusConfig.renderIcon()}</span>
                              <span className={cn('text-xs capitalize', statusConfig.className)}>
                                {test.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
