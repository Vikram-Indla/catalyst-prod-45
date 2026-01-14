/**
 * Status Select - Inline status editor
 */

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, PlayCircle, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CATALYST_V5, TEST_STATUS_COLORS } from '@/lib/catalyst-colors';
import type { TestStatus } from '@/types/assignment-table.types';

interface StatusSelectProps {
  value: TestStatus;
  onChange: (value: TestStatus) => void;
}

const STATUS_CONFIG: Record<TestStatus, { label: string; icon: typeof CheckCircle }> = {
  not_started: { label: 'Not Started', icon: Clock },
  in_progress: { label: 'In Progress', icon: PlayCircle },
  passed: { label: 'Passed', icon: CheckCircle },
  failed: { label: 'Failed', icon: XCircle },
  blocked: { label: 'Blocked', icon: AlertTriangle },
};

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  const config = STATUS_CONFIG[value];
  const style = TEST_STATUS_COLORS[value];
  const Icon = config.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 group">
          <Badge 
            className="text-xs px-2 py-0.5 gap-1 border-0 cursor-pointer"
            style={{ backgroundColor: style?.bg, color: style?.text }}
          >
            <Icon className="w-3 h-3" />
            {config.label}
          </Badge>
          <ChevronDown 
            className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" 
            style={{ color: CATALYST_V5.slate[400] }}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {(Object.entries(STATUS_CONFIG) as [TestStatus, typeof config][]).map(([status, cfg]) => {
          const statusStyle = TEST_STATUS_COLORS[status];
          const StatusIcon = cfg.icon;
          return (
            <DropdownMenuItem 
              key={status} 
              onClick={() => onChange(status)}
              className="gap-2"
            >
              <div 
                className="flex items-center gap-2 flex-1"
                style={{ color: status === value ? statusStyle?.text : undefined }}
              >
                <StatusIcon className="h-4 w-4" style={{ color: statusStyle?.text }} />
                <span>{cfg.label}</span>
              </div>
              {status === value && (
                <CheckCircle className="h-4 w-4" style={{ color: CATALYST_V5.primary }} />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
