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
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * Design Audit Page - Atlassian-aligned design system audit
 * 
 * This page provides:
 * 1. Design token reference
 * 2. Component audit findings
 * 3. Before/after comparison
 * 4. Accessibility checks
 */

// Audit findings data
const auditFindings = [
  {
    id: 'nav-density',
    area: 'Side Navigation',
    element: 'Nav Item Height',
    current: '44px (h-11)',
    target: '32px',
    delta: '+12px',
    severity: 'P1',
    status: 'fixed',
    recommendation: 'Use compact nav items with 32px height for better density',
  },
  {
    id: 'nav-spacing',
    area: 'Side Navigation',
    element: 'Section Gap',
    current: '16px',
    target: '8px',
    delta: '+8px',
    severity: 'P2',
    status: 'fixed',
    recommendation: 'Reduce section gaps for tighter grouping',
  },
  {
    id: 'header-height',
    area: 'Global Header',
    element: 'Header Height',
    current: '64px (h-16)',
    target: '56px',
    delta: '+8px',
    severity: 'P1',
    status: 'fixed',
    recommendation: 'Use 56px header height for Atlassian density',
  },
  {
    id: 'modal-padding',
    area: 'Modal/Dialog',
    element: 'Content Padding',
    current: '24px (p-6)',
    target: '20px',
    delta: '+4px',
    severity: 'P2',
    status: 'fixed',
    recommendation: 'Slightly reduce modal padding for compactness',
  },
  {
    id: 'focus-ring',
    area: 'Interactive Elements',
    element: 'Focus Ring Style',
    current: 'ring-2 ring-ring',
    target: 'Brand gold focus ring',
    delta: 'Style',
    severity: 'P1',
    status: 'fixed',
    recommendation: 'Use consistent brand-gold focus rings across all focusable elements',
  },
  {
    id: 'drawer-width',
    area: 'Drawer/Sheet',
    element: 'Default Width',
    current: 'sm:max-w-sm',
    target: 'Semantic widths (narrow/medium/wide)',
    delta: 'Pattern',
    severity: 'P2',
    status: 'fixed',
    recommendation: 'Define semantic drawer widths: narrow (360px), medium (480px), wide (640px)',
  },
  {
    id: 'sidebar-collapsed',
    area: 'Side Navigation',
    element: 'Collapsed Width',
    current: '64px',
    target: '56px',
    delta: '+8px',
    severity: 'P2',
    status: 'fixed',
    recommendation: 'Reduce collapsed sidebar to 56px for Atlassian alignment',
  },
  {
    id: 'nav-selected',
    area: 'Side Navigation',
    element: 'Selected State',
    current: 'bg-primary/10 text-primary',
    target: 'Left indicator bar + subtle background',
    delta: 'Pattern',
    severity: 'P1',
    status: 'fixed',
    recommendation: 'Add left indicator bar on selected nav items',
  },
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

// Severity badge colors
const severityColors: Record<string, string> = {
  P0: 'bg-destructive text-destructive-foreground',
  P1: 'bg-warning text-warning-foreground',
  P2: 'bg-info text-info-foreground',
  P3: 'bg-muted text-muted-foreground',
};

const statusIcons: Record<string, React.ReactNode> = {
  fixed: <CheckCircle2 className="h-4 w-4 text-success" />,
  pending: <AlertTriangle className="h-4 w-4 text-warning" />,
  open: <XCircle className="h-4 w-4 text-destructive" />,
};

export function DesignAuditPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Surfaces');
  const [selectedViewport, setSelectedViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Calculate audit score
  const fixedCount = auditFindings.filter(f => f.status === 'fixed').length;
  const totalCount = auditFindings.length;
  const auditScore = Math.round((fixedCount / totalCount) * 100);

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
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
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
          
          {/* Audit Score */}
          <div className="flex items-center gap-3 px-4 py-2 bg-success/10 rounded-lg">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Audit Score</div>
              <div className="text-lg font-semibold text-success">{auditScore}%</div>
            </div>
            <Progress value={auditScore} className="w-24 h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs defaultValue="findings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="findings">Audit Findings</TabsTrigger>
            <TabsTrigger value="tokens">Token Reference</TabsTrigger>
            <TabsTrigger value="components">Component Status</TabsTrigger>
          </TabsList>

          {/* Findings Tab */}
          <TabsContent value="findings" className="space-y-4">
            <div className="grid gap-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <div className="text-2xl font-semibold">{fixedCount}</div>
                        <div className="text-xs text-muted-foreground">Fixed</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <div className="text-2xl font-semibold">0</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <XCircle className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <div className="text-2xl font-semibold">0</div>
                        <div className="text-xs text-muted-foreground">Open</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-brand-gold/10 flex items-center justify-center">
                        <Eye className="h-5 w-5 text-brand-gold" />
                      </div>
                      <div>
                        <div className="text-2xl font-semibold">{totalCount}</div>
                        <div className="text-xs text-muted-foreground">Total Findings</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Findings Table */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Detailed Findings</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
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
                          <tr key={finding.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2">{statusIcons[finding.status]}</td>
                            <td className="px-4 py-2 text-muted-foreground">{finding.area}</td>
                            <td className="px-4 py-2 font-medium">{finding.element}</td>
                            <td className="px-4 py-2">
                              <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{finding.current}</code>
                            </td>
                            <td className="px-4 py-2">
                              <code className="px-1.5 py-0.5 bg-success/10 text-success rounded text-xs">{finding.target}</code>
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">{finding.delta}</td>
                            <td className="px-4 py-2">
                              <Badge className={cn('text-xs', severityColors[finding.severity])}>
                                {finding.severity}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                      className="py-3 cursor-pointer hover:bg-muted/30 transition-colors"
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
                              className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30"
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

          {/* Component Status Tab */}
          <TabsContent value="components" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: 'Side Navigation', status: 'complete', details: 'Compact nav items, left indicator, collapsible' },
                { name: 'Global Header', status: 'complete', details: '56px height, grid layout, consistent spacing' },
                { name: 'Dialog/Modal', status: 'complete', details: 'Semantic widths, focus trap, brand styling' },
                { name: 'Sheet/Drawer', status: 'complete', details: 'Width tokens, consistent padding, elevation' },
                { name: 'Button', status: 'complete', details: 'Brand gold default, size variants' },
                { name: 'Input/Select', status: 'complete', details: 'Focus ring, border states, sizing' },
              ].map((component) => (
                <Card key={component.name}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">{component.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{component.details}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
