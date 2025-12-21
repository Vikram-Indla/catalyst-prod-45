import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, AlertTriangle, Circle, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ChangeCard } from '../types';
import { STATUS_LABELS } from '../types';
import { format } from 'date-fns';

interface ListViewProps {
  changeCards: ChangeCard[];
  onChangeClick: (changeId: string) => void;
  isLoading?: boolean;
}

export function ListView({ changeCards, onChangeClick, isLoading }: ListViewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-100 dark:border-gray-800">
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="col-span-1 text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          &nbsp;
        </div>
        <div className="col-span-2 text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Change #
        </div>
        <div className="col-span-3 text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Title
        </div>
        <div className="col-span-2 text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Status
        </div>
        <div className="col-span-2 text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Planned Date
        </div>
        <div className="col-span-1 text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Approved
        </div>
        <div className="col-span-1 text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Compliance
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {changeCards.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No changes found
          </div>
        ) : (
          changeCards.map(change => (
            <ChangeRow
              key={change.id}
              change={change}
              isExpanded={expandedRows.has(change.id)}
              onToggle={() => toggleRow(change.id)}
              onClick={() => onChangeClick(change.id)}
            />
          ))
        )}
      </div>
    </Card>
  );
}

interface ChangeRowProps {
  change: ChangeCard;
  isExpanded: boolean;
  onToggle: () => void;
  onClick: () => void;
}

function ChangeRow({ change, isExpanded, onToggle, onClick }: ChangeRowProps) {
  const statusColors: Record<string, string> = {
    'new_awaiting_approval': 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    'approved_scheduled': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    'in_progress': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    'ready_for_production': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    'in_production': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    'closed': 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  };

  return (
    <div>
      <div 
        className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
        onClick={onClick}
      >
        {/* Expand Toggle */}
        <div className="col-span-1 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-500 dark:text-gray-400"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Change Number */}
        <div className="col-span-2 flex items-center">
          <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
            {change.change_number}
          </span>
        </div>

        {/* Title */}
        <div className="col-span-3 flex items-center">
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {change.title}
          </span>
        </div>

        {/* Status */}
        <div className="col-span-2 flex items-center">
          <Badge className={cn("text-2xs font-medium", statusColors[change.status])}>
            {STATUS_LABELS[change.status]}
          </Badge>
        </div>

        {/* Planned Date */}
        <div className="col-span-2 flex items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {format(new Date(change.planned_prod_date), 'MMM d, yyyy')}
          </span>
        </div>

        {/* Approved */}
        <div className="col-span-1 flex items-center">
          {change.approved ? (
            <CheckCircle className="h-4 w-4 text-status-success" />
          ) : (
            <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600" />
          )}
        </div>

        {/* Compliance */}
        <div className="col-span-1 flex items-center">
          {change.compliance_state === 'compliant' ? (
            <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-2xs">
              Compliant
            </Badge>
          ) : (
            <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-2xs">
              Exception
            </Badge>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
          <div className="pl-10 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Description:</span>
              <p className="text-gray-700 dark:text-gray-300 mt-1">
                {change.description || 'No description'}
              </p>
            </div>
            <div className="space-y-2">
              {change.approved_at && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Approved At:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    {format(new Date(change.approved_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              )}
              {change.exception_reason_code && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Exception Reason:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    {change.exception_reason_code.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
