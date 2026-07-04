/**
 * Scenario Details Modal — Redesigned V2
 * Two variants: Baseline (no changes) vs Scenario with changes
 */

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Info, ArrowRight, Users, Calendar, Download } from '@/lib/atlaskit-icons';
import { formatCurrency } from '@/lib/currencyConfig';
import { format } from 'date-fns';

export interface ScenarioResource {
  resourceName: string;
  rid?: string;
  department: string;
  originalEnd: string;
  newEnd: string;
  extensionMonths: number;
  deltaCost: number;
}

export interface ScenarioBreakdown {
  insourced: number;
  cosourced: number;
  outsourced: number;
  licenses: number;
}

export interface ScenarioData {
  id: string;
  name: string;
  description?: string;
  type: 'preset' | 'custom';
  totalBudget: number;
  deltaFromBaseline: number;
  resourceCount: number;
  avgExtensionMonths: number;
  insourcedBudget: number;
  cosourcedBudget: number;
  outsourcedBudget: number;
  licensesBudget: number;
  scenarioData: ScenarioResource[];
}

interface ScenarioDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: ScenarioData | null;
  baselineBreakdown: ScenarioBreakdown;
  onCompare: () => void;
  onExport?: () => void;
}

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'MMM dd, yyyy');
  } catch {
    return dateStr;
  }
};

const CATEGORY_COLORS = {
  insourced: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  cosourced: 'var(--ds-text-success)',
  outsourced: 'var(--ds-text-warning)',
  licenses: 'var(--ds-text-discovery)',
} as const;

