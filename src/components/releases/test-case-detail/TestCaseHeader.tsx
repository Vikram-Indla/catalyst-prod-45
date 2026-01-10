/**
 * Test Case Header Component
 * Displays title, status, meta information
 */

import { useState } from 'react';
import { Pencil, CheckCircle, XCircle, Circle, AlertTriangle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { TestCaseDetail } from '@/data/testCaseDetailData';

interface TestCaseHeaderProps {
  testCase: TestCaseDetail;
}

const statusConfig = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  ready: { label: 'Ready', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-200' },
  deprecated: { label: 'Deprecated', className: 'bg-red-50 text-red-600 border-red-200' },
};

const lastRunConfig = {
  passed: { label: 'Passed', icon: CheckCircle, className: 'text-green-600' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-red-600' },
  not_run: { label: 'Not Run', icon: Circle, className: 'text-gray-400' },
};

const priorityConfig = {
  critical: { icon: AlertTriangle, className: 'text-red-600', label: 'Critical' },
  high: { icon: ArrowUp, className: 'text-orange-600', label: 'High' },
  medium: { icon: Minus, className: 'text-yellow-600', label: 'Medium' },
  low: { icon: ArrowDown, className: 'text-gray-500', label: 'Low' },
};

const typeConfig = {
  functional: { className: 'bg-blue-50 text-blue-700 border-blue-200' },
  regression: { className: 'bg-purple-50 text-purple-700 border-purple-200' },
  smoke: { className: 'bg-orange-50 text-orange-700 border-orange-200' },
  integration: { className: 'bg-teal-50 text-teal-700 border-teal-200' },
  e2e: { className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

const avatarColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

export function TestCaseHeader({ testCase }: TestCaseHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(testCase.title);

  const status = statusConfig[testCase.status];
  const lastRun = lastRunConfig[testCase.lastRun];
  const priority = priorityConfig[testCase.priority];
  const type = typeConfig[testCase.type];
  const LastRunIcon = lastRun.icon;
  const PriorityIcon = priority.icon;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      {/* Top row: ID, Status, Last Run, Created */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-primary font-semibold">{testCase.id}</span>
          <Badge variant="outline" className={cn('text-xs font-medium', status.className)}>
            {status.label}
          </Badge>
          <div className={cn('flex items-center gap-1.5 text-sm', lastRun.className)}>
            <LastRunIcon className="w-4 h-4" />
            <span>Last Run: {lastRun.label}</span>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">
          Created {testCase.createdAt}
        </span>
      </div>

      {/* Title - Editable */}
      <div className="mb-4">
        {isEditingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-semibold"
              autoFocus
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingTitle(false);
                if (e.key === 'Escape') {
                  setTitle(testCase.title);
                  setIsEditingTitle(false);
                }
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsEditingTitle(true)}
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        {testCase.description}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Type:</span>
          <Badge variant="outline" className={cn('text-xs font-medium capitalize', type.className)}>
            {testCase.type}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Priority:</span>
          <span className={cn('flex items-center gap-1', priority.className)}>
            <PriorityIcon className="w-4 h-4" />
            {priority.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Assignee:</span>
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className={cn('text-xs', avatarColors[testCase.assignee.color])}>
                {testCase.assignee.avatar}
              </AvatarFallback>
            </Avatar>
            <span>{testCase.assignee.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Est. Time:</span>
          <span>{testCase.estimatedTime}</span>
        </div>
      </div>
    </div>
  );
}
