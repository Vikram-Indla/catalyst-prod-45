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

import { useState, useMemo, useEffect, Fragment } from 'react';
import { Plus, GitBranch, Eye, GitCompare, Trash2, Check, ChevronRight, RefreshCw, Save, ArrowRight, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, type BudgetPeriod, type BudgetResource, type DepartmentBudget } from '@/hooks/budget/useBudgetData';
import { 
  useBudgetScenarios, 
  useCreateScenario, 
  useDeleteScenario,
  generatePresetScenarios,
  type BudgetScenario,
  type ScenarioExtension,
  type BaselineBudget,
} from '@/hooks/budget/useBudgetScenarios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScenarioDetailsModal, type ScenarioData, type ScenarioBreakdown } from './ScenarioDetailsModal';

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

type WizardStep = 1 | 2 | 3 | 4;

const EXTENSION_OPTIONS = [
  { value: 0, label: 'No change' },
  { value: 1, label: '+1 month' },
  { value: 2, label: '+2 months' },
  { value: 3, label: '+3 months' },
  { value: 4, label: '+4 months' },
  { value: 5, label: '+5 months' },
  { value: 6, label: '+6 months' },
  { value: 7, label: '+7 months' },
  { value: 8, label: '+8 months' },
  { value: 9, label: '+9 months' },
  { value: 10, label: '+10 months' },
  { value: 11, label: '+11 months' },
  { value: 12, label: '+12 months' },
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

// Contract end date styling
function getContractDateClass(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'text-red-600 font-semibold';
  if (diffDays <= 60) return 'text-red-600 font-semibold';
  if (diffDays <= 90) return 'text-amber-600 font-medium';
  return 'text-foreground';
}

// Format date for display
function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function BudgetScenarioTab({ data, period, onPeriodChange }: BudgetScenarioTabProps) {
  const { data: savedScenarios = [], isLoading } = useBudgetScenarios();
  const createScenario = useCreateScenario();
  const deleteScenario = useDeleteScenario();

  // State
  const [selectedScenario, setSelectedScenario] = useState<BudgetScenario | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareSelection, setCompareSelection] = useState<Set<string>>(new Set());
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveScenarioName, setSaveScenarioName] = useState('');
  
  // UX-2 FIX: Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Detail panel editing state
  const [detailExtensions, setDetailExtensions] = useState<Record<string, number>>({});
  const [detailSelectedResources, setDetailSelectedResources] = useState<Set<string>>(new Set());
  
  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizardName, setWizardName] = useState('');
  const [wizardDeptFilter, setWizardDeptFilter] = useState<string>('all');
  const [wizardExpiryFilter, setWizardExpiryFilter] = useState<string>('all');
  const [wizardCustomDate, setWizardCustomDate] = useState<string>('');
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [resourceExtensions, setResourceExtensions] = useState<Record<string, number>>({});

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
    const totalDelta = scenarioDelta + editDelta;
    
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

  // Filter resources for wizard
  const filteredWizardResources = useMemo(() => {
    let resources = insourcedResources;

    if (wizardDeptFilter !== 'all') {
      resources = resources.filter(r => r.department === wizardDeptFilter);
    }

    if (wizardExpiryFilter === 'q1') {
      resources = resources.filter(r => {
        if (!r.contractEnd) return false;
        return new Date(r.contractEnd) <= new Date(2026, 2, 31);
      });
    } else if (wizardExpiryFilter === 'q2') {
      resources = resources.filter(r => {
        if (!r.contractEnd) return false;
        return new Date(r.contractEnd) <= new Date(2026, 5, 30);
      });
    } else if (wizardExpiryFilter === 'h2') {
      resources = resources.filter(r => {
        if (!r.contractEnd) return false;
        const d = new Date(r.contractEnd);
        return d >= new Date(2026, 6, 1) && d <= new Date(2026, 11, 31);
      });
    } else if (wizardExpiryFilter === 'custom' && wizardCustomDate) {
      resources = resources.filter(r => {
        if (!r.contractEnd) return false;
        return new Date(r.contractEnd) <= new Date(wizardCustomDate);
      });
    }

    return resources.sort((a, b) => {
      if (!a.contractEnd) return 1;
      if (!b.contractEnd) return -1;
      return new Date(a.contractEnd).getTime() - new Date(b.contractEnd).getTime();
    });
  }, [insourcedResources, wizardDeptFilter, wizardExpiryFilter, wizardCustomDate]);

  // Calculate wizard totals
  const wizardTotals = useMemo(() => {
    let totalDelta = 0;
    const extensions: ScenarioExtension[] = [];

    selectedResources.forEach(id => {
      const resource = data.resources.find(r => r.id === id);
      if (!resource) return;

      const months = resourceExtensions[id] || 0;
      if (months === 0) return;

      const delta = (resource.ctc || 0) * months;
      totalDelta += delta;

      const originalEnd = resource.contractEnd ? new Date(resource.contractEnd) : new Date();
      const newEnd = new Date(originalEnd);
      newEnd.setMonth(newEnd.getMonth() + months);

      extensions.push({
        resourceId: resource.id,
        resourceName: resource.name,
        department: resource.department,
        originalEnd: resource.contractEnd,
        extensionMonths: months,
        newEnd: newEnd.toISOString().split('T')[0],
        deltaCost: delta,
        monthlyCTC: resource.ctc || 0,
        rid: resource.rid,
        role: resource.role,
        resourceType: resource.resourceType,
        vendorName: resource.vendorName || null,
      });
    });

    return {
      extensions,
      totalDelta,
      newTotal: baselineBudget.total + totalDelta,
      resourceCount: extensions.filter(e => e.extensionMonths > 0).length,
    };
  }, [selectedResources, resourceExtensions, data.resources, baselineBudget]);

  // Handlers
  const resetWizard = () => {
    setWizardStep(1);
    setWizardName('');
    setWizardDeptFilter('all');
    setWizardExpiryFilter('all');
    setWizardCustomDate('');
    setSelectedResources(new Set());
    setResourceExtensions({});
  };

  const openWizard = () => {
    resetWizard();
    setWizardOpen(true);
  };

  const handleSaveWizardScenario = async () => {
    if (!wizardName.trim()) return;

    await createScenario.mutateAsync({
      name: wizardName,
      extensions: wizardTotals.extensions.filter(e => e.extensionMonths > 0),
      filterDepartment: wizardDeptFilter !== 'all' ? wizardDeptFilter : undefined,
      filterExpiryStart: undefined,
      filterExpiryEnd: wizardExpiryFilter === 'custom' ? wizardCustomDate : undefined,
      baselineBudget,
    });

    setWizardOpen(false);
    resetWizard();
  };

  const handleSaveDetailScenario = async () => {
    if (!saveScenarioName.trim() || detailTotals.resourceCount === 0) return;
    
    const extensions: ScenarioExtension[] = [];
    Object.entries(detailExtensions).forEach(([id, months]) => {
      if (months > 0) {
        const resource = data.resources.find(r => r.id === id);
        if (resource) {
          const originalEnd = resource.contractEnd ? new Date(resource.contractEnd) : new Date();
          const newEnd = new Date(originalEnd);
          newEnd.setMonth(newEnd.getMonth() + months);
          
          extensions.push({
            resourceId: resource.id,
            resourceName: resource.name,
            department: resource.department,
            originalEnd: resource.contractEnd,
            extensionMonths: months,
            newEnd: newEnd.toISOString().split('T')[0],
            deltaCost: (resource.ctc || 0) * months,
            monthlyCTC: resource.ctc || 0,
            rid: resource.rid,
            role: resource.role,
            resourceType: resource.resourceType,
            vendorName: resource.vendorName || null,
          });
        }
      }
    });
    
    await createScenario.mutateAsync({
      name: saveScenarioName,
      extensions,
      baselineBudget,
    });
    
    setSaveModalOpen(false);
    setSaveScenarioName('');
    resetDetailEdits();
  };

  const toggleWizardSelectAll = () => {
    if (selectedResources.size === filteredWizardResources.length) {
      setSelectedResources(new Set());
    } else {
      setSelectedResources(new Set(filteredWizardResources.map(r => r.id)));
    }
  };

  const applyExtensionToAll = (months: number) => {
    const newExtensions: Record<string, number> = {};
    selectedResources.forEach(id => {
      newExtensions[id] = months;
    });
    setResourceExtensions(newExtensions);
  };

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

  const toggleDetailSelectAll = () => {
    if (detailSelectedResources.size === filteredDetailResources.length) {
      setDetailSelectedResources(new Set());
    } else {
      setDetailSelectedResources(new Set(filteredDetailResources.map(r => r.id)));
    }
  };

  const handleCompare = () => {
    if (compareSelection.size < 2) return;
    setCompareModalOpen(true);
  };

  const compareScenariosList = useMemo(() => {
    return allScenarios.filter(s => compareSelection.has(s.id));
  }, [allScenarios, compareSelection]);

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
          <div className="bg-violet-50 dark:bg-violet-950/30 rounded-xl p-4 text-center border-t-4 border-violet-500">
            <div className="text-xs text-violet-600 dark:text-violet-400 mb-1 uppercase font-medium">Licenses</div>
            <div className="font-mono text-2xl font-bold text-violet-700 dark:text-violet-300">{formatCurrency(currentBudgetImpact.licenses)}</div>
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
              onClick={openWizard}
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
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {selectedScenario ? (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                <div>
                  <h3 className="font-bold text-lg text-foreground">{selectedScenario.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedScenario.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Reset */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetDetailEdits}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reset
                  </Button>
                  
                  {/* View Details */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setViewModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
                  
                  {/* Save Scenario — PRIMARY CTA (always visible) */}
                  <Button 
                    size="sm" 
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setSaveModalOpen(true)}
                    disabled={detailTotals.resourceCount === 0}
                  >
                    <Save className="w-4 h-4" />
                    Save Scenario
                  </Button>
                  
                  {/* Delete (custom scenarios only) */}
                  {selectedScenario.type === 'custom' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Resource Table */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={detailSelectedResources.size === filteredDetailResources.length && filteredDetailResources.length > 0}
                      onCheckedChange={toggleDetailSelectAll}
                    />
                    <span className="text-sm font-medium text-foreground">
                      Select All ({filteredDetailResources.length} resources)
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {detailSelectedResources.size} selected
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-[400px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left w-10"></th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[180px]">Resource</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[100px]">Dept</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[80px]">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[90px]">Vendor</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[110px]">Contract End</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground min-w-[100px]">Monthly CTC</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground min-w-[140px]">Extension</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground min-w-[90px]">Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredDetailResources.map(r => {
                          const months = detailExtensions[r.id] || 0;
                          const delta = (r.ctc || 0) * months;
                          const isSelected = detailSelectedResources.has(r.id);
                          
                          return (
                            <tr 
                              key={r.id} 
                              className={cn(
                                "hover:bg-muted/30 cursor-pointer transition-colors",
                                isSelected && "bg-primary/5"
                              )}
                              onClick={() => {
                                const newSet = new Set(detailSelectedResources);
                                if (newSet.has(r.id)) {
                                  newSet.delete(r.id);
                                } else {
                                  newSet.add(r.id);
                                }
                                setDetailSelectedResources(newSet);
                              }}
                            >
                              <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                <Checkbox 
                                  checked={isSelected}
                                  onCheckedChange={() => {
                                    const newSet = new Set(detailSelectedResources);
                                    if (newSet.has(r.id)) {
                                      newSet.delete(r.id);
                                    } else {
                                      newSet.add(r.id);
                                    }
                                    setDetailSelectedResources(newSet);
                                  }}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="font-medium text-foreground">{r.name}</div>
                                <div className="text-xs text-muted-foreground">RID: {r.rid}</div>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{r.department}</td>
                              <td className="px-3 py-2">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 text-xs",
                                  r.resourceType === 'Variable' ? "text-blue-600" : "text-purple-600"
                                )}>
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    r.resourceType === 'Variable' ? "bg-blue-500" : "bg-purple-500"
                                  )} />
                                  {r.resourceType}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{r.vendorName || '—'}</td>
                              <td className="px-3 py-2">
                                <span className={cn("font-mono text-xs", getContractDateClass(r.contractEnd))}>
                                  {formatDateDisplay(r.contractEnd)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-foreground">
                                {r.ctc ? formatCurrency(r.ctc) : '—'}
                              </td>
                              <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                <Select 
                                  value={String(months)} 
                                  onValueChange={(v) => {
                                    setDetailExtensions(prev => ({...prev, [r.id]: parseInt(v)}));
                                    if (parseInt(v) > 0) {
                                      setDetailSelectedResources(prev => new Set(prev).add(r.id));
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 w-[130px] text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {EXTENSION_OPTIONS.map(opt => (
                                      <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {months > 0 ? (
                                  <span className="font-semibold text-green-600">+{formatCurrency(delta)}</span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Summary */}
                <div className="mt-4 flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Selected: <strong className="text-foreground">{detailSelectedResources.size}</strong> resources · 
                    Total Extension: <strong className={cn(
                      "font-mono",
                      detailTotals.totalDelta > 0 ? "text-green-600" : "text-slate-400 dark:text-slate-500"
                    )}>
                      {detailTotals.totalDelta > 0 ? '+' : ''}{formatCurrency(detailTotals.totalDelta)} SAR
                    </strong>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <GitBranch className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Select a Scenario</h3>
              <p className="text-muted-foreground max-w-sm">
                Choose a scenario from the list to view details, or create a new custom scenario.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Wizard Modal */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Custom Scenario</DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-lg mb-4">
            {[1, 2, 3, 4].map((step) => (
              <Fragment key={step}>
                <div className={cn(
                  "flex items-center gap-2",
                  step <= wizardStep ? "text-primary" : "text-muted-foreground"
                )}>
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    step < wizardStep ? "bg-primary text-primary-foreground" :
                    step === wizardStep ? "bg-primary/20 text-primary ring-2 ring-primary" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {step < wizardStep ? <Check className="w-3 h-3" /> : step}
                  </div>
                  <span className="text-sm font-medium">
                    {step === 1 ? 'Name & Filter' : step === 2 ? 'Select Resources' : step === 3 ? 'Set Extensions' : 'Review'}
                  </span>
                </div>
                {step < 4 && <div className={cn("flex-1 h-0.5", step < wizardStep ? "bg-primary" : "bg-muted")} />}
              </Fragment>
            ))}
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-auto min-h-0">
            {wizardStep === 1 && (
              <div className="p-4 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Scenario Name *</label>
                  <Input 
                    value={wizardName}
                    onChange={(e) => setWizardName(e.target.value)}
                    placeholder="e.g., Q2 Critical Extension"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Filter by Department</label>
                    <Select value={wizardDeptFilter} onValueChange={setWizardDeptFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.filter(d => d !== 'all').map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Contract Expiry Filter</label>
                    <Select value={wizardExpiryFilter} onValueChange={setWizardExpiryFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Contracts</SelectItem>
                        <SelectItem value="q1">Q1 2026 (Jan-Mar)</SelectItem>
                        <SelectItem value="q2">Q2 2026 (Apr-Jun)</SelectItem>
                        <SelectItem value="h2">H2 2026 (Jul-Dec)</SelectItem>
                        <SelectItem value="custom">Custom Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {wizardExpiryFilter === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Expiry Before Date</label>
                    <Input 
                      type="date"
                      value={wizardCustomDate}
                      onChange={(e) => setWizardCustomDate(e.target.value)}
                    />
                  </div>
                )}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{filteredWizardResources.length}</strong> resources match your filters
                  </span>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={selectedResources.size === filteredWizardResources.length && filteredWizardResources.length > 0}
                      onCheckedChange={toggleWizardSelectAll}
                    />
                    <span className="text-sm font-medium text-foreground">Select All ({filteredWizardResources.length} resources)</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{selectedResources.size} selected</span>
                </div>
                
                <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left w-10"></th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Resource</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Department</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Vendor</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Contract End</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Monthly CTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredWizardResources.map(r => (
                        <tr 
                          key={r.id} 
                          className={cn(
                            "hover:bg-muted/30 cursor-pointer",
                            selectedResources.has(r.id) && "bg-primary/5"
                          )} 
                          onClick={() => {
                            const newSet = new Set(selectedResources);
                            if (newSet.has(r.id)) {
                              newSet.delete(r.id);
                            } else {
                              newSet.add(r.id);
                            }
                            setSelectedResources(newSet);
                          }}
                        >
                          <td className="px-3 py-2">
                            <Checkbox checked={selectedResources.has(r.id)} />
                          </td>
                          <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.department}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.resourceType}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.vendorName || '—'}</td>
                          <td className="px-3 py-2">
                            <span className={cn("font-mono text-xs", getContractDateClass(r.contractEnd))}>
                              {formatDateDisplay(r.contractEnd)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{r.ctc ? formatCurrency(r.ctc) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {selectedResources.size === 0 && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
                    ⚠️ Please select at least one resource to continue
                  </div>
                )}
              </div>
            )}

            {wizardStep === 3 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-foreground">Set extension for each resource</span>
                  <Select onValueChange={(v) => applyExtensionToAll(parseInt(v))}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Apply to all..." />
                    </SelectTrigger>
                    <SelectContent>
                      {EXTENSION_OPTIONS.slice(1).map(opt => (
                        <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg overflow-hidden max-h-[350px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Resource</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Dept</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Current End</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">CTC</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Extension</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">New End</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Delta (SAR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...selectedResources].map(id => {
                        const r = data.resources.find(x => x.id === id);
                        if (!r) return null;
                        const months = resourceExtensions[id] || 0;
                        const originalEnd = r.contractEnd ? new Date(r.contractEnd) : new Date();
                        const newEnd = new Date(originalEnd);
                        newEnd.setMonth(newEnd.getMonth() + months);
                        const delta = (r.ctc || 0) * months;

                        return (
                          <tr key={id}>
                            <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.department}</td>
                            <td className="px-3 py-2">
                              <span className={cn("font-mono text-xs", getContractDateClass(r.contractEnd))}>
                                {formatDateDisplay(r.contractEnd)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{r.ctc ? formatCurrency(r.ctc) : '—'}</td>
                            <td className="px-3 py-2">
                              <Select 
                                value={String(months)} 
                                onValueChange={(v) => setResourceExtensions(prev => ({...prev, [id]: parseInt(v)}))}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {EXTENSION_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2 text-foreground font-mono text-xs">
                              {months > 0 ? formatDateDisplay(newEnd.toISOString().split('T')[0]) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium text-amber-600">
                              {months > 0 ? `+${formatCurrency(delta)}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Running Total */}
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-amber-800 dark:text-amber-300">
                    {wizardTotals.resourceCount} resources extended
                  </span>
                  <span className="font-mono font-bold text-amber-800 dark:text-amber-300">
                    Total delta: +{formatCurrency(wizardTotals.totalDelta)} SAR
                  </span>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Scenario Name</div>
                    <div className="font-semibold text-foreground">{wizardName || '—'}</div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Resources Extended</div>
                    <div className="font-mono text-2xl font-bold text-foreground">{wizardTotals.resourceCount}</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 text-center">
                    <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">Total Delta</div>
                    <div className="font-mono text-2xl font-bold text-amber-700 dark:text-amber-300">+{formatCurrency(wizardTotals.totalDelta)}</div>
                  </div>
                  <div className="bg-primary/10 rounded-xl p-4 text-center">
                    <div className="text-xs text-primary mb-1">New Total</div>
                    <div className="font-mono text-2xl font-bold text-primary">{formatCurrency(wizardTotals.newTotal)}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-foreground mb-3">Budget Impact</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Baseline Total</span>
                      <span className="font-mono font-medium">{formatCurrency(baselineBudget.total)} SAR</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <span className="text-amber-700 dark:text-amber-400">Extension Cost</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-300">+{formatCurrency(wizardTotals.totalDelta)} SAR</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                      <span className="font-medium text-foreground">New Total</span>
                      <span className="font-mono font-bold text-primary">{formatCurrency(wizardTotals.newTotal)} SAR</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-foreground mb-3">By Category</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                      <div className="text-xs text-blue-600 dark:text-blue-400">Insourced</div>
                      <div className="font-mono font-bold text-blue-700 dark:text-blue-300">{formatCurrency(baselineBudget.insourced + wizardTotals.totalDelta)}</div>
                      <div className="text-xs text-blue-600">+{formatCurrency(wizardTotals.totalDelta)}</div>
                    </div>
                    <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-3 text-center">
                      <div className="text-xs text-teal-600 dark:text-teal-400">Cosourced</div>
                      <div className="font-mono font-bold text-teal-700 dark:text-teal-300">{formatCurrency(baselineBudget.cosourced)}</div>
                      <div className="text-xs text-muted-foreground">+0</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                      <div className="text-xs text-amber-600 dark:text-amber-400">Outsourced</div>
                      <div className="font-mono font-bold text-amber-700 dark:text-amber-300">{formatCurrency(baselineBudget.outsourced)}</div>
                      <div className="text-xs text-muted-foreground">+0</div>
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-3 text-center">
                      <div className="text-xs text-violet-600 dark:text-violet-400">Licenses</div>
                      <div className="font-mono font-bold text-violet-700 dark:text-violet-300">{formatCurrency(baselineBudget.licenses)}</div>
                      <div className="text-xs text-muted-foreground">+0</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setWizardOpen(false)}>Cancel</Button>
            <div className="flex-1" />
            {wizardStep > 1 && (
              <Button variant="outline" onClick={() => setWizardStep((wizardStep - 1) as WizardStep)}>
                Back
              </Button>
            )}
            {wizardStep < 4 ? (
              <Button 
                onClick={() => setWizardStep((wizardStep + 1) as WizardStep)}
                disabled={(wizardStep === 1 && !wizardName.trim()) || (wizardStep === 2 && selectedResources.size === 0)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={handleSaveWizardScenario}
                disabled={createScenario.isPending || wizardTotals.resourceCount === 0}
                className="bg-primary"
              >
                {createScenario.isPending ? 'Saving...' : 'Save Scenario'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Scenario Modal (from detail edits) */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Scenario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Scenario Name</label>
              <Input 
                value={saveScenarioName}
                onChange={(e) => setSaveScenarioName(e.target.value)}
                placeholder="Enter scenario name"
              />
            </div>
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Resources Extended:</span>
                <strong>{detailTotals.resourceCount}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Delta:</span>
                <strong className="text-amber-600">+{formatCurrency(detailTotals.totalDelta)} SAR</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New Total:</span>
                <strong>{formatCurrency(baselineBudget.total + detailTotals.totalDelta)} SAR</strong>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveDetailScenario}
              disabled={!saveScenarioName.trim() || createScenario.isPending}
              className="bg-primary"
            >
              {createScenario.isPending ? 'Saving...' : 'Save Scenario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <Dialog open={compareModalOpen} onOpenChange={setCompareModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Compare Scenarios</DialogTitle>
          </DialogHeader>
          
          {/* Scenario Selection */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-foreground mb-3">Select scenarios to compare (2-3)</h4>
            <div className="grid grid-cols-2 gap-2">
              {allScenarios.map(scenario => (
                <label 
                  key={scenario.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    compareSelection.has(scenario.id) 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <Checkbox 
                    checked={compareSelection.has(scenario.id)}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(compareSelection);
                      if (checked) {
                        if (newSet.size < 3) newSet.add(scenario.id);
                      } else {
                        newSet.delete(scenario.id);
                      }
                      setCompareSelection(newSet);
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{scenario.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{formatCurrency(scenario.totalBudget)}</div>
                  </div>
                  {scenario.deltaFromBaseline !== 0 && (
                    <span className="font-mono text-xs text-amber-600">
                      +{formatCurrency(scenario.deltaFromBaseline)}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Comparison Table */}
          {compareScenariosList.length >= 2 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Metric</th>
                    {compareScenariosList.map((s, idx) => (
                      <th key={idx} className="px-4 py-3 text-right font-medium text-foreground">{s.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="bg-muted/30">
                    <td className="px-4 py-3 font-bold">Total Budget</td>
                    {compareScenariosList.map((s, idx) => (
                      <td key={idx} className="px-4 py-3 text-right font-mono font-bold">{formatCurrency(s.totalBudget)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-muted-foreground">Delta from Baseline</td>
                    {compareScenariosList.map((s, idx) => (
                      <td key={idx} className="px-4 py-3 text-right font-mono">
                        {s.deltaFromBaseline === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="text-amber-600">+{formatCurrency(s.deltaFromBaseline)}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-blue-600">Insourced</td>
                    {compareScenariosList.map((s, idx) => (
                      <td key={idx} className="px-4 py-3 text-right font-mono">{formatCurrency(s.insourcedBudget)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-teal-600">Cosourced</td>
                    {compareScenariosList.map((s, idx) => (
                      <td key={idx} className="px-4 py-3 text-right font-mono">{formatCurrency(s.cosourcedBudget)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-amber-600">Outsourced</td>
                    {compareScenariosList.map((s, idx) => (
                      <td key={idx} className="px-4 py-3 text-right font-mono">{formatCurrency(s.outsourcedBudget)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-violet-600">Licenses</td>
                    {compareScenariosList.map((s, idx) => (
                      <td key={idx} className="px-4 py-3 text-right font-mono">{formatCurrency(s.licensesBudget)}</td>
                    ))}
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="px-4 py-3 font-bold">Resources Extended</td>
                    {compareScenariosList.map((s, idx) => (
                      <td key={idx} className="px-4 py-3 text-right font-mono font-bold">{s.resourceCount}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {compareScenariosList.length < 2 && (
            <div className="text-center py-8 text-muted-foreground">
              <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select at least 2 scenarios to compare</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* UX-2 FIX: Delete Confirmation Dialog */}
      {selectedScenario && (
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Scenario?</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              This will permanently delete "{selectedScenario.name}". This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  deleteScenario.mutate(selectedScenario.id);
                  setDeleteConfirmOpen(false);
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
