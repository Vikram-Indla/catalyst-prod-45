import { useState, useMemo } from 'react';
import { 
  Palette, Type, Ruler, Square, Layers, Eye, CheckCircle2, AlertTriangle, XCircle,
  ChevronDown, ChevronRight, Monitor, Tablet, Smartphone, Bell, BarChart3, 
  MousePointer2, Tag, RectangleHorizontal, Route, FileText, Download, RefreshCw,
  Scan, Layout, Maximize2, Zap, Lock, Wrench, Target, Settings2, FolderDown
} from 'lucide-react';
import {
  generateDesignSystemMarkdown,
  generatePageLayoutsJSON,
  generateModalSpecsJSON,
  generateFullDesignSystemJSON,
  downloadFile,
  pageLayouts,
  modalSpecs,
} from '@/lib/designAudit/designSystemExports';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { auditRoutes } from '@/lib/designAudit/auditConfig';
import { getScoreColor, getScoreBgColor } from '@/lib/designAudit/auditScoring';
import type { AuditFinding } from '@/lib/designAudit/auditTypes';
import { DesignSystemBaseline } from '@/components/admin/design-audit/DesignSystemBaseline';
import { GapDetectionGrid } from '@/components/admin/design-audit/GapDetectionGrid';
import { FixIssuesPanel } from '@/components/admin/design-audit/FixIssuesPanel';

// Core UI findings
const coreFindings: AuditFinding[] = [
  { id: 'nav-density', route: '/home', area: 'SideNav', element: 'Nav Item Height', selector: '[data-ui="NavItem"]', current: '44px', target: '32px', delta: '+12px', severity: 'P1', status: 'fixed', recommendation: 'Use compact 32px nav items for Atlassian density', file: 'AdminSidebarV2.tsx' },
  { id: 'nav-spacing', route: '/home', area: 'SideNav', element: 'Section Gap', selector: '.nav-section', current: '16px', target: '8px', delta: '+8px', severity: 'P2', status: 'fixed', recommendation: 'Reduce section gaps for tighter grouping', file: 'AdminSidebarV2.tsx' },
  { id: 'nav-selected', route: '/home', area: 'SideNav', element: 'Selected State', selector: '[aria-selected="true"]', current: 'bg-primary/10', target: 'Left bar + subtle bg', delta: 'Pattern', severity: 'P1', status: 'fixed', recommendation: 'Add 3px left indicator bar on selected nav', file: 'AdminSidebarV2.tsx' },
  { id: 'nav-collapsed', route: '/home', area: 'SideNav', element: 'Collapsed Width', selector: 'aside', current: '64px', target: '56px', delta: '+8px', severity: 'P2', status: 'fixed', recommendation: 'Reduce collapsed sidebar to 56px', file: 'AdminSidebarV2.tsx' },
  { id: 'header-height', route: '/home', area: 'Header', element: 'Header Height', selector: 'header', current: '64px', target: '56px', delta: '+8px', severity: 'P1', status: 'fixed', recommendation: 'Use 56px compact header', file: 'CatalystHeader.tsx' },
  { id: 'header-spacing', route: '/home', area: 'Header', element: 'Action Spacing', selector: '.header-actions', current: '16px', target: '12px', delta: '+4px', severity: 'P2', status: 'fixed', recommendation: 'Reduce action button gaps', file: 'CatalystHeader.tsx' },
  { id: 'modal-padding', route: '/admin/users', area: 'Modal', element: 'Content Padding', selector: '[role="dialog"]', current: '24px', target: '20px', delta: '+4px', severity: 'P2', status: 'fixed', recommendation: 'Slightly reduce modal padding', file: 'dialog.tsx' },
  { id: 'modal-radius', route: '/admin/users', area: 'Modal', element: 'Border Radius', selector: '[role="dialog"]', current: '8px', target: '12px', delta: '-4px', severity: 'P3', status: 'fixed', recommendation: 'Increase modal radius to 12px', file: 'dialog.tsx' },
  { id: 'drawer-width', route: '/industry', area: 'Drawer', element: 'Default Width', selector: '.sheet-content', current: 'max-w-sm', target: '480px (medium)', delta: 'Pattern', severity: 'P2', status: 'fixed', recommendation: 'Use semantic drawer widths', file: 'sheet.tsx' },
  { id: 'focus-ring', route: 'global', area: 'Button', element: 'Focus Ring', selector: 'button:focus-visible', current: 'ring-2 ring-ring', target: '2px brand-gold ring', delta: 'Token', severity: 'P1', status: 'fixed', recommendation: 'Consistent brand-gold focus rings', file: 'button.tsx' },
  { id: 'card-shadow', route: '/home', area: 'Elevation', element: 'Card Shadow', selector: '.card', current: 'shadow-sm', target: 'shadow-md', delta: 'Elevation', severity: 'P3', status: 'pass', recommendation: 'Use subtle md elevation for cards', file: 'card.tsx' },
  { id: 'table-density', route: '/industry', area: 'Typography', element: 'Table Row Height', selector: 'tr', current: '48px', target: '40px', delta: '+8px', severity: 'P2', status: 'warn', recommendation: 'Reduce table row height for density', file: 'table.tsx' },
];