export function ScenarioDetailsModal({
  isOpen,
  onClose,
  scenario,
  baselineBreakdown,
  onCompare,
  onExport,
}: ScenarioDetailsModalProps) {
  if (!scenario) return null;

  const isBaseline = scenario.deltaFromBaseline === 0 && scenario.scenarioData.length === 0;
  const total = scenario.totalBudget;

  // Categories for baseline view with percentages
  const categories = [
    { 
      name: 'Insourced', 
      value: scenario.insourcedBudget, 
      color: CATEGORY_COLORS.insourced, 
      percent: total > 0 ? (scenario.insourcedBudget / total) * 100 : 0 
    },
    { 
      name: 'Outsourced', 
      value: scenario.outsourcedBudget, 
      color: CATEGORY_COLORS.outsourced, 
      percent: total > 0 ? (scenario.outsourcedBudget / total) * 100 : 0 
    },
    { 
      name: 'Cosourced', 
      value: scenario.cosourcedBudget, 
      color: CATEGORY_COLORS.cosourced, 
      percent: total > 0 ? (scenario.cosourcedBudget / total) * 100 : 0 
    },
    { 
      name: 'Licenses', 
      value: scenario.licensesBudget, 
      color: CATEGORY_COLORS.licenses, 
      percent: total > 0 ? (scenario.licensesBudget / total) * 100 : 0 
    },
  ].sort((a, b) => b.value - a.value);

  // Category breakdown for scenario with changes
  const categoryBreakdown = [
    { 
      key: 'insourced', 
      name: 'Insourced', 
      color: CATEGORY_COLORS.insourced,
      before: baselineBreakdown.insourced, 
      after: scenario.insourcedBudget,
      delta: scenario.insourcedBudget - baselineBreakdown.insourced
    },
    { 
      key: 'cosourced', 
      name: 'Cosourced', 
      color: CATEGORY_COLORS.cosourced,
      before: baselineBreakdown.cosourced, 
      after: scenario.cosourcedBudget,
      delta: scenario.cosourcedBudget - baselineBreakdown.cosourced
    },
    { 
      key: 'outsourced', 
      name: 'Outsourced', 
      color: CATEGORY_COLORS.outsourced,
      before: baselineBreakdown.outsourced, 
      after: scenario.outsourcedBudget,
      delta: scenario.outsourcedBudget - baselineBreakdown.outsourced
    },
    { 
      key: 'licenses', 
      name: 'Licenses', 
      color: CATEGORY_COLORS.licenses,
      before: baselineBreakdown.licenses, 
      after: scenario.licensesBudget,
      delta: scenario.licensesBudget - baselineBreakdown.licenses
    },
  ];

  // Baseline Modal Variant
  if (isBaseline) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-border pr-14">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{scenario.name}</h2>
              <p className="text-sm text-muted-foreground">{scenario.description || 'Current portfolio state'}</p>
            </div>
            {/* Close button provided by DialogContent */}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Total */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Current Portfolio
              </span>
              <span className="text-2xl font-bold font-mono text-foreground">
                {formatCurrency(total)}
              </span>
            </div>

            {/* Category Breakdown with Progress Bars */}
            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat.name}>
                  {/* Label + Value */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium" style={{ color: cat.color }}>
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {formatCurrency(cat.value)}
                      </span>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {cat.percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percent}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-muted/50 border border-border rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    This is the current state with no extensions applied.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a different scenario to see budget impact, or create a new scenario.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
            <Button variant="ghost" onClick={() => onClose()}>
              Close
            </Button>
            <Button onClick={onCompare} style={{ backgroundColor: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)' }}>
              Compare Scenarios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Scenario with Changes Modal Variant
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border pr-14">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">{scenario.name}</h2>
                <span
                  className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded"
                  style={{ backgroundColor: 'var(--ds-background-neutral-bold)', color: 'var(--ds-text-inverse)' }}
                >
                  {scenario.type}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{scenario.description || 'Scenario details'}</p>
            </div>
          </div>
          {/* Close button provided by DialogContent */}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 px-6 py-4 bg-muted/30 border-b border-border">
          {/* Baseline */}
          <div className="text-center">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Baseline
            </div>
            <div className="font-mono text-lg font-semibold text-muted-foreground">
              {formatCurrency(total - scenario.deltaFromBaseline)}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Projected */}
          <div className="text-center">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Projected
            </div>
            <div className="font-mono text-lg font-bold text-foreground">
              {formatCurrency(total)}
            </div>
          </div>

          {/* Delta */}
          <div className="text-center">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Delta
            </div>
            <div
              className="font-mono text-lg font-bold"
              style={{ color: scenario.deltaFromBaseline > 0 ? 'var(--ds-text-success)' : 'var(--ds-text-subtlest)' }}
            >
              {scenario.deltaFromBaseline > 0 ? '+' : ''}{formatCurrency(scenario.deltaFromBaseline)}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-center gap-8 px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: 'var(--ds-icon-brand)' }} />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold">{scenario.resourceCount}</span> resources extended
            </span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: 'var(--ds-icon-brand)' }} />
            <span className="text-sm text-muted-foreground">
              Avg <span className="font-semibold">{scenario.avgExtensionMonths.toFixed(0)}</span> months
            </span>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Budget Impact by Category */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Budget Impact by Category
            </h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Category</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Before</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase w-10"></th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">After</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {categoryBreakdown.map((cat) => (
                    <tr key={cat.key} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <span className="font-medium" style={{ color: cat.color }}>
                          {cat.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {formatCurrency(cat.before)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {cat.delta > 0 ? (
                          <ArrowRight className="w-4 h-4 mx-auto" style={{ color: 'var(--ds-icon-success)' }} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                        {formatCurrency(cat.after)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {cat.delta > 0 ? (
                          <span style={{ color: 'var(--ds-text-success)' }}>+{formatCurrency(cat.delta)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resources Extended */}
          {scenario.scenarioData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                Resources Extended ({scenario.scenarioData.length})
              </h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Resource</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Dept</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Current End</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase">Extension</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Cost Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {scenario.scenarioData.map((resource, idx) => (
                      <tr key={idx} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{resource.resourceName}</div>
                          {resource.rid && (
                            <div className="text-xs text-muted-foreground font-mono">{resource.rid}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {resource.department}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium font-mono text-xs" style={{ color: 'var(--ds-text-danger)' }}>
                            {formatDateDisplay(resource.originalEnd)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded"
                            style={{ backgroundColor: 'var(--ds-background-information)', color: 'var(--ds-text-information)' }}
                          >
                            +{resource.extensionMonths} mo
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono font-semibold" style={{ color: 'var(--ds-text-success)' }}>
                            +{formatCurrency(resource.deltaCost)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Total Row */}
                  <tfoot className="bg-muted">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold text-foreground">
                        Total Extension Cost:
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: 'var(--ds-text-success)' }}>
                        +{formatCurrency(scenario.deltaFromBaseline)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <Button 
            variant="ghost" 
            onClick={onExport}
            className="inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => onClose()}>
              Close
            </Button>
            <Button onClick={onCompare} style={{ backgroundColor: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)' }}>
              Compare Scenarios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
