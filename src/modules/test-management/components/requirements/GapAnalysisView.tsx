// Gap Analysis View
import React from 'react';
import { AlertTriangle, FileQuestion, XCircle } from 'lucide-react';
import { GapAnalysis, TYPE_CONFIG } from '../../types/requirements';
import { cn } from '@/lib/utils';

interface GapAnalysisViewProps {
  gaps: GapAnalysis;
  isLoading?: boolean;
}

interface GapCardProps {
  title: string;
  count: number;
  countType: 'danger' | 'warning' | 'success';
  icon: React.ReactNode;
  children: React.ReactNode;
}

function GapCard({ title, count, countType, icon, children }: GapCardProps) {
  const countClass = {
    danger: 'bg-red-100 text-red-600',
    warning: 'bg-amber-100 text-amber-600',
    success: 'bg-teal-100 text-teal-600',
  }[countType];

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', countClass)}>
          {count}
        </span>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

interface GapItemProps {
  icon: React.ReactNode;
  itemKey: string;
  title: string;
}

function GapItem({ icon, itemKey, title }: GapItemProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50">
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-muted-foreground font-mono">{itemKey}</div>
        <div className="text-xs text-foreground truncate">{title}</div>
      </div>
    </div>
  );
}

export function GapAnalysisView({ gaps, isLoading }: GapAnalysisViewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        Loading gap analysis...
      </div>
    );
  }

  const { uncovered_requirements, orphan_test_cases, failing_requirements } = gaps;

  return (
    <div className="grid grid-cols-3 gap-4 p-6">
      {/* Uncovered Requirements */}
      <GapCard
        title="Uncovered Requirements"
        count={uncovered_requirements.length}
        countType="danger"
        icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
      >
        {uncovered_requirements.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            All requirements have test coverage
          </div>
        ) : (
          uncovered_requirements.map(req => {
            const typeConfig = TYPE_CONFIG[req.type];
            return (
              <GapItem
                key={req.id}
                icon={
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
                  >
                    {req.type.charAt(0).toUpperCase()}
                  </div>
                }
                itemKey={req.key}
                title={req.title}
              />
            );
          })
        )}
      </GapCard>

      {/* Orphan Test Cases */}
      <GapCard
        title="Orphan Test Cases"
        count={orphan_test_cases.length}
        countType="warning"
        icon={<FileQuestion className="w-4 h-4 text-amber-500" />}
      >
        {orphan_test_cases.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            All test cases are linked to requirements
          </div>
        ) : (
          orphan_test_cases.map(tc => (
            <GapItem
              key={tc.id}
              icon={
                <div className="w-7 h-7 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  TC
                </div>
              }
              itemKey={tc.key}
              title={tc.title}
            />
          ))
        )}
      </GapCard>

      {/* Failing Requirements */}
      <GapCard
        title="Failing Requirements"
        count={failing_requirements.length}
        countType="danger"
        icon={<XCircle className="w-4 h-4 text-red-500" />}
      >
        {failing_requirements.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No requirements with failing tests
          </div>
        ) : (
          failing_requirements.map(req => {
            const typeConfig = TYPE_CONFIG[req.type];
            return (
              <GapItem
                key={req.id}
                icon={
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
                  >
                    {req.type.charAt(0).toUpperCase()}
                  </div>
                }
                itemKey={req.key}
                title={`${req.title} (${req.failed_tests}/${req.total_tests} failed)`}
              />
            );
          })
        )}
      </GapCard>
    </div>
  );
}