// Toast findings
const toastFindings = [
  { id: 'toast-placement', element: 'Placement', current: 'Top-right, fixed', target: 'Top-right, 16px offset', status: 'pass' as const, notes: 'Correct placement pattern' },
  { id: 'toast-stacking', element: 'Stacking', current: '8px gap, LIFO', target: '8px gap, LIFO', status: 'pass' as const, notes: 'Proper stacking order' },
  { id: 'toast-width', element: 'Width', current: '380-460px', target: '360-420px', status: 'warn' as const, notes: 'Slightly wide; reduce for density' },
  { id: 'toast-success', element: 'Success Color', current: 'text-emerald-500', target: 'hsl(var(--success))', status: 'warn' as const, notes: 'Use semantic token' },
  { id: 'toast-error', element: 'Error Color', current: 'text-red-500', target: 'hsl(var(--destructive))', status: 'warn' as const, notes: 'Use semantic token' },
  { id: 'toast-warning', element: 'Warning Color', current: 'text-amber-500', target: 'hsl(var(--warning))', status: 'warn' as const, notes: 'Use semantic token' },
  { id: 'toast-info', element: 'Info Color', current: 'text-brand-gold', target: 'hsl(var(--brand-gold))', status: 'pass' as const, notes: 'Correct brand token' },
  { id: 'toast-dismiss', element: 'Auto-dismiss', current: '5000ms', target: '5000ms', status: 'pass' as const, notes: 'Standard duration' },
  { id: 'toast-pause', element: 'Pause on Hover', current: 'Implemented', target: 'Required', status: 'pass' as const, notes: 'UX best practice' },
  { id: 'toast-contrast', element: 'Text Contrast', current: '7.2:1 ratio', target: 'WCAG AA (4.5:1)', status: 'pass' as const, notes: 'Exceeds minimum' },
];

// Chart findings
const chartFindings = [
  { id: 'chart-palette', element: 'Primary Palette', current: 'Golden Hour (5 colors)', target: 'Golden Hour semantic', status: 'pass' as const, notes: 'Consistent brand palette' },
  { id: 'chart-expert', element: 'Level 5 (Expert)', current: '#5c7c5c', target: 'var(--palette-expert)', status: 'pass' as const, notes: 'Token defined in CSS' },
  { id: 'chart-advanced', element: 'Level 4 (Advanced)', current: '#8b7355', target: 'var(--palette-advanced)', status: 'pass' as const, notes: 'Token defined in CSS' },
  { id: 'chart-intermediate', element: 'Level 3 (Intermediate)', current: '#c69c6d', target: 'var(--palette-intermediate)', status: 'pass' as const, notes: 'Brand gold - primary accent' },
  { id: 'chart-beginner', element: 'Level 2 (Beginner)', current: '#d4b896', target: 'var(--palette-beginner)', status: 'pass' as const, notes: 'Token defined in CSS' },
  { id: 'chart-none', element: 'Level 1 (None)', current: '#c8ccd0', target: 'var(--palette-none)', status: 'pass' as const, notes: 'Token defined in CSS' },
  { id: 'chart-gridline', element: 'Gridline Contrast', current: 'border-border (15%)', target: 'min 15% opacity', status: 'pass' as const, notes: 'Subtle but visible' },
  { id: 'chart-axis', element: 'Axis Labels', current: 'text-muted-foreground', target: 'WCAG AA', status: 'pass' as const, notes: '4.8:1 contrast ratio' },
  { id: 'chart-legend', element: 'Legend Size', current: '12px', target: '11-12px', status: 'pass' as const, notes: 'Compact and readable' },
  { id: 'chart-drift', element: 'Palette Drift', current: 'No third-party', target: 'Golden Hour only', status: 'pass' as const, notes: 'Governance enforced' },
];

// Interaction state findings
const interactionFindings = [
  { id: 'btn-hover', element: 'Button Hover', current: 'hover:bg-brand-gold-hover', target: 'Darken 8%', computed: 'hsl(35 41% 55%)', status: 'pass' as const, notes: '#B8905F - correct' },
  { id: 'btn-active', element: 'Button Active', current: 'Not defined', target: 'Darken 12%', computed: 'N/A', status: 'warn' as const, notes: 'Add active:scale-[0.98]' },
  { id: 'btn-focus', element: 'Button Focus', current: 'ring-2 ring-ring', target: '2px brand-gold ring', computed: 'hsl(35 46% 60%)', status: 'pass' as const, notes: 'Correct token' },
  { id: 'btn-disabled', element: 'Button Disabled', current: 'opacity-50', target: 'opacity-50 + not-allowed', computed: '0.5', status: 'pass' as const, notes: 'Standard pattern' },
  { id: 'link-hover', element: 'Link Hover', current: 'hover:underline', target: 'Underline + color shift', computed: 'text-decoration: underline', status: 'pass' as const, notes: 'Accessible' },
  { id: 'nav-hover', element: 'Nav Item Hover', current: 'hover:bg-accent', target: '6% bg opacity', computed: 'hsl(214 15% 96%)', status: 'pass' as const, notes: 'Correct' },
  { id: 'nav-selected', element: 'Nav Selected', current: 'Left bar + bg-brand-gold-pale', target: 'Indicator + 8% bg', computed: 'rgba(198,156,109,0.08)', status: 'pass' as const, notes: 'Correct' },
  { id: 'input-focus', element: 'Input Focus', current: 'border-brand-gold + shadow', target: '2px border + glow', computed: '2px solid hsl(35 46% 60%)', status: 'pass' as const, notes: 'Correct' },
  { id: 'input-hover', element: 'Input Hover', current: 'border-color darken', target: 'Subtle darken', computed: '#8590A2', status: 'pass' as const, notes: 'Defined' },
  { id: 'checkbox-checked', element: 'Checkbox Checked', current: 'bg-primary', target: 'Brand gold bg', computed: 'hsl(35 46% 60%)', status: 'pass' as const, notes: 'Correct' },
];

