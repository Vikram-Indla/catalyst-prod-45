/**
 * Budget Scenario Planning Tab - V8 Design
 * Complete implementation with:
 * - Department filter chips
 * - Budget impact cards with live delta
 * - Scenario list (presets + custom)
 * - Resource table with extension dropdowns
 * - 4-step create wizard
 * - View details and compare modals
 */

import { useState, useMemo, useEffect, memo } from 'react';
import { Plus, GitBranch, GitCompare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, type BudgetPeriod, type BudgetResource, type DepartmentBudget } from '@/hooks/budget/useBudgetData';
import {
  useBudgetScenarios,
  generatePresetScenarios,
  type BudgetScenario,
  type BaselineBudget,
} from '@/hooks/budget/useBudgetScenarios';
import { Button } from '@/components/ui/button';
import { ScenarioDetailsModal } from './ScenarioDetailsModal';
import { ScenarioWizardModal } from './ScenarioWizardModal';
import { ScenarioCompareModal } from './ScenarioCompareModal';
import { ScenarioDetailPanel } from './ScenarioDetailPanel';

interface BudgetScenarioTabProps {
  data: {
    resources: BudgetResource[];
    departments: Record<string, DepartmentBudget>;
    licenseBudget: number;
  } | null;
  period: BudgetPeriod;
  presetToLoad?: string; // Optional preset ID to auto-load
  onPeriodChange?: (period: BudgetPeriod) => void; // Callback to change period
}

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'Q1', label: 'Q1' },
  { value: 'H1', label: 'H1' },
  { value: 'Full', label: 'Full Year' },
];

// DS-2 FIX: Use canonical 'Technical Support' value (matching database), but display as 'Tech Support'
const DEPARTMENT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'Delivery', label: 'Delivery' },
  { value: 'Product', label: 'Product' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Technical Support', label: 'Tech Support' },
  { value: 'Governance', label: 'Governance' },
];

