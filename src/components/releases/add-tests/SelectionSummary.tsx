/**
 * Selection Summary Panel - Right side showing selected tests
 */

import React, { useState } from 'react';
import { X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import type { LozengeAppearance } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { TestCase } from '@/types/add-tests.types';

interface SelectionSummaryProps {
  selectedTests: TestCase[];
  totalDuration: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: {
    functional: number;
    integration: number;
    e2e: number;
    performance: number;
  };
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function SelectionSummary({
  selectedTests,
  totalDuration,
  byPriority,
  byType,
  onRemove,
  onClearAll,
}: SelectionSummaryProps) {
  const [showAllTests, setShowAllTests] = useState(false);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const displayedTests = showAllTests 
    ? selectedTests 
    : selectedTests.slice(0, 8);
  const remainingCount = selectedTests.length - 8;

  const priorityStats: Array<{ label: string; count: number; appearance: LozengeAppearance }> = ([
    { label: 'Critical', count: byPriority.critical, appearance: 'removed' as LozengeAppearance },
    { label: 'High', count: byPriority.high, appearance: 'moved' as LozengeAppearance },
    { label: 'Medium', count: byPriority.medium, appearance: 'moved' as LozengeAppearance },
    { label: 'Low', count: byPriority.low, appearance: 'success' as LozengeAppearance },
  ]).filter(s => s.count > 0);

  const typeStats = [
    { label: 'Functional', count: byType.functional },
    { label: 'Integration', count: byType.integration },
    { label: 'E2E', count: byType.e2e },
    { label: 'Performance', count: byType.performance },
  ].filter(s => s.count > 0);

  if (selectedTests.length === 0) {
    return (
      <div className="flex-1 p-4">
        <div 
          className="flex flex-col items-center justify-center h-48 rounded-lg"
          style={{ backgroundColor: CATALYST_V5.slate[100] }}
        >
          <h3 
            className="text-sm font-medium mb-1"
            style={{ color: CATALYST_V5.slate[500] }}
          >
            No tests selected
          </h3>
          <p 
            className="text-xs text-center"
            style={{ color: CATALYST_V5.slate[400] }}
          >
            Select tests from the left panel
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: CATALYST_V5.slate[200] }}
      >
        <div className="flex items-center gap-2">
          <h3 
            className="text-sm font-semibold"
            style={{ color: CATALYST_V5.slate[700] }}
          >
            Selected Tests
          </h3>
          <Lozenge appearance="inprogress">
            {selectedTests.length}
          </Lozenge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs hover:text-red-600"
          onClick={onClearAll}
          style={{ color: CATALYST_V5.slate[500] }}
        >
          Clear All
        </Button>
      </div>

      {/* Selected Tests List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {displayedTests.map(test => (
            <div
              key={test.id}
              className="flex items-center gap-2 p-2 rounded-md group"
              style={{ backgroundColor: CATALYST_V5.slate[50] }}
            >
              <span 
                className="text-xs font-mono shrink-0"
                style={{ color: CATALYST_V5.primary }}
              >
                {test.test_case_id}
              </span>
              <span 
                className="flex-1 text-xs truncate"
                style={{ color: CATALYST_V5.slate[600] }}
              >
                {test.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemove(test.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Show More/Less */}
          {selectedTests.length > 8 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => setShowAllTests(!showAllTests)}
              style={{ color: CATALYST_V5.primary }}
            >
              {showAllTests ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  and {remainingCount} more...
                </>
              )}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div 
          className="mt-4 pt-4 space-y-3 border-t"
          style={{ borderColor: CATALYST_V5.slate[200] }}
        >
          {/* Total Duration */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" style={{ color: CATALYST_V5.slate[400] }} />
            <span 
              className="text-xs"
              style={{ color: CATALYST_V5.slate[600] }}
            >
              Total estimated time:
            </span>
            <span 
              className="text-xs font-semibold"
              style={{ color: CATALYST_V5.slate[700] }}
            >
              ~{formatDuration(totalDuration)}
            </span>
          </div>

          {/* By Priority */}
          {priorityStats.length > 0 && (
            <div>
              <span 
                className="text-xs"
                style={{ color: CATALYST_V5.slate[500] }}
              >
                By Priority:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {priorityStats.map(stat => (
                  <Lozenge key={stat.label} appearance={stat.appearance}>
                    {stat.count} {stat.label}
                  </Lozenge>
                ))}
              </div>
            </div>
          )}

          {/* By Type */}
          {typeStats.length > 0 && (
            <div>
              <span 
                className="text-xs"
                style={{ color: CATALYST_V5.slate[500] }}
              >
                By Type:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {typeStats.map(stat => (
                  <Lozenge key={stat.label} appearance="default">
                    {stat.count} {stat.label}
                  </Lozenge>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