// Status color findings
const statusFindings = [
  { id: 'status-success', element: 'Success/Complete', current: 'hsl(142 71% 50%)', hex: '#36B37E', usage: 'Badges, icons, toasts', status: 'pass' as const, notes: 'Atlassian green' },
  { id: 'status-warning', element: 'Warning/At Risk', current: 'hsl(38 92% 50%)', hex: '#FFAB00', usage: 'Badges, icons, toasts', status: 'pass' as const, notes: 'Atlassian amber' },
  { id: 'status-error', element: 'Error/Critical', current: 'hsl(0 72% 51%)', hex: '#DE350B', usage: 'Badges, icons, toasts', status: 'pass' as const, notes: 'Atlassian red' },
  { id: 'status-info', element: 'Info/Neutral', current: 'hsl(210 100% 50%)', hex: '#0065FF', usage: 'Badges, icons, toasts', status: 'pass' as const, notes: 'Atlassian blue' },
  { id: 'status-neutral', element: 'Neutral/Default', current: 'hsl(217 11% 46%)', hex: '#6B7280', usage: 'Muted badges', status: 'pass' as const, notes: 'Gray 500' },
  { id: 'status-consistency', element: 'Cross-app Consistency', current: 'Semantic tokens', target: 'All use tokens', usage: 'Global', status: 'pass' as const, notes: 'CSS vars enforced' },
  { id: 'badge-contrast', element: 'Badge Text Contrast', current: 'White on color', hex: 'N/A', usage: 'All badges', status: 'pass' as const, notes: 'WCAG AA pass' },
  { id: 'health-green', element: 'Health On Track', current: 'var(--health-green)', hex: '#36B37E', usage: 'Health indicators', status: 'pass' as const, notes: 'Consistent' },
  { id: 'health-yellow', element: 'Health At Risk', current: 'var(--health-yellow)', hex: '#FFAB00', usage: 'Health indicators', status: 'pass' as const, notes: 'Consistent' },
  { id: 'health-red', element: 'Health Off Track', current: 'var(--health-red)', hex: '#DE350B', usage: 'Health indicators', status: 'pass' as const, notes: 'Consistent' },
];

// Button size findings
const buttonFindings = [
  { id: 'btn-default-height', element: 'Default Height', current: '40px (h-10)', target: '36px', delta: '+4px', status: 'warn' as const, notes: 'Slightly tall for Atlassian' },
  { id: 'btn-sm-height', element: 'Small Height', current: '36px (h-9)', target: '32px', delta: '+4px', status: 'warn' as const, notes: 'Reduce for density' },
  { id: 'btn-lg-height', element: 'Large Height', current: '44px (h-11)', target: '40px', delta: '+4px', status: 'warn' as const, notes: 'Reduce for density' },
  { id: 'btn-icon-size', element: 'Icon-only Size', current: '40px (h-10 w-10)', target: '32px', delta: '+8px', status: 'warn' as const, notes: 'Oversized for icons' },
  { id: 'btn-padding-x', element: 'Horizontal Padding', current: '16px (px-4)', target: '12-16px', delta: '-', status: 'pass' as const, notes: 'Within range' },
  { id: 'btn-font-size', element: 'Font Size', current: '14px (text-sm)', target: '14px', delta: '-', status: 'pass' as const, notes: 'Correct' },
  { id: 'btn-font-weight', element: 'Font Weight', current: '500 (medium)', target: '500-600', delta: '-', status: 'pass' as const, notes: 'Correct' },
  { id: 'btn-icon-inner', element: 'Inner Icon Size', current: '16px (size-4)', target: '16px', delta: '-', status: 'pass' as const, notes: 'Correct' },
  { id: 'btn-gap', element: 'Icon-Text Gap', current: '8px (gap-2)', target: '8px', delta: '-', status: 'pass' as const, notes: 'Correct' },
  { id: 'btn-radius', element: 'Border Radius', current: '6px (rounded-md)', target: '4-6px', delta: '-', status: 'pass' as const, notes: 'Acceptable' },
];