export const BudgetScenarioTab = memo(function BudgetScenarioTab({ data, period, onPeriodChange }: BudgetScenarioTabProps) {
  const { data: savedScenarios = [], isLoading } = useBudgetScenarios();

  // State
  const [selectedScenario, setSelectedScenario] = useState<BudgetScenario | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // Detail panel editing state
  const [detailExtensions, setDetailExtensions] = useState<Record<string, number>>({});
  const [detailSelectedResources, setDetailSelectedResources] = useState<Set<string>>(new Set());

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading scenario data...
      </div>
    );
  }

  // Generate baseline budget
  const baselineBudget: BaselineBudget = useMemo(() => {
    const allBudget = data.departments.all || { insourced: 0, cosourced: 0, outsourced: 0, licenses: 0, total: 0 };
    return {
      insourced: allBudget.insourced,
      cosourced: allBudget.cosourced,
      outsourced: allBudget.outsourced,
      licenses: allBudget.licenses,
      total: allBudget.total,
    };
  }, [data.departments]);

  // Get insourced resources (Variable/Freelance only)
  const insourcedResources = useMemo(() => {
    return data.resources.filter(r =>
      r.resourceType?.toLowerCase() === 'variable' ||
      r.resourceType?.toLowerCase() === 'freelance'
    );
  }, [data.resources]);

  // Generate preset scenarios from live data
  const presetScenarios = useMemo(() =>
    generatePresetScenarios(data.resources, baselineBudget),
    [data.resources, baselineBudget]
  );

  // All scenarios (presets + saved)
  const allScenarios: BudgetScenario[] = useMemo(() => {
    const presetsAsScenarios: BudgetScenario[] = presetScenarios.map((p, i) => ({
      ...p,
      id: `preset-${i}`,
      createdAt: new Date().toISOString(),
      createdBy: null,
      updatedAt: new Date().toISOString(),
    }));
    return [...presetsAsScenarios, ...savedScenarios];
  }, [presetScenarios, savedScenarios]);

  // SCEN-5 FIX: Auto-select baseline on load using useEffect (not useMemo with side effect)
  useEffect(() => {
    if (!selectedScenario && allScenarios.length > 0) {
      setSelectedScenario(allScenarios[0]);
    }
  }, [allScenarios.length]); // Only run when scenario count changes

  // Filter resources by department for detail panel
  const filteredDetailResources = useMemo(() => {
    let resources = insourcedResources;
    if (deptFilter !== 'all') {
      resources = resources.filter(r => r.department === deptFilter);
    }
    return resources.sort((a, b) => {
      // Sort by contract end date, soonest first
      if (!a.contractEnd) return 1;
      if (!b.contractEnd) return -1;
      return new Date(a.contractEnd).getTime() - new Date(b.contractEnd).getTime();
    });
  }, [insourcedResources, deptFilter]);

  // Calculate current detail panel totals
  const detailTotals = useMemo(() => {
    let totalDelta = 0;
    let resourceCount = 0;

    Object.entries(detailExtensions).forEach(([id, months]) => {
      if (months > 0) {
        const resource = data.resources.find(r => r.id === id);
        if (resource) {
          totalDelta += (resource.ctc || 0) * months;
          resourceCount++;
        }
      }
    });

    return { totalDelta, resourceCount };
  }, [detailExtensions, data.resources]);

  // Calculate budget impact with current scenario + any edits
  const currentBudgetImpact = useMemo(() => {
    const scenarioDelta = selectedScenario?.deltaFromBaseline || 0;
    const editDelta = detailTotals.totalDelta;

    // Filter by department if needed
    let insourced = baselineBudget.insourced;
    let cosourced = baselineBudget.cosourced;
    let outsourced = baselineBudget.outsourced;
    let licenses = baselineBudget.licenses;

    if (deptFilter !== 'all') {
      const deptBudget = data.departments[deptFilter];
      if (deptBudget) {
        insourced = deptBudget.insourced;
        cosourced = deptBudget.cosourced;
        outsourced = deptBudget.outsourced;
        licenses = deptBudget.licenses;
      }
    }

    // Calculate scenario delta for this department
    let deptScenarioDelta = scenarioDelta;
    if (deptFilter !== 'all' && selectedScenario) {
      deptScenarioDelta = selectedScenario.scenarioData
        .filter(e => e.department === deptFilter)
        .reduce((sum, e) => sum + e.deltaCost, 0);
    }

    // Calculate edit delta for this department
    let deptEditDelta = 0;
    if (deptFilter !== 'all') {
      Object.entries(detailExtensions).forEach(([id, months]) => {
        if (months > 0) {
          const resource = data.resources.find(r => r.id === id);
          if (resource && resource.department === deptFilter) {
            deptEditDelta += (resource.ctc || 0) * months;
          }
        }
      });
    } else {
      deptEditDelta = editDelta;
    }

    const total = insourced + cosourced + outsourced + licenses + deptScenarioDelta + deptEditDelta;

    return {
      total,
      insourced: insourced + deptScenarioDelta + deptEditDelta,
      cosourced,
      outsourced,
      licenses,
      delta: deptScenarioDelta + deptEditDelta,
      insourcedDelta: deptScenarioDelta + deptEditDelta,
    };
  }, [baselineBudget, selectedScenario, detailTotals, deptFilter, data.departments, data.resources, detailExtensions]);

  // Handlers
  const handleSelectScenario = (scenario: BudgetScenario) => {
    setSelectedScenario(scenario);
    // Pre-populate detail extensions from scenario data
    const ext: Record<string, number> = {};
    scenario.scenarioData.forEach(e => {
      ext[e.resourceId] = e.extensionMonths;
    });
    setDetailExtensions(ext);
    setDetailSelectedResources(new Set(scenario.scenarioData.map(e => e.resourceId)));
  };

  const resetDetailEdits = () => {
    if (selectedScenario) {
      const ext: Record<string, number> = {};
      selectedScenario.scenarioData.forEach(e => {
        ext[e.resourceId] = e.extensionMonths;
      });
      setDetailExtensions(ext);
      setDetailSelectedResources(new Set(selectedScenario.scenarioData.map(e => e.resourceId)));
    } else {
      setDetailExtensions({});
      setDetailSelectedResources(new Set());
    }
  };

  const departments = ['all', ...Object.keys(data.departments).filter(k => k !== 'all')];

  return (
    <div className="space-y-6">
      {/* Period Toggle */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => onPeriodChange?.(p.value)}
              className={cn(
                'px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150',
                period === p.value
                  ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider">Budget Impact</h3>
          <div className="flex gap-1">
            {DEPARTMENT_FILTERS.map(d => (
              <button
                key={d.value}
                onClick={() => setDeptFilter(d.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full transition-all",
                  deptFilter === d.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Total */}
          <div className="bg-muted/50 rounded-xl p-4 text-center border-t-4 border-slate-500">
            <div className="text-xs text-muted-foreground mb-1 uppercase font-medium">Total</div>
            <div className="font-mono text-2xl font-bold text-foreground">{formatCurrency(currentBudgetImpact.total)}</div>
            {currentBudgetImpact.delta !== 0 ? (
              <div className={cn(
                "text-sm font-mono font-semibold mt-1",
                currentBudgetImpact.delta > 0 ? "text-green-600" : "text-red-600"
              )}>
                {currentBudgetImpact.delta > 0 ? '+' : ''}{formatCurrency(currentBudgetImpact.delta)}
              </div>
            ) : (
              // SCEN-1 FIX: Show em-dash instead of +0 for zero deltas
              <div className="text-sm font-mono font-medium text-slate-500 dark:text-slate-400 mt-1">—</div>
            )}
          </div>

          {/* Insourced */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 text-center border-t-4 border-blue-500">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1 uppercase font-medium">Insourced</div>
            <div className="font-mono text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(currentBudgetImpact.insourced)}</div>
            {currentBudgetImpact.insourcedDelta !== 0 ? (
              <div className="text-sm font-mono font-semibold text-green-600 mt-1">
                +{formatCurrency(currentBudgetImpact.insourcedDelta)}
              </div>
            ) : (
              <div className="text-sm font-mono font-medium text-slate-500 dark:text-slate-400 mt-1">—</div>
            )}
          </div>

          {/* Cosourced */}
          <div className="bg-teal-50 dark:bg-teal-950/30 rounded-xl p-4 text-center border-t-4 border-teal-500">
            <div className="text-xs text-teal-600 dark:text-teal-400 mb-1 uppercase font-medium">Cosourced</div>
            <div className="font-mono text-2xl font-bold text-teal-700 dark:text-teal-300">{formatCurrency(currentBudgetImpact.cosourced)}</div>
            <div className="text-sm font-mono font-medium text-slate-500 dark:text-slate-400 mt-1">—</div>
          </div>

          {/* Outsourced */}
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 text-center border-t-4 border-amber-500">
            <div className="text-xs text-amber-600 dark:text-amber-400 mb-1 uppercase font-medium">Outsourced</div>
            <div className="font-mono text-2xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(currentBudgetImpact.outsourced)}</div>
            <div className="text-sm font-mono font-medium text-slate-500 dark:text-slate-400 mt-1">—</div>
          </div>

          {/* Licenses */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 text-center border-t-4 border-blue-500">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1 uppercase font-medium">Licenses</div>
            <div className="font-mono text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(currentBudgetImpact.licenses)}</div>
            <div className="text-sm font-mono font-medium text-slate-500 dark:text-slate-400 mt-1">—</div>
          </div>
        </div>
      </div>

      {/* Main Layout: Scenario List + Detail Panel */}
      <div className="grid grid-cols-[300px_1fr] gap-6">
        {/* Left: Scenario List - V8 WCAG AA Compliant */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/50">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Scenarios</h3>
          </div>

          {/* Preset Scenarios */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {allScenarios.filter(s => s.type === 'preset').map((scenario) => {
              const isActive = selectedScenario?.id === scenario.id;
              const deltaType = scenario.deltaFromBaseline > 0 ? 'positive' : scenario.deltaFromBaseline < 0 ? 'negative' : 'neutral';

              return (
                <div
                  key={scenario.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectScenario(scenario)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectScenario(scenario)}
                  className={cn(
                    // Base styles
                    "flex flex-col gap-1 p-3 cursor-pointer transition-all duration-150",
                    "border-l-4 border-b border-b-slate-100 dark:border-b-slate-800",
                    // Active state
                    isActive ? [
                      "bg-blue-50 dark:bg-blue-950/40 border-l-blue-600",
                      "shadow-[inset_0_0_0_1px_rgba(37,99,235,0.1),0_1px_3px_rgba(0,0,0,0.06)]"
                    ] : [
                      // Inactive state
                      "bg-white dark:bg-slate-900 border-l-transparent",
                      // Hover state
                      "hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-l-slate-300 dark:hover:border-l-slate-600 hover:shadow-sm"
                    ],
                    // Focus state
                    "focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-[-2px]"
                  )}
                >
                  {/* Header: Icon + Name + Badge */}
                  <div className="flex items-center gap-2">
                    <GitBranch className={cn(
                      "w-3.5 h-3.5 flex-shrink-0",
                      isActive ? "text-blue-600" : "text-slate-500 dark:text-slate-400"
                    )} />
                    <span className={cn(
                      "text-sm font-semibold flex-1 truncate",
                      isActive ? "text-blue-800 dark:text-blue-200" : "text-slate-800 dark:text-slate-100"
                    )}>
                      {scenario.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded flex-shrink-0 bg-slate-700 dark:bg-slate-600 text-white">
                      Preset
                    </span>
                  </div>

                  {/* Description - with tooltip on hover */}
                  <p
                    className="text-xs text-slate-500 dark:text-slate-400 truncate pl-5 max-w-[200px]"
                    title={scenario.description}
                  >
                    {scenario.description}
                  </p>

                  {/* Footer: Total + Delta */}
                  <div className="flex items-baseline justify-between mt-1 pl-5">
                    <span className="font-mono text-[15px] font-semibold text-slate-700 dark:text-slate-200">
                      {formatCurrency(scenario.totalBudget)}
                    </span>
                    <span className={cn(
                      "font-mono text-[13px] font-semibold",
                      deltaType === 'positive' && "text-green-600 dark:text-green-400",
                      deltaType === 'negative' && "text-red-600 dark:text-red-400",
                      deltaType === 'neutral' && "text-slate-400 dark:text-slate-500"
                    )}>
                      {scenario.deltaFromBaseline > 0 ? `+${formatCurrency(scenario.deltaFromBaseline)}` :
                       scenario.deltaFromBaseline < 0 ? formatCurrency(scenario.deltaFromBaseline) : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Scenarios Divider */}
          {savedScenarios.length > 0 && (
            <div className="px-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Custom Scenarios</span>
            </div>
          )}

          {/* Custom Scenarios */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[200px] overflow-auto">
            {allScenarios.filter(s => s.type === 'custom').map((scenario) => {
              const isActive = selectedScenario?.id === scenario.id;
              const deltaType = scenario.deltaFromBaseline > 0 ? 'positive' : scenario.deltaFromBaseline < 0 ? 'negative' : 'neutral';

              return (
                <div
                  key={scenario.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectScenario(scenario)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectScenario(scenario)}
                  className={cn(
                    // Base styles
                    "flex flex-col gap-1 p-3 cursor-pointer transition-all duration-150",
                    "border-l-4 border-b border-b-slate-100 dark:border-b-slate-800",
                    // Active state
                    isActive ? [
                      "bg-blue-50 dark:bg-blue-950/40 border-l-blue-600",
                      "shadow-[inset_0_0_0_1px_rgba(37,99,235,0.1),0_1px_3px_rgba(0,0,0,0.06)]"
                    ] : [
                      // Inactive state
                      "bg-white dark:bg-slate-900 border-l-transparent",
                      // Hover state
                      "hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-l-slate-300 dark:hover:border-l-slate-600 hover:shadow-sm"
                    ],
                    // Focus state
                    "focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-[-2px]"
                  )}
                >
                  {/* Header: Dot + Name + Badge */}
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full flex-shrink-0",
                      isActive ? "bg-blue-600" : "bg-blue-500"
                    )} />
                    <span className={cn(
                      "text-sm font-semibold flex-1 truncate",
                      isActive ? "text-blue-800 dark:text-blue-200" : "text-slate-800 dark:text-slate-100"
                    )}>
                      {scenario.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded flex-shrink-0 bg-blue-600 dark:bg-blue-700 text-white">
                      Custom
                    </span>
                  </div>

                  {/* Description */}
                  <p
                    className="text-xs text-slate-500 dark:text-slate-400 truncate pl-5 max-w-[200px]"
                    title={`${scenario.resourceCount} resources · ${scenario.avgExtensionMonths.toFixed(0)}mo avg`}
                  >
                    {scenario.resourceCount} resources · {scenario.avgExtensionMonths.toFixed(0)}mo avg
                  </p>

                  {/* Footer: Total + Delta */}
                  <div className="flex items-baseline justify-between mt-1 pl-5">
                    <span className="font-mono text-[15px] font-semibold text-slate-700 dark:text-slate-200">
                      {formatCurrency(scenario.totalBudget)}
                    </span>
                    <span className={cn(
                      "font-mono text-[13px] font-semibold",
                      deltaType === 'positive' && "text-green-600 dark:text-green-400",
                      deltaType === 'negative' && "text-red-600 dark:text-red-400",
                      deltaType === 'neutral' && "text-slate-400 dark:text-slate-500"
                    )}>
                      {scenario.deltaFromBaseline > 0 ? `+${formatCurrency(scenario.deltaFromBaseline)}` :
                       scenario.deltaFromBaseline < 0 ? formatCurrency(scenario.deltaFromBaseline) : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <Button
              onClick={() => setWizardOpen(true)}
              className="w-full bg-primary hover:bg-primary/90"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Scenario
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setCompareModalOpen(true)}
            >
              <GitCompare className="w-4 h-4 mr-2" />
              Compare Scenarios
            </Button>
          </div>
        </div>

        {/* Right: Scenario Detail Panel */}
        <ScenarioDetailPanel
          selectedScenario={selectedScenario}
          filteredDetailResources={filteredDetailResources}
          allResources={data.resources}
          baselineBudget={baselineBudget}
          detailExtensions={detailExtensions}
          setDetailExtensions={setDetailExtensions}
          detailSelectedResources={detailSelectedResources}
          setDetailSelectedResources={setDetailSelectedResources}
          onViewDetails={() => setViewModalOpen(true)}
          onResetEdits={resetDetailEdits}
        />
      </div>

      {/* Create Wizard Modal */}
      <ScenarioWizardModal
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        insourcedResources={insourcedResources}
        allResources={data.resources}
        baselineBudget={baselineBudget}
        departments={departments}
      />

      {/* View Scenario Modal — Redesigned V2 */}
      <ScenarioDetailsModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        scenario={selectedScenario ? {
          id: selectedScenario.id,
          name: selectedScenario.name,
          description: selectedScenario.description || '',
          type: selectedScenario.type,
          totalBudget: selectedScenario.totalBudget,
          deltaFromBaseline: selectedScenario.deltaFromBaseline,
          resourceCount: selectedScenario.resourceCount,
          avgExtensionMonths: selectedScenario.avgExtensionMonths,
          insourcedBudget: selectedScenario.insourcedBudget,
          cosourcedBudget: selectedScenario.cosourcedBudget,
          outsourcedBudget: selectedScenario.outsourcedBudget,
          licensesBudget: selectedScenario.licensesBudget,
          scenarioData: selectedScenario.scenarioData.map(ext => ({
            resourceName: ext.resourceName,
            rid: ext.rid,
            department: ext.department,
            originalEnd: ext.originalEnd,
            newEnd: ext.newEnd,
            extensionMonths: ext.extensionMonths,
            deltaCost: ext.deltaCost,
          })),
        } : null}
        baselineBreakdown={baselineBudget}
        onCompare={() => {
          setViewModalOpen(false);
          setCompareModalOpen(true);
        }}
        onExport={() => {
          // Export scenario data as CSV
          if (!selectedScenario) return;
          const rows = [
            ['Resource', 'Department', 'Original End', 'Extension (mo)', 'New End', 'Delta Cost'],
            ...selectedScenario.scenarioData.map(ext => [
              ext.resourceName,
              ext.department,
              ext.originalEnd,
              ext.extensionMonths.toString(),
              ext.newEnd,
              ext.deltaCost.toString(),
            ])
          ];
          const csv = rows.map(r => r.join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${selectedScenario.name.replace(/\s+/g, '_')}_scenario.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }}
      />

      {/* Compare Modal */}
      <ScenarioCompareModal
        open={compareModalOpen}
        onOpenChange={setCompareModalOpen}
        allScenarios={allScenarios}
      />
    </div>
  );
});
