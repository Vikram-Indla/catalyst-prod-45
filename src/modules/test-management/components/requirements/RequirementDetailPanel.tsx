// Requirement Detail Panel
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequirementWithCoverage, TYPE_CONFIG, STATUS_CONFIG, getCoverageColor, getCoverageColorClass } from '../../types/requirements';
import { RequirementTestLink } from '../../types/requirements';
import { LinkedTestCasesTable } from './LinkedTestCasesTable';

interface RequirementDetailPanelProps {
  requirement: RequirementWithCoverage;
  links: RequirementTestLink[];
  linksLoading: boolean;
  onUnlinkTestCase: (testCaseId: string) => void;
  onAddTestCases: () => void;
}

export function RequirementDetailPanel({
  requirement,
  links,
  linksLoading,
  onUnlinkTestCase,
  onAddTestCases,
}: RequirementDetailPanelProps) {
  const typeConfig = TYPE_CONFIG[requirement.type];
  const statusConfig = STATUS_CONFIG[requirement.status];
  
  // Calculate stats
  const linkedTests = links.length;
  const passedTests = links.filter(l => l.latest_execution?.status === 'passed').length;
  const failedTests = links.filter(l => l.latest_execution?.status === 'failed').length;
  const passRate = linkedTests > 0 ? Math.round((passedTests / linkedTests) * 100) : 0;
  const coverageLevel = getCoverageColor(requirement.coverage_percentage);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b bg-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-xs font-semibold text-muted-foreground font-mono mb-1">
              {requirement.requirement_key}
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">{requirement.title}</h2>
            <div className="flex items-center gap-4">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
              >
                {typeConfig.label}
              </span>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
              >
                {statusConfig.label}
              </span>
              {requirement.owner && (
                <span className="text-xs text-muted-foreground">
                  Owner: {requirement.owner.full_name}
                </span>
              )}
            </div>
          </div>
          
          {requirement.external_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={requirement.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1" />
                View in Jira
              </a>
            </Button>
          )}
        </div>

        {/* Coverage Summary */}
        <div className="flex gap-6 mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex flex-col items-center gap-1 px-4">
            <span className={`text-2xl font-bold ${getCoverageColorClass(coverageLevel)}`}>
              {requirement.coverage_percentage}%
            </span>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Test Coverage</span>
          </div>
          <div className="w-px bg-border" />
          <div className="flex flex-col items-center gap-1 px-4">
            <span className="text-2xl font-bold text-foreground">{linkedTests}</span>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Linked Tests</span>
          </div>
          <div className="w-px bg-border" />
          <div className="flex flex-col items-center gap-1 px-4">
            <span className={`text-2xl font-bold ${getCoverageColorClass(getCoverageColor(passRate))}`}>
              {passRate}%
            </span>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Pass Rate</span>
          </div>
          <div className="w-px bg-border" />
          <div className="flex flex-col items-center gap-1 px-4">
            <span className="text-2xl font-bold text-destructive">{failedTests}</span>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Open Defects</span>
          </div>
        </div>
      </div>

      {/* Linked Test Cases */}
      <LinkedTestCasesTable
        links={links}
        onUnlink={onUnlinkTestCase}
        onAddClick={onAddTestCases}
        isLoading={linksLoading}
      />
    </div>
  );
}