// Token reference categories
const tokenCategories = [
  {
    name: 'Surfaces',
    icon: Layers,
    tokens: [
      { name: 'App Background', value: '--background', computed: '#FFFFFF' },
      { name: 'Sunken', value: '--neutral-50', computed: '#F9FAFB' },
      { name: 'Raised (Card)', value: '--card', computed: '#FFFFFF' },
      { name: 'Overlay', value: '--popover', computed: '#FFFFFF' },
      { name: 'Selected', value: '--brand-gold-pale', computed: 'rgba(198,156,109,0.08)' },
    ],
  },
  {
    name: 'Text',
    icon: Type,
    tokens: [
      { name: 'Primary', value: '--text-primary', computed: '#111827' },
      { name: 'Secondary', value: '--text-secondary', computed: '#4B5563' },
      { name: 'Tertiary', value: '--text-tertiary', computed: '#6B7280' },
      { name: 'Muted', value: '--text-muted', computed: '#9CA3AF' },
      { name: 'Brand', value: '--brand-gold', computed: '#C69C6D' },
    ],
  },
  {
    name: 'Spacing',
    icon: Ruler,
    tokens: [
      { name: 'XS (4px)', value: '--s1', computed: '4px' },
      { name: 'SM (8px)', value: '--s2', computed: '8px' },
      { name: 'MD (12px)', value: '--s3', computed: '12px' },
      { name: 'LG (16px)', value: '--s4', computed: '16px' },
      { name: 'XL (24px)', value: '--s6', computed: '24px' },
    ],
  },
  {
    name: 'Layout',
    icon: Layout,
    tokens: [
      { name: 'Header Height', value: '--topnav-h', computed: '56px' },
      { name: 'Sidebar Width', value: '--sidebar-w', computed: '280px' },
      { name: 'Grid Row', value: '--grid-row', computed: '32px' },
      { name: 'Toolbar', value: '--toolbar-h', computed: '48px' },
    ],
  },
];

// Navigation sections
const navSections = [
  { 
    id: 'baseline', 
    label: 'Design Baseline', 
    icon: Lock, 
    description: 'Locked design system tokens'
  },
  { 
    id: 'gaps', 
    label: 'Gap Detection', 
    icon: Target, 
    description: 'Pages/components not aligned'
  },
  { 
    id: 'fix', 
    label: 'Fix Issues', 
    icon: Wrench, 
    description: 'Apply fixes to selected issues'
  },
  { 
    id: 'overview', 
    label: 'Overview', 
    icon: Eye, 
    description: 'Scores & summary'
  },
  { 
    id: 'components', 
    label: 'Components', 
    icon: Settings2, 
    subItems: [
      { id: 'core', label: 'Core UI', icon: Layout },
      { id: 'overlays', label: 'Modals/Drawers', icon: Maximize2 },
      { id: 'buttons', label: 'Buttons', icon: RectangleHorizontal },
      { id: 'toasts', label: 'Toasts', icon: Bell },
      { id: 'charts', label: 'Charts', icon: BarChart3 },
      { id: 'status', label: 'Status Colors', icon: Tag },
      { id: 'interactions', label: 'Interaction States', icon: MousePointer2 },
    ]
  },
  { 
    id: 'tokens', 
    label: 'Design Tokens', 
    icon: Zap, 
    description: 'Token reference'
  },
  { 
    id: 'routes', 
    label: 'Routes', 
    icon: Route, 
    description: 'Configured audit routes'
  },
  { 
    id: 'downloads', 
    label: 'Downloads', 
    icon: FolderDown, 
    description: 'Export design system docs'
  },
];

// Calculate scores
function calcScore(items: { status: string }[]): number {
  const passed = items.filter(i => i.status === 'pass' || i.status === 'fixed').length;
  return Math.round((passed / items.length) * 100);
}

