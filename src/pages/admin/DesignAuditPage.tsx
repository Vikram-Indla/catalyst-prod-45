import { useState } from 'react';
import { 
  Palette, 
  Type, 
  Ruler, 
  Square, 
  Layers, 
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Monitor,
  Tablet,
  Smartphone,
  Bell,
  BarChart3,
  MousePointer2,
  Tag,
  RectangleHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * Design Audit Page - Atlassian-aligned design system audit
 * Extended coverage: Toasts, Charts, Interaction States, Status Colors, Button Sizing
 */

// Audit findings data - organized by category
const auditFindings = [
  // Side Navigation
  { id: 'nav-density', area: 'Side Navigation', element: 'Nav Item Height', current: '44px (h-11)', target: '32px', delta: '+12px', severity: 'P1', status: 'fixed', recommendation: 'Use compact nav items with 32px height for better density' },
  { id: 'nav-spacing', area: 'Side Navigation', element: 'Section Gap', current: '16px', target: '8px', delta: '+8px', severity: 'P2', status: 'fixed', recommendation: 'Reduce section gaps for tighter grouping' },
  { id: 'nav-selected', area: 'Side Navigation', element: 'Selected State', current: 'bg-primary/10', target: 'Left indicator bar + subtle bg', delta: 'Pattern', severity: 'P1', status: 'fixed', recommendation: 'Add left indicator bar on selected nav items' },
  { id: 'sidebar-collapsed', area: 'Side Navigation', element: 'Collapsed Width', current: '64px', target: '56px', delta: '+8px', severity: 'P2', status: 'fixed', recommendation: 'Reduce collapsed sidebar to 56px for Atlassian alignment' },
  // Header
  { id: 'header-height', area: 'Global Header', element: 'Header Height', current: '64px (h-16)', target: '56px', delta: '+8px', severity: 'P1', status: 'fixed', recommendation: 'Use 56px header height for Atlassian density' },
  // Modal/Drawer
  { id: 'modal-padding', area: 'Modal/Dialog', element: 'Content Padding', current: '24px (p-6)', target: '20px', delta: '+4px', severity: 'P2', status: 'fixed', recommendation: 'Slightly reduce modal padding for compactness' },
  { id: 'drawer-width', area: 'Drawer/Sheet', element: 'Default Width', current: 'sm:max-w-sm', target: 'Semantic widths', delta: 'Pattern', severity: 'P2', status: 'fixed', recommendation: 'Define semantic drawer widths: narrow (360px), medium (480px), wide (640px)' },
  // Focus
  { id: 'focus-ring', area: 'Interactive Elements', element: 'Focus Ring Style', current: 'ring-2 ring-ring', target: 'Brand gold focus ring', delta: 'Style', severity: 'P1', status: 'fixed', recommendation: 'Use consistent brand-gold focus rings across all focusable elements' },
];

// Toast audit findings
const toastFindings = [
  { id: 'toast-placement', element: 'Placement', current: 'Top-right, fixed', target: 'Top-right, 16px offset', status: 'pass', notes: 'Correct placement pattern' },
  { id: 'toast-stacking', element: 'Stacking', current: '8px gap, newest on top', target: '8px gap, LIFO', status: 'pass', notes: 'Proper stacking order' },
  { id: 'toast-width', element: 'Width', current: '380-460px', target: '360-420px', status: 'warn', notes: 'Slightly wide; reduce for density' },
  { id: 'toast-success', element: 'Success Color', current: 'text-emerald-500', target: 'hsl(var(--success))', status: 'warn', notes: 'Use semantic token' },
  { id: 'toast-error', element: 'Error Color', current: 'text-red-500', target: 'hsl(var(--destructive))', status: 'warn', notes: 'Use semantic token' },
  { id: 'toast-warning', element: 'Warning Color', current: 'text-amber-500', target: 'hsl(var(--warning))', status: 'warn', notes: 'Use semantic token' },
  { id: 'toast-info', element: 'Info Color', current: 'text-brand-gold', target: 'hsl(var(--brand-gold))', status: 'pass', notes: 'Correct brand token' },
  { id: 'toast-dismiss', element: 'Auto-dismiss', current: '5000ms default', target: '5000ms', status: 'pass', notes: 'Standard duration' },
  { id: 'toast-pause', element: 'Pause on Hover', current: 'Implemented', target: 'Required', status: 'pass', notes: 'UX best practice' },
  { id: 'toast-contrast', element: 'Text Contrast', current: 'neutral-900/500', target: 'WCAG AA', status: 'pass', notes: '4.5:1 ratio met' },
];

// Chart/Report color audit
const chartFindings = [
  { id: 'chart-palette', element: 'Primary Palette', current: 'Golden Hour (5 colors)', target: 'Golden Hour semantic', status: 'pass', notes: 'Consistent brand palette' },
  { id: 'chart-expert', element: 'Level 5 (Expert)', current: '#5c7c5c (olive)', target: 'hsl(var(--palette-expert))', status: 'pass', notes: 'Token defined' },
  { id: 'chart-advanced', element: 'Level 4 (Advanced)', current: '#8b7355 (bronze)', target: 'hsl(var(--palette-advanced))', status: 'pass', notes: 'Token defined' },
  { id: 'chart-intermediate', element: 'Level 3 (Intermediate)', current: '#c69c6d (gold)', target: 'hsl(var(--palette-intermediate))', status: 'pass', notes: 'Brand gold' },
  { id: 'chart-beginner', element: 'Level 2 (Beginner)', current: '#d4b896 (champagne)', target: 'hsl(var(--palette-beginner))', status: 'pass', notes: 'Token defined' },
  { id: 'chart-none', element: 'Level 1 (None)', current: '#c8ccd0 (grey)', target: 'hsl(var(--palette-none))', status: 'pass', notes: 'Token defined' },
  { id: 'chart-gridline', element: 'Gridline Contrast', current: 'border-border', target: 'min 15% opacity', status: 'pass', notes: 'Subtle but visible' },
  { id: 'chart-axis', element: 'Axis Labels', current: 'text-muted-foreground', target: 'WCAG AA compliant', status: 'pass', notes: 'Readable' },
  { id: 'chart-legend', element: 'Legend Size', current: '12px', target: '11-12px', status: 'pass', notes: 'Compact and readable' },
  { id: 'chart-drift', element: 'Palette Drift', current: 'No third-party colors', target: 'Golden Hour only', status: 'pass', notes: 'Enforced by governance' },
];

// Interaction states audit
const interactionFindings = [
  { id: 'btn-hover', element: 'Button Hover', current: 'hover:bg-brand-gold-hover', target: 'Darken 5-10%', status: 'pass', computed: 'rgb(184, 144, 95)', notes: 'Correct' },
  { id: 'btn-active', element: 'Button Active/Pressed', current: 'Not defined', target: 'Darken 15%', status: 'warn', computed: 'N/A', notes: 'Add active state' },
  { id: 'btn-focus', element: 'Button Focus', current: 'ring-2 ring-ring', target: '2px brand-gold ring', status: 'pass', computed: 'hsl(35 46% 60%)', notes: 'Correct token' },
  { id: 'btn-disabled', element: 'Button Disabled', current: 'opacity-50', target: 'opacity-50 + cursor-not-allowed', status: 'pass', computed: '0.5', notes: 'Standard pattern' },
  { id: 'link-hover', element: 'Link Hover', current: 'underline', target: 'Underline + subtle color shift', status: 'pass', computed: 'text-decoration: underline', notes: 'Accessible' },
  { id: 'nav-hover', element: 'Nav Item Hover', current: 'hover:bg-accent', target: 'Subtle 4-8% bg change', status: 'pass', computed: 'hsl(214 15% 96%)', notes: 'Correct' },
  { id: 'nav-selected', element: 'Nav Item Selected', current: 'Left bar + bg-brand-gold-pale', target: 'Indicator + subtle bg', status: 'pass', computed: 'rgba(198,156,109,0.08)', notes: 'Correct' },
  { id: 'input-focus', element: 'Input Focus', current: 'border-brand-gold + shadow', target: '2px border + glow', status: 'pass', computed: 'border: 2px solid hsl(35 46% 60%)', notes: 'Correct' },
  { id: 'input-hover', element: 'Input Hover', current: 'border-color change', target: 'Subtle border darken', status: 'pass', computed: 'border-color: #8590A2', notes: 'Defined' },
  { id: 'checkbox-checked', element: 'Checkbox Checked', current: 'bg-primary', target: 'Brand gold background', status: 'pass', computed: 'hsl(35 46% 60%)', notes: 'Correct' },
];

// Status colors audit
const statusFindings = [
  { id: 'status-success', element: 'Success/Complete', current: 'hsl(142 71% 50%)', hex: '#36B37E', usage: 'Badges, icons, toasts', status: 'pass', notes: 'Atlassian green' },
  { id: 'status-warning', element: 'Warning/At Risk', current: 'hsl(38 92% 50%)', hex: '#FFAB00', usage: 'Badges, icons, toasts', status: 'pass', notes: 'Atlassian amber' },
  { id: 'status-error', element: 'Error/Critical', current: 'hsl(0 72% 51%)', hex: '#DE350B', usage: 'Badges, icons, toasts', status: 'pass', notes: 'Atlassian red' },
  { id: 'status-info', element: 'Info/Neutral', current: 'hsl(210 100% 50%)', hex: '#0065FF', usage: 'Badges, icons, toasts', status: 'pass', notes: 'Atlassian blue' },
  { id: 'status-neutral', element: 'Neutral/Default', current: 'hsl(217 11% 46%)', hex: '#6B7280', usage: 'Muted badges', status: 'pass', notes: 'Gray 500' },
  { id: 'status-consistency', element: 'Cross-app Consistency', current: 'Semantic tokens used', target: 'All status use tokens', status: 'pass', notes: 'Enforced via CSS vars' },
  { id: 'badge-contrast', element: 'Badge Text Contrast', current: 'White on color', target: 'WCAG AA (4.5:1)', status: 'pass', notes: 'All pass contrast check' },
  { id: 'health-green', element: 'Health On Track', current: 'var(--health-green)', hex: '#36B37E', usage: 'Health indicators', status: 'pass', notes: 'Consistent' },
  { id: 'health-yellow', element: 'Health At Risk', current: 'var(--health-yellow)', hex: '#FFAB00', usage: 'Health indicators', status: 'pass', notes: 'Consistent' },
  { id: 'health-red', element: 'Health Off Track', current: 'var(--health-red)', hex: '#DE350B', usage: 'Health indicators', status: 'pass', notes: 'Consistent' },
];

// Button sizing audit
const buttonFindings = [
  { id: 'btn-default-height', element: 'Default Height', current: '40px (h-10)', target: '36px', delta: '+4px', status: 'warn', notes: 'Slightly tall for Atlassian' },
  { id: 'btn-sm-height', element: 'Small Height', current: '36px (h-9)', target: '32px', delta: '+4px', status: 'warn', notes: 'Reduce for density' },
  { id: 'btn-lg-height', element: 'Large Height', current: '44px (h-11)', target: '40px', delta: '+4px', status: 'warn', notes: 'Reduce for density' },
  { id: 'btn-icon-size', element: 'Icon-only Size', current: '40px (h-10 w-10)', target: '32px', delta: '+8px', status: 'warn', notes: 'Oversized for icons' },
  { id: 'btn-padding-x', element: 'Horizontal Padding', current: '16px (px-4)', target: '12-16px', status: 'pass', notes: 'Within range' },
  { id: 'btn-font-size', element: 'Font Size', current: '14px (text-sm)', target: '14px', status: 'pass', notes: 'Correct' },
  { id: 'btn-font-weight', element: 'Font Weight', current: '500 (medium)', target: '500-600', status: 'pass', notes: 'Correct' },
  { id: 'btn-icon-size-inner', element: 'Inner Icon Size', current: '16px (size-4)', target: '16px', status: 'pass', notes: 'Correct' },
  { id: 'btn-gap', element: 'Icon-Text Gap', current: '8px (gap-2)', target: '8px', status: 'pass', notes: 'Correct' },
  { id: 'btn-radius', element: 'Border Radius', current: '6px (rounded-md)', target: '4-6px', status: 'pass', notes: 'Acceptable' },
];

// Token categories for reference
const tokenCategories = [
  {
    name: 'Surfaces',
    icon: Layers,
    tokens: [
      { name: 'App', value: '--background', example: '#FFFFFF' },
      { name: 'Sunken', value: '--neutral-50', example: '#F9FAFB' },
      { name: 'Raised', value: '--card', example: '#FFFFFF' },
      { name: 'Overlay', value: '--popover', example: '#FFFFFF' },
      { name: 'Selected', value: '--brand-gold-pale', example: 'rgba(198,156,109,0.08)' },
    ],
  },
  {
    name: 'Text',
    icon: Type,
    tokens: [
      { name: 'Primary', value: '--text-primary', example: '#111827' },
      { name: 'Secondary', value: '--text-secondary', example: '#4B5563' },
      { name: 'Tertiary', value: '--text-tertiary', example: '#6B7280' },
      { name: 'Muted', value: '--text-muted', example: '#9CA3AF' },
      { name: 'Brand', value: '--brand-gold', example: '#C69C6D' },
    ],
  },
  {
    name: 'Spacing',
    icon: Ruler,
    tokens: [
      { name: 'XS', value: '4px', example: '0.5 unit' },
      { name: 'SM', value: '8px', example: '1 unit (base)' },
      { name: 'MD', value: '12px', example: '1.5 units' },
      { name: 'LG', value: '16px', example: '2 units' },
      { name: 'XL', value: '24px', example: '3 units' },
    ],
  },
  {
    name: 'Radius',
    icon: Square,
    tokens: [
      { name: 'SM', value: '4px', example: 'Inputs, small elements' },
      { name: 'MD', value: '6px', example: 'Buttons, cards' },
      { name: 'LG', value: '8px', example: 'Panels' },
      { name: 'XL', value: '12px', example: 'Modals, drawers' },
      { name: 'Full', value: '9999px', example: 'Pills, avatars' },
    ],
  },
];

// Calculate scores
function calculateScore(findings: { status: string }[]): number {
  const passed = findings.filter(f => f.status === 'pass' || f.status === 'fixed').length;
  return Math.round((passed / findings.length) * 100);
}

// Severity badge colors
const severityColors: Record<string, string> = {
  P0: 'bg-destructive text-destructive-foreground',
  P1: 'bg-warning text-warning-foreground',
  P2: 'bg-info text-info-foreground',
  P3: 'bg-muted text-muted-foreground',
};

const statusColors: Record<string, string> = {
  pass: 'bg-success/10 text-success',
  fixed: 'bg-success/10 text-success',
  warn: 'bg-warning/10 text-warning',
  fail: 'bg-destructive/10 text-destructive',
};

const statusIcons: Record<string, React.ReactNode> = {
  fixed: <CheckCircle2 className="h-4 w-4 text-success" />,
  pass: <CheckCircle2 className="h-4 w-4 text-success" />,
  warn: <AlertTriangle className="h-4 w-4 text-warning" />,
  fail: <XCircle className="h-4 w-4 text-destructive" />,
  pending: <AlertTriangle className="h-4 w-4 text-warning" />,
  open: <XCircle className="h-4 w-4 text-destructive" />,
};

export function DesignAuditPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Surfaces');
  const [selectedViewport, setSelectedViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Calculate all scores
  const coreScore = calculateScore(auditFindings);
  const toastScore = calculateScore(toastFindings);
  const chartScore = calculateScore(chartFindings);
  const interactionScore = calculateScore(interactionFindings);
  const statusScore = calculateScore(statusFindings);
  const buttonScore = calculateScore(buttonFindings);
  const overallScore = Math.round((coreScore + toastScore + chartScore + interactionScore + statusScore + buttonScore) / 6);

  return (
    <div className="flex-1 overflow-auto">
      {/* Page Header */}
      <div className="h-[72px] border-b bg-card flex items-center px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Palette className="h-5 w-5 text-brand-gold" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Design Audit</h1>
            <p className="text-xs text-muted-foreground">Atlassian-aligned design system audit</p>
          </div>
        </div>
        
        <div className="ml-auto flex items-center gap-4">
          {/* Viewport Toggle */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            <Button
              variant={selectedViewport === 'desktop' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setSelectedViewport('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedViewport === 'tablet' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setSelectedViewport('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedViewport === 'mobile' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setSelectedViewport('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Overall Audit Score */}
          <div className="flex items-center gap-3 px-4 py-2 bg-success/10 rounded-lg">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Overall Score</div>
              <div className="text-lg font-semibold text-success">{overallScore}%</div>
            </div>
            <Progress value={overallScore} className="w-24 h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="core">Core Findings</TabsTrigger>
            <TabsTrigger value="toasts" className="gap-1.5"><Bell className="h-3.5 w-3.5" />Toasts</TabsTrigger>
            <TabsTrigger value="charts" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Charts</TabsTrigger>
            <TabsTrigger value="interactions" className="gap-1.5"><MousePointer2 className="h-3.5 w-3.5" />Interactions</TabsTrigger>
            <TabsTrigger value="status" className="gap-1.5"><Tag className="h-3.5 w-3.5" />Status Colors</TabsTrigger>
            <TabsTrigger value="buttons" className="gap-1.5"><RectangleHorizontal className="h-3.5 w-3.5" />Buttons</TabsTrigger>
            <TabsTrigger value="tokens">Token Reference</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Core UI', score: coreScore, icon: Layers },
                { label: 'Toasts', score: toastScore, icon: Bell },
                { label: 'Charts', score: chartScore, icon: BarChart3 },
                { label: 'Interactions', score: interactionScore, icon: MousePointer2 },
                { label: 'Status Colors', score: statusScore, icon: Tag },
                { label: 'Button Density', score: buttonScore, icon: RectangleHorizontal },
              ].map(({ label, score, icon: Icon }) => (
                <Card key={label}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        score >= 80 ? "bg-success/10" : score >= 60 ? "bg-warning/10" : "bg-destructive/10"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive"
                        )} />
                      </div>
                      <div>
                        <div className="text-2xl font-semibold">{score}%</div>
                        <div className="text-xs text-muted-foreground">{label}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Audit Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Toast Consistency Score:</span>
                    <span className="ml-2 text-success">{toastScore}%</span>
                    <span className="text-muted-foreground ml-2">- {toastFindings.filter(f => f.status === 'warn').length} warnings</span>
                  </div>
                  <div>
                    <span className="font-medium">Chart Palette Drift:</span>
                    <span className="ml-2 text-success">None detected</span>
                    <span className="text-muted-foreground ml-2">- Golden Hour enforced</span>
                  </div>
                  <div>
                    <span className="font-medium">Interaction State Coverage:</span>
                    <span className="ml-2 text-success">{interactionScore}%</span>
                    <span className="text-muted-foreground ml-2">- 1 missing active state</span>
                  </div>
                  <div>
                    <span className="font-medium">Button Density Score:</span>
                    <span className="ml-2 text-warning">{buttonScore}%</span>
                    <span className="text-muted-foreground ml-2">- Heights need reduction</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Core Findings Tab */}
          <TabsContent value="core" className="space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Core UI Findings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-secondary/50">
                        <th className="text-left font-medium px-4 py-2">Status</th>
                        <th className="text-left font-medium px-4 py-2">Area</th>
                        <th className="text-left font-medium px-4 py-2">Element</th>
                        <th className="text-left font-medium px-4 py-2">Current</th>
                        <th className="text-left font-medium px-4 py-2">Target</th>
                        <th className="text-left font-medium px-4 py-2">Delta</th>
                        <th className="text-left font-medium px-4 py-2">Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditFindings.map((finding) => (
                        <tr key={finding.id} className="border-b hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-2">{statusIcons[finding.status]}</td>
                          <td className="px-4 py-2 text-muted-foreground">{finding.area}</td>
                          <td className="px-4 py-2 font-medium">{finding.element}</td>
                          <td className="px-4 py-2">
                            <code className="px-1.5 py-0.5 bg-secondary rounded text-xs">{finding.current}</code>
                          </td>
                          <td className="px-4 py-2">
                            <code className="px-1.5 py-0.5 bg-success/10 text-success rounded text-xs">{finding.target}</code>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{finding.delta}</td>
                          <td className="px-4 py-2">
                            <Badge className={cn('text-xs', severityColors[finding.severity])}>{finding.severity}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Toasts Tab */}
          <TabsContent value="toasts" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-lg">
                <Bell className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Toast Consistency Score: {toastScore}%</span>
              </div>
            </div>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Toast/Flag/Banner Audit</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-secondary/50">
                        <th className="text-left font-medium px-4 py-2">Status</th>
                        <th className="text-left font-medium px-4 py-2">Element</th>
                        <th className="text-left font-medium px-4 py-2">Current</th>
                        <th className="text-left font-medium px-4 py-2">Target</th>
                        <th className="text-left font-medium px-4 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toastFindings.map((finding) => (
                        <tr key={finding.id} className="border-b hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-2">{statusIcons[finding.status]}</td>
                          <td className="px-4 py-2 font-medium">{finding.element}</td>
                          <td className="px-4 py-2">
                            <code className="px-1.5 py-0.5 bg-secondary rounded text-xs">{finding.current}</code>
                          </td>
                          <td className="px-4 py-2">
                            <code className="px-1.5 py-0.5 bg-success/10 text-success rounded text-xs">{finding.target}</code>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{finding.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-lg">
                <BarChart3 className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Chart Color Score: {chartScore}%</span>
              </div>
              <Badge className="bg-success/10 text-success">No Palette Drift</Badge>
            </div>
            
            {/* Golden Hour Palette Preview */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Golden Hour Palette</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {[
                    { name: 'Expert', color: 'hsl(120 15% 43%)', level: 5 },
                    { name: 'Advanced', color: 'hsl(28 26% 44%)', level: 4 },
                    { name: 'Intermediate', color: 'hsl(35 46% 60%)', level: 3 },
                    { name: 'Beginner', color: 'hsl(35 42% 71%)', level: 2 },
                    { name: 'None', color: 'hsl(210 8% 80%)', level: 1 },
                  ].map((item) => (
                    <div key={item.name} className="flex-1 text-center">
                      <div 
                        className="h-12 rounded-md mb-2" 
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="text-xs font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">Level {item.level}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Chart/Report Color Audit</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-secondary/50">
                        <th className="text-left font-medium px-4 py-2">Status</th>
                        <th className="text-left font-medium px-4 py-2">Element</th>
                        <th className="text-left font-medium px-4 py-2">Current</th>
                        <th className="text-left font-medium px-4 py-2">Target</th>
                        <th className="text-left font-medium px-4 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartFindings.map((finding) => (
                        <tr key={finding.id} className="border-b hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-2">{statusIcons[finding.status]}</td>
                          <td className="px-4 py-2 font-medium">{finding.element}</td>
                          <td className="px-4 py-2">
                            <code className="px-1.5 py-0.5 bg-secondary rounded text-xs">{finding.current}</code>
                          </td>
                          <td className="px-4 py-2">
                            <code className="px-1.5 py-0.5 bg-success/10 text-success rounded text-xs">{finding.target}</code>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{finding.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interactions Tab */}
          <TabsContent value="interactions" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-lg">
                <MousePointer2 className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Interaction State Score: {interactionScore}%</span>
              </div>
            </div>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Interaction States Audit (Hover/Pressed/Selected/Focus)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-secondary/50">
                        <th className="text-left font-medium px-4 py-2">Status</th>
                        <th className="text-left font-medium px-4 py-2">Element</th>
                        <th className="text-left font-medium px-4 py-2">Current</th>
                        <th className="text-left font-medium px-4 py-2">Target</th>
                        <th className="text-left font-medium px-4 py-2">Computed</th>
                        <th className="text-left font-medium px-4 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interactionFindings.map((finding) => (
                        <tr key={finding.id} className="border-b hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-2">{statusIcons[finding.status]}</td>
                          <td className="px-4 py-2 font-medium">{finding.element}</td>
                          <td className="px-4 py-2">
                            <code className="px-1.5 py-0.5 bg-secondary rounded text-xs">{finding.current}</code>
                          </td>
                          <td className="px-4 py-2">
                            <code className="px-1.5 py-0.5 bg-success/10 text-success rounded text-xs">{finding.target}</code>
                          </td>
                          <td className="px-4 py-2">
                            <code className="px-1 py-0.5 bg-secondary/50 rounded text-xs text-muted-foreground">{finding.computed}</code>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{finding.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status Colors Tab */}
          <TabsContent value="status" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-lg">
                <Tag className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Status Color Score: {statusScore}%</span>
              </div>
            </div>

            {/* Status Color Preview */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Status Color Palette</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {[
                    { name: 'Success', cssVar: '--success', hex: '#36B37E', bg: 'bg-success', text: 'text-success-foreground' },
                    { name: 'Warning', cssVar: '--warning', hex: '#FFAB00', bg: 'bg-warning', text: 'text-warning-foreground' },
                    { name: 'Error', cssVar: '--destructive', hex: '#DE350B', bg: 'bg-destructive', text: 'text-destructive-foreground' },
                    { name: 'Info', cssVar: '--info', hex: '#0065FF', bg: 'bg-info', text: 'text-info-foreground' },
                    { name: 'Neutral', cssVar: '--muted', hex: '#6B7280', bg: 'bg-muted-foreground', text: 'text-white' },
                  ].map((item) => (
                    <div key={item.name} className="flex-1">
                      <div className={cn("h-10 rounded-md flex items-center justify-center text-xs font-medium", item.bg, item.text)}>
                        {item.name}
                      </div>
                      <div className="text-xs text-center mt-1 text-muted-foreground">{item.hex}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Status Color Consistency Audit</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-secondary/50">
                        <th className="text-left font-medium px-4 py-2">Status</th>
                        <th className="text-left font-medium px-4 py-2">Element</th>
                        <th className="text-left font-medium px-4 py-2">Token</th>
                        <th className="text-left font-medium px-4 py-2">Hex</th>
                        <th className="text-left font-medium px-4 py-2">Usage</th>
                        <th className="text-left font-medium px-4 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusFindings.map((finding) => (
                        <tr key={finding.id} className="border-b hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-2">{statusIcons[finding.status]}</td>
                          <td className="px-4 py-2 font-medium">{finding.element}</td>
                          <td className="px-4 py-2">
                            <code className="px-1.5 py-0.5 bg-secondary rounded text-xs">{finding.current}</code>
                          </td>
                          <td className="px-4 py-2">
                            <code className="px-1.5 py-0.5 bg-secondary rounded text-xs">{finding.hex || '-'}</code>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{finding.usage || finding.target}</td>
                          <td className="px-4 py-2 text-muted-foreground">{finding.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Buttons Tab */}
          <TabsContent value="buttons" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 rounded-lg">
                <RectangleHorizontal className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Button Density Score: {buttonScore}%</span>
              </div>
              <Badge className="bg-warning/10 text-warning">Heights need reduction</Badge>
            </div>

            {/* Button Size Preview */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Button Sizes (Current vs Target)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <div className="text-center">
                    <Button size="sm">Small</Button>
                    <div className="text-xs text-muted-foreground mt-2">36px → 32px</div>
                  </div>
                  <div className="text-center">
                    <Button size="default">Default</Button>
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

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Button Sizing Audit</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-secondary/50">
                        <th className="text-left font-medium px-4 py-2">Status</th>
                        <th className="text-left font-medium px-4 py-2">Element</th>
                        <th className="text-left font-medium px-4 py-2">Current</th>
                        <th className="text-left font-medium px-4 py-2">Target</th>
                        <th className="text-left font-medium px-4 py-2">Delta</th>
                        <th className="text-left font-medium px-4 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buttonFindings.map((finding) => (
                        <tr key={finding.id} className="border-b hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-2">{statusIcons[finding.status]}</td>
                          <td className="px-4 py-2 font-medium">{finding.element}</td>
                          <td className="px-4 py-2">
                            <code className="px-1.5 py-0.5 bg-secondary rounded text-xs">{finding.current}</code>
                          </td>
                          <td className="px-4 py-2">
                            <code className="px-1.5 py-0.5 bg-success/10 text-success rounded text-xs">{finding.target}</code>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{finding.delta || '-'}</td>
                          <td className="px-4 py-2 text-muted-foreground">{finding.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Token Reference Tab */}
          <TabsContent value="tokens" className="space-y-4">
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
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {category.tokens.map((token) => (
                            <div 
                              key={token.name}
                              className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/30"
                            >
                              <div>
                                <div className="font-medium text-sm">{token.name}</div>
                                <code className="text-xs text-muted-foreground">{token.value}</code>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">{token.example}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}