export function DesignAuditPage() {
  const [activeSection, setActiveSection] = useState('baseline');
  const [expandedNav, setExpandedNav] = useState<string | null>('components');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Surfaces');
  const [selectedViewport, setSelectedViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isScanning, setIsScanning] = useState(false);

  // Calculate all scores
  const scores = useMemo(() => ({
    core: calcScore(coreFindings),
    toast: calcScore(toastFindings),
    chart: calcScore(chartFindings),
    interaction: calcScore(interactionFindings),
    status: calcScore(statusFindings),
    button: calcScore(buttonFindings),
  }), []);

  const overallScore = Math.round(
    (scores.core + scores.toast + scores.chart + scores.interaction + scores.status + scores.button) / 6
  );

  const handleRunAudit = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 2000);
  };

  const handleExportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      overallScore,
      scores,
      routesAudited: auditRoutes.length,
      findings: {
        core: coreFindings,
        toast: toastFindings,
        chart: chartFindings,
        interaction: interactionFindings,
        status: statusFindings,
        button: buttonFindings,
      },
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalyst-audit-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'baseline':
        return <DesignSystemBaseline />;
      case 'gaps':
        return <GapDetectionGrid />;
      case 'fix':
        return <FixIssuesPanel />;
      case 'overview':
        return <OverviewContent scores={scores} overallScore={overallScore} />;
      case 'core':
        return <AuditTable title="Core UI Findings" description="Side navigation, header, layout measurements" findings={coreFindings} columns={['status', 'area', 'element', 'current', 'target', 'delta', 'severity']} />;
      case 'overlays':
        return <OverlaysContent />;
      case 'toasts':
        return <ToastsContent scores={scores} toastFindings={toastFindings} />;
      case 'charts':
        return <ChartsContent scores={scores} chartFindings={chartFindings} />;
      case 'interactions':
        return <InteractionsContent scores={scores} interactionFindings={interactionFindings} />;
      case 'status':
        return <StatusContent scores={scores} statusFindings={statusFindings} />;
      case 'buttons':
        return <ButtonsContent scores={scores} buttonFindings={buttonFindings} />;
      case 'tokens':
        return <TokensContent tokenCategories={tokenCategories} expandedCategory={expandedCategory} setExpandedCategory={setExpandedCategory} />;
      case 'routes':
        return <RoutesContent />;
      case 'downloads':
        return <DownloadsContent />;
      default:
        return <DesignSystemBaseline />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background">
      {/* Left Sidebar Navigation */}
      <aside className="w-64 border-r bg-card flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="h-[72px] border-b flex items-center px-4 gap-3">
          <div className="h-9 w-9 rounded-lg bg-brand-gold/10 flex items-center justify-center">
            <Palette className="h-4.5 w-4.5 text-brand-gold" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">Design Audit</h1>
            <p className="text-xs text-muted-foreground">{auditRoutes.length} routes</p>
          </div>
        </div>

        {/* Score Summary */}
        <div className="p-3 border-b">
          <div className={cn("flex items-center gap-3 px-3 py-2 rounded-lg", getScoreBgColor(overallScore))}>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Overall Score</div>
              <div className={cn("text-lg font-semibold", getScoreColor(overallScore))}>{overallScore}%</div>
            </div>
            <Progress value={overallScore} className="w-16 h-2" />
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-0.5">
            {navSections.map((section) => {
              const Icon = section.icon;
              const hasSubItems = 'subItems' in section && section.subItems;
              const isExpanded = expandedNav === section.id;
              const isActive = activeSection === section.id || 
                (hasSubItems && section.subItems?.some(sub => sub.id === activeSection));

              return (
                <div key={section.id}>
                  <button
                    onClick={() => {
                      if (hasSubItems) {
                        setExpandedNav(isExpanded ? null : section.id);
                      } else {
                        setActiveSection(section.id);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left",
                      isActive && !hasSubItems 
                        ? "bg-brand-gold/10 text-brand-gold font-medium border-l-2 border-brand-gold -ml-0.5 pl-[14px]" 
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{section.label}</span>
                    {hasSubItems && (
                      isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {/* Sub Items */}
                  {hasSubItems && isExpanded && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-2">
                      {section.subItems?.map((sub) => {
                        const SubIcon = sub.icon;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setActiveSection(sub.id)}
                            className={cn(
                              "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors text-left",
                              activeSection === sub.id 
                                ? "bg-brand-gold/10 text-brand-gold font-medium" 
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer Actions */}
        <div className="p-3 border-t space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start gap-2" 
            onClick={handleRunAudit} 
            disabled={isScanning}
          >
            {isScanning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
            {isScanning ? 'Scanning...' : 'Run Audit'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start gap-2"
            onClick={handleExportReport}
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Content Header */}
        <div className="h-[72px] border-b bg-card flex items-center justify-between px-6 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {navSections.find(s => s.id === activeSection)?.label || 
               navSections.flatMap(s => 'subItems' in s ? s.subItems || [] : []).find(s => s.id === activeSection)?.label || 
               'Design Audit'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {navSections.find(s => s.id === activeSection)?.description || 'Component analysis'}
            </p>
          </div>

          {/* Viewport Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              {(['desktop', 'tablet', 'mobile'] as const).map((vp) => (
                <Button
                  key={vp}
                  variant={selectedViewport === vp ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setSelectedViewport(vp)}
                >
                  {vp === 'desktop' && <Monitor className="h-4 w-4" />}
                  {vp === 'tablet' && <Tablet className="h-4 w-4" />}
                  {vp === 'mobile' && <Smartphone className="h-4 w-4" />}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {renderContent()}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

// Sub-components for each section
function OverviewContent({ scores, overallScore }: { scores: Record<string, number>; overallScore: number }) {
  return (
    <div className="space-y-6">
      {/* Score Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Core UI', score: scores.core, icon: Layout },
          { label: 'Toasts', score: scores.toast, icon: Bell },
          { label: 'Charts', score: scores.chart, icon: BarChart3 },
          { label: 'Interactions', score: scores.interaction, icon: MousePointer2 },
          { label: 'Status Colors', score: scores.status, icon: Tag },
          { label: 'Buttons', score: scores.button, icon: RectangleHorizontal },
        ].map(({ label, score, icon: Icon }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", getScoreBgColor(score))}>
                  <Icon className={cn("h-5 w-5", getScoreColor(score))} />
                </div>
                <div>
                  <div className={cn("text-2xl font-bold", getScoreColor(score))}>{score}%</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-gold" />
              Audit Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Routes Audited:</span>
                <span className="font-medium">{auditRoutes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toast Score:</span>
                <span className={cn("font-medium", getScoreColor(scores.toast))}>{scores.toast}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Palette Drift:</span>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">None</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Button Density:</span>
                <span className={cn("font-medium", getScoreColor(scores.button))}>{scores.button}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Top Priorities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { text: 'Button heights need reduction (-4px each)', severity: 'P1' },
                { text: 'Toast colors should use semantic tokens', severity: 'P2' },
                { text: 'Add active/pressed states to buttons', severity: 'P2' },
                { text: 'Table row height needs density fix', severity: 'P2' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge className={cn("text-xs shrink-0", 
                    item.severity === 'P1' ? 'bg-warning text-warning-foreground' : 'bg-info text-info-foreground'
                  )}>
                    {item.severity}
                  </Badge>
                  <span className="text-muted-foreground">{item.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OverlaysContent() {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Modal/Dialog/Drawer Audit</CardTitle>
        <CardDescription>Overlay anatomy, sizing, and behavior consistency</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Modal Sizes</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Small:</span><code className="bg-secondary px-1.5 rounded">384px</code></div>
              <div className="flex justify-between"><span>Medium:</span><code className="bg-secondary px-1.5 rounded">512px</code></div>
              <div className="flex justify-between"><span>Large:</span><code className="bg-secondary px-1.5 rounded">640px</code></div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">Drawer Widths</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Narrow:</span><code className="bg-secondary px-1.5 rounded">360px</code></div>
              <div className="flex justify-between"><span>Medium:</span><code className="bg-secondary px-1.5 rounded">480px</code></div>
              <div className="flex justify-between"><span>Wide:</span><code className="bg-secondary px-1.5 rounded">640px</code></div>
            </div>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>Focus trap implemented</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>ESC key closes overlay</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>Backdrop click close (configurable)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>Consistent elevation/shadow tokens</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ToastsContent({ scores, toastFindings }: { scores: Record<string, number>; toastFindings: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Badge className={cn("gap-1.5", getScoreBgColor(scores.toast), getScoreColor(scores.toast))}>
          <Bell className="h-3.5 w-3.5" />
          Toast Consistency: {scores.toast}%
        </Badge>
      </div>
      <SimpleAuditTable title="Toast/Flag/Banner Audit" items={toastFindings} />
    </div>
  );
}

function ChartsContent({ scores, chartFindings }: { scores: Record<string, number>; chartFindings: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Badge className="bg-success/10 text-success gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          Chart Score: {scores.chart}%
        </Badge>
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">No Palette Drift</Badge>
      </div>
      
      {/* Palette Preview */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Golden Hour Palette</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[
              { name: 'Expert', color: 'hsl(120 15% 43%)', level: 5 },
              { name: 'Advanced', color: 'hsl(28 26% 44%)', level: 4 },
              { name: 'Intermediate', color: 'hsl(35 46% 60%)', level: 3 },
              { name: 'Beginner', color: 'hsl(35 42% 71%)', level: 2 },
              { name: 'None', color: 'hsl(210 8% 80%)', level: 1 },
            ].map((item) => (
              <div key={item.name} className="flex-1 text-center">
                <div className="h-10 rounded-md mb-2" style={{ backgroundColor: item.color }} />
                <div className="text-xs font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">L{item.level}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <SimpleAuditTable title="Chart/Report Color Audit" items={chartFindings} />
    </div>
  );
}

function InteractionsContent({ scores, interactionFindings }: { scores: Record<string, number>; interactionFindings: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Badge className={cn("gap-1.5", getScoreBgColor(scores.interaction), getScoreColor(scores.interaction))}>
          <MousePointer2 className="h-3.5 w-3.5" />
          Interaction States: {scores.interaction}%
        </Badge>
      </div>
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Hover/Pressed/Selected/Focus States</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/50">
                <th className="text-left font-medium px-4 py-2 w-8">✓</th>
                <th className="text-left font-medium px-4 py-2">Element</th>
                <th className="text-left font-medium px-4 py-2">Current</th>
                <th className="text-left font-medium px-4 py-2">Target</th>
                <th className="text-left font-medium px-4 py-2">Computed</th>
                <th className="text-left font-medium px-4 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {interactionFindings.map((f) => (
                <tr key={f.id} className="border-b hover:bg-secondary/30">
                  <td className="px-4 py-2">{f.status === 'pass' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}</td>
                  <td className="px-4 py-2 font-medium">{f.element}</td>
                  <td className="px-4 py-2"><code className="text-xs px-1.5 py-0.5 bg-secondary rounded">{f.current}</code></td>
                  <td className="px-4 py-2"><code className="text-xs px-1.5 py-0.5 bg-success/10 text-success rounded">{f.target}</code></td>
                  <td className="px-4 py-2"><code className="text-xs text-muted-foreground">{f.computed}</code></td>
                  <td className="px-4 py-2 text-muted-foreground">{f.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusContent({ scores, statusFindings }: { scores: Record<string, number>; statusFindings: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Badge className="bg-success/10 text-success gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          Status Color Score: {scores.status}%
        </Badge>
      </div>
      
      {/* Status Preview */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Status Color Palette</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {[
              { name: 'Success', bg: 'bg-success', text: 'text-success-foreground' },
              { name: 'Warning', bg: 'bg-warning', text: 'text-warning-foreground' },
              { name: 'Error', bg: 'bg-destructive', text: 'text-destructive-foreground' },
              { name: 'Info', bg: 'bg-info', text: 'text-info-foreground' },
              { name: 'Neutral', bg: 'bg-muted-foreground', text: 'text-white' },
            ].map((item) => (
              <div key={item.name} className="flex-1">
                <div className={cn("h-10 rounded-md flex items-center justify-center text-xs font-medium", item.bg, item.text)}>
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <SimpleAuditTable title="Status Color Consistency" items={statusFindings} />
    </div>
  );
}

function ButtonsContent({ scores, buttonFindings }: { scores: Record<string, number>; buttonFindings: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Badge className={cn("gap-1.5", getScoreBgColor(scores.button), getScoreColor(scores.button))}>
          <RectangleHorizontal className="h-3.5 w-3.5" />
          Button Density: {scores.button}%
        </Badge>
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Heights need reduction</Badge>
      </div>
      
      {/* Button Preview */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Button Sizes (Current → Target)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="text-center">
              <Button size="sm">Small</Button>
              <div className="text-xs text-muted-foreground mt-2">36px → 32px</div>
            </div>
            <div className="text-center">
              <Button>Default</Button>
              <div className="text-xs text-muted-foreground mt-2">40px → 36px</div>
            </div>
            <div className="text-center">
              <Button size="lg">Large</Button>
              <div className="text-xs text-muted-foreground mt-2">44px → 40px</div>
            </div>
            <div className="text-center">
              <Button size="icon"><Eye className="h-4 w-4" /></Button>
              <div className="text-xs text-muted-foreground mt-2">40px → 32px</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <SimpleAuditTable title="Button Sizing Audit" items={buttonFindings} />
    </div>
  );
}

function TokensContent({ tokenCategories, expandedCategory, setExpandedCategory }: { 
  tokenCategories: any[]; 
  expandedCategory: string | null; 
  setExpandedCategory: (v: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {tokenCategories.map((category) => {
        const Icon = category.icon;
        const isExpanded = expandedCategory === category.name;
        
        return (
          <Card key={category.name}>
            <CardHeader 
              className="py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
              onClick={() => setExpandedCategory(isExpanded ? null : category.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-brand-gold" />
                  <CardTitle className="text-base">{category.name}</CardTitle>
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {category.tokens.map((token: any) => (
                    <div key={token.name} className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/30">
                      <div>
                        <div className="font-medium text-sm">{token.name}</div>
                        <code className="text-xs text-muted-foreground">{token.value}</code>
                      </div>
                      <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">{token.computed}</code>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function RoutesContent() {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Configured Routes ({auditRoutes.length})</CardTitle>
        <CardDescription>Routes discovered for audit scanning</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b">
              <tr>
                <th className="text-left font-medium px-4 py-2">Route</th>
                <th className="text-left font-medium px-4 py-2">Name</th>
                <th className="text-left font-medium px-4 py-2">Category</th>
                <th className="text-left font-medium px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {auditRoutes.map((route) => (
                <tr key={route.path} className="border-b hover:bg-secondary/30">
                  <td className="px-4 py-2">
                    <code className="text-xs px-1.5 py-0.5 bg-secondary rounded">{route.path}</code>
                  </td>
                  <td className="px-4 py-2 font-medium">{route.name}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="text-xs capitalize">{route.category}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge className="bg-success/10 text-success text-xs">Configured</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function DownloadsContent() {
  const downloadItems = [
    {
      title: 'Design System Markdown',
      description: 'Complete design system documentation including tokens, components, and specifications',
      filename: 'catalyst-design-system.md',
      icon: FileText,
      action: () => {
        const md = generateDesignSystemMarkdown();
        downloadFile(md, 'catalyst-design-system.md', 'text/markdown');
      },
    },
    {
      title: 'Page Layouts (JSON)',
      description: 'Layout specifications for all major pages including routes, components, and structure',
      filename: 'catalyst-page-layouts.json',
      icon: Layout,
      action: () => {
        const json = generatePageLayoutsJSON();
        downloadFile(json, 'catalyst-page-layouts.json', 'application/json');
      },
    },
    {
      title: 'Modal & Dialog Specs (JSON)',
      description: 'All modal, dialog, and drawer specifications with sizes and anatomy',
      filename: 'catalyst-modal-specs.json',
      icon: Maximize2,
      action: () => {
        const json = generateModalSpecsJSON();
        downloadFile(json, 'catalyst-modal-specs.json', 'application/json');
      },
    },
    {
      title: 'Full Design System (JSON)',
      description: 'Complete design system export including tokens, components, layouts, modals, and gaps',
      filename: 'catalyst-design-system-full.json',
      icon: FolderDown,
      action: () => {
        const json = generateFullDesignSystemJSON();
        downloadFile(json, 'catalyst-design-system-full.json', 'application/json');
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Download Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {downloadItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.filename} className="hover:border-brand-gold/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-brand-gold/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-brand-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="mt-1">{item.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-center justify-between">
                  <code className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                    {item.filename}
                  </code>
                  <Button size="sm" onClick={item.action} className="gap-1.5">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Reference Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Layouts Summary */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layout className="h-4 w-4 text-brand-gold" />
              Page Layouts ({pageLayouts.length})
            </CardTitle>
            <CardDescription>Key page structures</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[250px]">
              <div className="divide-y">
                {pageLayouts.map((page) => (
                  <div key={page.route} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{page.name}</span>
                      <code className="text-[10px] text-muted-foreground bg-secondary px-1 rounded">{page.route}</code>
                    </div>
                    <p className="text-xs text-muted-foreground">{page.description}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Modal Specs Summary */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-brand-gold" />
              Modal & Dialog Specs ({modalSpecs.length})
            </CardTitle>
            <CardDescription>Overlay component specifications</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[250px]">
              <div className="divide-y">
                {modalSpecs.map((modal) => (
                  <div key={modal.name} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{modal.name}</span>
                      <code className="text-[10px] text-muted-foreground bg-secondary px-1 rounded">{modal.file}</code>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Sizes: {Object.entries(modal.sizes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper components
function AuditTable({ title, description, findings, columns }: { 
  title: string; 
  description?: string;
  findings: AuditFinding[]; 
  columns: string[];
}) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/50">
              {columns.includes('status') && <th className="text-left font-medium px-4 py-2 w-8">✓</th>}
              {columns.includes('area') && <th className="text-left font-medium px-4 py-2">Area</th>}
              {columns.includes('element') && <th className="text-left font-medium px-4 py-2">Element</th>}
              {columns.includes('current') && <th className="text-left font-medium px-4 py-2">Current</th>}
              {columns.includes('target') && <th className="text-left font-medium px-4 py-2">Target</th>}
              {columns.includes('delta') && <th className="text-left font-medium px-4 py-2">Delta</th>}
              {columns.includes('severity') && <th className="text-left font-medium px-4 py-2">Severity</th>}
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <tr key={f.id} className="border-b hover:bg-secondary/30">
                {columns.includes('status') && (
                  <td className="px-4 py-2">
                    {f.status === 'pass' || f.status === 'fixed' ? <CheckCircle2 className="h-4 w-4 text-success" /> : 
                     f.status === 'warn' ? <AlertTriangle className="h-4 w-4 text-warning" /> : 
                     <XCircle className="h-4 w-4 text-destructive" />}
                  </td>
                )}
                {columns.includes('area') && <td className="px-4 py-2 text-muted-foreground">{f.area}</td>}
                {columns.includes('element') && <td className="px-4 py-2 font-medium">{f.element}</td>}
                {columns.includes('current') && <td className="px-4 py-2"><code className="text-xs px-1.5 py-0.5 bg-secondary rounded">{f.current}</code></td>}
                {columns.includes('target') && <td className="px-4 py-2"><code className="text-xs px-1.5 py-0.5 bg-success/10 text-success rounded">{f.target}</code></td>}
                {columns.includes('delta') && <td className="px-4 py-2 text-muted-foreground">{f.delta}</td>}
                {columns.includes('severity') && (
                  <td className="px-4 py-2">
                    <Badge className={cn("text-xs",
                      f.severity === 'P0' ? 'bg-destructive text-destructive-foreground' :
                      f.severity === 'P1' ? 'bg-warning text-warning-foreground' :
                      f.severity === 'P2' ? 'bg-info text-info-foreground' : 
                      'bg-muted text-muted-foreground'
                    )}>{f.severity}</Badge>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SimpleAuditTable({ title, items }: { title: string; items: Array<{ id: string; element: string; current: string; target?: string; status: string; notes: string }> }) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/50">
              <th className="text-left font-medium px-4 py-2 w-8">✓</th>
              <th className="text-left font-medium px-4 py-2">Element</th>
              <th className="text-left font-medium px-4 py-2">Current</th>
              <th className="text-left font-medium px-4 py-2">Target</th>
              <th className="text-left font-medium px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-secondary/30">
                <td className="px-4 py-2">
                  {item.status === 'pass' ? <CheckCircle2 className="h-4 w-4 text-success" /> : 
                   item.status === 'warn' ? <AlertTriangle className="h-4 w-4 text-warning" /> : 
                   <XCircle className="h-4 w-4 text-destructive" />}
                </td>
                <td className="px-4 py-2 font-medium">{item.element}</td>
                <td className="px-4 py-2"><code className="text-xs px-1.5 py-0.5 bg-secondary rounded">{item.current}</code></td>
                <td className="px-4 py-2"><code className="text-xs px-1.5 py-0.5 bg-success/10 text-success rounded">{item.target || '-'}</code></td>
                <td className="px-4 py-2 text-muted-foreground">{item.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
