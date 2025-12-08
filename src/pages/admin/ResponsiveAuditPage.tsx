import { useState, useMemo } from 'react';
import { 
  Smartphone, Tablet, Monitor, Maximize2, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Download, RefreshCw, Play, Pause, Filter,
  Table2, Layout, PanelLeft, Layers, MousePointer2, Type, Square, BarChart3,
  Grid3X3, ArrowUpDown, Eye, FileText, Zap, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { 
  responsiveViewports, 
  responsiveRoutes, 
  issueCategories,
  fixPatterns,
  severityDefinitions,
} from '@/lib/responsiveAudit/responsiveConfig';
import { 
  calculateGlobalScores, 
  prioritizeIssues,
  getScoreColor,
  getScoreBgColor,
  getSeverityBadgeVariant,
} from '@/lib/responsiveAudit/responsiveScoring';
import type { ResponsiveIssue, AuditProgress, ResponsiveAuditScores } from '@/lib/responsiveAudit/responsiveTypes';
import type { ViewportId, IssueCategory, ResponsiveSeverity } from '@/lib/responsiveAudit/responsiveConfig';

// Mock issues for demonstration (real implementation would run detectors)
const mockIssues: ResponsiveIssue[] = [
  {
    id: 'overflow-1',
    route: '/industry',
    viewport: 'mobile-m',
    category: 'overflow',
    severity: 'P0',
    element: 'Business Requests Table',
    selector: 'table.business-requests',
    description: 'Table causes horizontal scroll on mobile without scroll container',
    measured: { scrollWidth: 1200, clientWidth: 390, overflow: { x: true, y: false } },
    expected: 'Table should be in scroll container or use responsive columns',
    recommendation: 'Wrap table in div with overflow-x-auto',
    fixPattern: fixPatterns['table-layout'][0],
    file: 'src/pages/IndustryPage.tsx',
    component: 'BusinessRequestsTable',
  },
  {
    id: 'touch-1',
    route: '/admin/overview',
    viewport: 'mobile-s',
    category: 'touch-target',
    severity: 'P1',
    element: 'Icon Button',
    selector: 'button.icon-only',
    description: 'Icon buttons are 32x32px, below 44px minimum for touch',
    measured: { width: 32, height: 32 },
    expected: 'Minimum 44x44px touch target',
    recommendation: 'Increase button size to h-11 w-11 on mobile',
    fixPattern: fixPatterns['touch-target'][0],
    file: 'src/components/ui/button.tsx',
    component: 'Button',
  },
  {
    id: 'modal-1',
    route: '/admin/users',
    viewport: 'mobile-m',
    category: 'modal-drawer',
    severity: 'P0',
    element: 'Create User Modal',
    selector: '[role="dialog"]',
    description: 'Modal exceeds viewport height, footer actions hidden',
    measured: { width: 400, height: 920, viewportWidth: 390, viewportHeight: 844 },
    expected: 'Modal max-height: 90vh with internal scroll',
    recommendation: 'Apply max-h-[90vh] overflow-auto to modal body',
    fixPattern: fixPatterns['modal-drawer'][0],
    file: 'src/components/ui/dialog.tsx',
    component: 'DialogContent',
  },
  {
    id: 'nav-1',
    route: '/home',
    viewport: 'tablet-portrait',
    category: 'navigation',
    severity: 'P1',
    element: 'Side Navigation',
    selector: 'aside.sidebar',
    description: 'Sidebar not collapsed on tablet, overlaps main content',
    measured: { width: 280, isClipped: false },
    expected: 'Sidebar should collapse to icon rail or hamburger menu',
    recommendation: 'Add lg:hidden to full sidebar, show collapsed version',
    fixPattern: fixPatterns['navigation'][0],
    file: 'src/components/layout/CatalystShell.tsx',
    component: 'SideNav',
  },
  {
    id: 'text-1',
    route: '/enterprise/strategy-room',
    viewport: 'mobile-s',
    category: 'text-overflow',
    severity: 'P2',
    element: 'Page Title',
    selector: 'h1.page-title',
    description: 'Page title overflows container without truncation',
    measured: { scrollWidth: 320, clientWidth: 280 },
    expected: 'Title should truncate with ellipsis or wrap to 2 lines max',
    recommendation: 'Apply truncate or line-clamp-2 class',
    fixPattern: fixPatterns['text-overflow'][0],
    file: 'src/pages/enterprise/StrategyRoomPage.tsx',
    component: 'PageHeader',
  },
  {
    id: 'header-1',
    route: '/program-board',
    viewport: 'mobile-m',
    category: 'header',
    severity: 'P1',
    element: 'Action Buttons',
    selector: 'header .actions',
    description: 'Header action buttons overflow and are clipped',
    measured: { scrollWidth: 450, clientWidth: 390 },
    expected: 'Actions should move to overflow menu on mobile',
    recommendation: 'Use DropdownMenu for actions on sm: breakpoint',
    fixPattern: fixPatterns['header'][1],
    file: 'src/components/header/CatalystHeader.tsx',
    component: 'HeaderActions',
  },
  {
    id: 'table-2',
    route: '/epics',
    viewport: 'tablet-portrait',
    category: 'table-layout',
    severity: 'P1',
    element: 'Epics Table',
    selector: 'table.epics-table',
    description: 'Table columns collapse to unreadable widths',
    measured: { tableWidth: 1100, viewportWidth: 768, columnCount: 12, narrowColumns: [3, 5, 7, 9] },
    expected: 'Hide non-essential columns or use horizontal scroll',
    recommendation: 'Implement column priority hiding with responsive breakpoints',
    fixPattern: fixPatterns['table-layout'][1],
    file: 'src/pages/EpicsPage.tsx',
    component: 'EpicsTable',
  },
  {
    id: 'overlap-1',
    route: '/risks',
    viewport: 'mobile-m',
    category: 'overlap',
    severity: 'P2',
    element: 'Sticky Header',
    selector: 'header.sticky',
    description: 'Sticky header overlaps first table row on scroll',
    measured: { boundingBox: { top: 0, height: 64 } as DOMRect },
    expected: 'Content should have proper top offset for sticky header',
    recommendation: 'Add pt-16 to main content container',
    fixPattern: fixPatterns['overlap'][1],
    file: 'src/pages/RisksPage.tsx',
  },
  {
    id: 'spacing-1',
    route: '/admin/activity',
    viewport: 'mobile-s',
    category: 'spacing',
    severity: 'P3',
    element: 'Card Padding',
    selector: '.card',
    description: 'Card padding too large for mobile viewport',
    measured: { computedStyles: { padding: '24px' } },
    expected: 'Responsive padding: p-3 sm:p-4 md:p-6',
    recommendation: 'Use responsive padding classes',
    fixPattern: fixPatterns['spacing'][0],
    file: 'src/components/ui/card.tsx',
  },
  {
    id: 'drawer-1',
    route: '/industry',
    viewport: 'mobile-m',
    category: 'modal-drawer',
    severity: 'P1',
    element: 'Business Request Drawer',
    selector: '[data-side="right"]',
    description: 'Drawer width exceeds mobile viewport',
    measured: { width: 480, viewportWidth: 390 },
    expected: 'Drawer should be full-width on mobile',
    recommendation: 'Use w-full sm:max-w-md for drawer width',
    fixPattern: fixPatterns['modal-drawer'][1],
    file: 'src/components/ui/sheet.tsx',
    component: 'SheetContent',
  },
];

// Calculate scores from mock issues
const mockRouteResults = responsiveRoutes.map(route => ({
  route: route.path,
  name: route.name,
  category: route.category as any,
  priority: route.priority as any,
  timestamp: new Date().toISOString(),
  viewportResults: [],
  overallScore: 100 - (mockIssues.filter(i => i.route === route.path).length * 10),
  issues: mockIssues.filter(i => i.route === route.path),
}));

export function ResponsiveAuditPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedViewports, setSelectedViewports] = useState<ViewportId[]>(['mobile-m', 'tablet-portrait', 'desktop']);
  const [selectedCategories, setSelectedCategories] = useState<IssueCategory[]>([...issueCategories]);
  const [selectedSeverities, setSelectedSeverities] = useState<ResponsiveSeverity[]>(['P0', 'P1', 'P2', 'P3']);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  
  const [progress, setProgress] = useState<AuditProgress>({
    status: 'idle',
    routesScanned: 0,
    totalRoutes: responsiveRoutes.length,
    viewportsScanned: 0,
    totalViewports: responsiveViewports.length,
    issuesFound: 0,
  });

  // Calculate scores
  const scores = useMemo(() => calculateGlobalScores(mockIssues, mockRouteResults), []);
  const prioritizedIssues = useMemo(() => prioritizeIssues(mockIssues), []);
  
  // Filtered issues
  const filteredIssues = useMemo(() => {
    return prioritizedIssues.filter(issue => 
      selectedViewports.includes(issue.viewport) &&
      selectedCategories.includes(issue.category) &&
      selectedSeverities.includes(issue.severity)
    );
  }, [prioritizedIssues, selectedViewports, selectedCategories, selectedSeverities]);

  const handleRunAudit = () => {
    setIsScanning(true);
    setProgress({ ...progress, status: 'scanning', startTime: new Date().toISOString() });
    
    // Simulate scanning progress
    let routeIndex = 0;
    const interval = setInterval(() => {
      routeIndex++;
      if (routeIndex >= responsiveRoutes.length) {
        clearInterval(interval);
        setIsScanning(false);
        setProgress(prev => ({ ...prev, status: 'complete', routesScanned: responsiveRoutes.length }));
      } else {
        setProgress(prev => ({
          ...prev,
          routesScanned: routeIndex,
          currentRoute: responsiveRoutes[routeIndex]?.path,
          issuesFound: Math.floor(routeIndex * 0.4),
        }));
      }
    }, 200);
  };

  const handleExportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      scores,
      routesScanned: responsiveRoutes.length,
      viewportsTested: responsiveViewports.length,
      totalIssues: mockIssues.length,
      topIssues: prioritizedIssues.slice(0, 20),
      issuesByCategory: Object.fromEntries(
        issueCategories.map(cat => [cat, mockIssues.filter(i => i.category === cat)])
      ),
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `responsive-audit-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      {/* Page Header */}
      <div className="h-[72px] border-b bg-card flex items-center px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-brand-gold/10 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-brand-gold" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Responsive Audit</h1>
            <p className="text-xs text-muted-foreground">
              {responsiveRoutes.length} routes · {responsiveViewports.length} viewports · Evidence-based testing
            </p>
          </div>
        </div>
        
        <div className="ml-auto flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRunAudit} 
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Audit
              </>
            )}
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {isScanning && (
        <div className="px-6 py-3 bg-muted/50 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Scanning: {progress.currentRoute || 'Initializing...'}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.routesScanned}/{progress.totalRoutes} routes
            </span>
          </div>
          <Progress value={(progress.routesScanned / progress.totalRoutes) * 100} className="h-2" />
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-3xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="issues">Issues ({filteredIssues.length})</TabsTrigger>
            <TabsTrigger value="routes">Routes</TabsTrigger>
            <TabsTrigger value="viewports">Viewports</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="recommendations">Fixes</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ScoreCard 
                title="Global Readiness" 
                score={scores.globalScore} 
                icon={<Zap className="h-5 w-5" />}
                subtitle="Weighted across all viewports"
              />
              <ScoreCard 
                title="P0 Issues" 
                score={scores.p0Count} 
                icon={<XCircle className="h-5 w-5" />}
                isCount
                variant="destructive"
                subtitle="Critical blockers"
              />
              <ScoreCard 
                title="P1 Issues" 
                score={scores.p1Count} 
                icon={<AlertTriangle className="h-5 w-5" />}
                isCount
                variant="warning"
                subtitle="Major issues"
              />
              <ScoreCard 
                title="Routes Passed" 
                score={mockRouteResults.filter(r => r.overallScore >= 80).length}
                icon={<CheckCircle2 className="h-5 w-5" />}
                isCount
                variant="success"
                subtitle={`of ${responsiveRoutes.length} total`}
              />
            </div>

            {/* Viewport Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-brand-gold" />
                  Viewport Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                  {responsiveViewports.map(vp => {
                    const score = scores.byViewport[vp.id];
                    return (
                      <div 
                        key={vp.id} 
                        className={cn(
                          "p-3 rounded-lg border text-center",
                          getScoreBgColor(score)
                        )}
                      >
                        <div className="flex justify-center mb-2">
                          {vp.type === 'mobile' && <Smartphone className="h-5 w-5 text-muted-foreground" />}
                          {vp.type === 'tablet' && <Tablet className="h-5 w-5 text-muted-foreground" />}
                          {vp.type === 'desktop' && <Monitor className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className={cn("text-lg font-bold", getScoreColor(score))}>
                          {score}%
                        </div>
                        <div className="text-xs text-muted-foreground">{vp.label}</div>
                        <div className="text-[10px] text-muted-foreground">{vp.width}×{vp.height}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4 text-brand-gold" />
                    Issue Categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {issueCategories.map(cat => {
                    const score = scores.byCategory[cat];
                    const count = mockIssues.filter(i => i.category === cat).length;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <div className="w-28 text-sm capitalize">{cat.replace('-', ' ')}</div>
                        <Progress value={score} className="flex-1 h-2" />
                        <div className={cn("w-12 text-right text-sm font-medium", getScoreColor(score))}>
                          {score}%
                        </div>
                        <Badge variant="outline" className="w-8 justify-center">
                          {count}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Square className="h-4 w-4 text-brand-gold" />
                    Component Families
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(scores.byComponentFamily).map(([family, score]) => (
                    <div key={family} className="flex items-center gap-3">
                      <div className="w-28 text-sm capitalize">{family}</div>
                      <Progress value={score} className="flex-1 h-2" />
                      <div className={cn("w-12 text-right text-sm font-medium", getScoreColor(score))}>
                        {score}%
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Top Issues Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-brand-gold" />
                  Top Priority Issues
                </CardTitle>
                <CardDescription>Most critical issues requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {prioritizedIssues.slice(0, 5).map(issue => (
                    <IssueRow key={issue.id} issue={issue} compact />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <div className="text-sm font-medium mb-2">Severity</div>
                    <div className="flex gap-2">
                      {(['P0', 'P1', 'P2', 'P3'] as ResponsiveSeverity[]).map(sev => (
                        <label key={sev} className="flex items-center gap-1.5">
                          <Checkbox 
                            checked={selectedSeverities.includes(sev)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedSeverities([...selectedSeverities, sev]);
                              else setSelectedSeverities(selectedSeverities.filter(s => s !== sev));
                            }}
                          />
                          <Badge variant={getSeverityBadgeVariant(sev)} className="text-xs">
                            {sev}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium mb-2">Viewports</div>
                    <div className="flex gap-2 flex-wrap">
                      {responsiveViewports.slice(0, 4).map(vp => (
                        <label key={vp.id} className="flex items-center gap-1.5">
                          <Checkbox 
                            checked={selectedViewports.includes(vp.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedViewports([...selectedViewports, vp.id]);
                              else setSelectedViewports(selectedViewports.filter(v => v !== vp.id));
                            }}
                          />
                          <span className="text-xs">{vp.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Issues List */}
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredIssues.map(issue => (
                  <IssueRow 
                    key={issue.id} 
                    issue={issue} 
                    expanded={expandedIssue === issue.id}
                    onToggle={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                  />
                ))}
                {filteredIssues.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No issues match the current filters
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Routes Tab */}
          <TabsContent value="routes" className="space-y-4">
            <div className="grid gap-3">
              {mockRouteResults.map(result => (
                <Card key={result.route} className={cn(
                  "transition-colors",
                  result.overallScore >= 80 ? "border-green-200" : 
                  result.overallScore >= 60 ? "border-yellow-200" : "border-red-200"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          getScoreBgColor(result.overallScore)
                        )}>
                          <span className={cn("text-lg font-bold", getScoreColor(result.overallScore))}>
                            {result.overallScore}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{result.name}</div>
                          <div className="text-xs text-muted-foreground">{result.route}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="capitalize">{result.category}</Badge>
                        <div className="flex gap-1">
                          {result.issues.filter(i => i.severity === 'P0').length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {result.issues.filter(i => i.severity === 'P0').length} P0
                            </Badge>
                          )}
                          {result.issues.filter(i => i.severity === 'P1').length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                              {result.issues.filter(i => i.severity === 'P1').length} P1
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Viewports Tab */}
          <TabsContent value="viewports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {responsiveViewports.map(vp => {
                const vpIssues = mockIssues.filter(i => i.viewport === vp.id);
                const score = scores.byViewport[vp.id];
                return (
                  <Card key={vp.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {vp.type === 'mobile' && <Smartphone className="h-4 w-4" />}
                          {vp.type === 'tablet' && <Tablet className="h-4 w-4" />}
                          {vp.type === 'desktop' && <Monitor className="h-4 w-4" />}
                          <CardTitle className="text-sm">{vp.label}</CardTitle>
                        </div>
                        <div className={cn("text-lg font-bold", getScoreColor(score))}>
                          {score}%
                        </div>
                      </div>
                      <CardDescription>{vp.width} × {vp.height}px</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Issues</span>
                          <span className="font-medium">{vpIssues.length}</span>
                        </div>
                        <div className="flex gap-2">
                          {vpIssues.filter(i => i.severity === 'P0').length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {vpIssues.filter(i => i.severity === 'P0').length} P0
                            </Badge>
                          )}
                          {vpIssues.filter(i => i.severity === 'P1').length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                              {vpIssues.filter(i => i.severity === 'P1').length} P1
                            </Badge>
                          )}
                          {vpIssues.filter(i => i.severity === 'P2').length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {vpIssues.filter(i => i.severity === 'P2').length} P2
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(scores.byComponentFamily).map(([family, score]) => {
                const familyIssues = mockIssues.filter(i => 
                  i.component?.toLowerCase().includes(family) || 
                  i.category === family ||
                  i.selector.includes(family)
                );
                return (
                  <Card key={family}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm capitalize">{family}</CardTitle>
                        <div className={cn("text-lg font-bold", getScoreColor(score))}>
                          {score}%
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Progress value={score} className="h-2 mb-3" />
                      <div className="text-xs text-muted-foreground">
                        {familyIssues.length} issues detected
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Fix Recommendations</CardTitle>
                <CardDescription>Grouped by component and pattern</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(fixPatterns).slice(0, 6).map(([category, patterns]) => {
                  const categoryIssues = mockIssues.filter(i => i.category === category);
                  if (categoryIssues.length === 0) return null;
                  
                  return (
                    <div key={category} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium capitalize">{category.replace('-', ' ')}</h3>
                        <Badge variant="outline">{categoryIssues.length} issues</Badge>
                      </div>
                      <div className="space-y-2">
                        {patterns.slice(0, 2).map((pattern, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{pattern}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-muted-foreground">Affected files:</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[...new Set(categoryIssues.map(i => i.file).filter(Boolean))].slice(0, 3).map(file => (
                            <Badge key={file} variant="secondary" className="text-xs">
                              {file?.split('/').pop()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Score Card Component
function ScoreCard({ 
  title, 
  score, 
  icon, 
  subtitle,
  isCount = false,
  variant = 'default'
}: { 
  title: string; 
  score: number; 
  icon: React.ReactNode;
  subtitle?: string;
  isCount?: boolean;
  variant?: 'default' | 'destructive' | 'warning' | 'success';
}) {
  const getVariantColor = () => {
    switch (variant) {
      case 'destructive': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-amber-600 bg-amber-50';
      case 'success': return 'text-green-600 bg-green-50';
      default: return isCount ? 'text-foreground bg-muted' : `${getScoreColor(score)} ${getScoreBgColor(score)}`;
    }
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", getVariantColor().split(' ')[1])}>
            {icon}
          </div>
          <div className={cn("text-3xl font-bold", getVariantColor().split(' ')[0])}>
            {isCount ? score : `${score}%`}
          </div>
        </div>
        <div className="mt-3">
          <div className="text-sm font-medium">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// Issue Row Component
function IssueRow({ 
  issue, 
  compact = false,
  expanded = false,
  onToggle
}: { 
  issue: ResponsiveIssue; 
  compact?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors",
      issue.severity === 'P0' && "border-red-200 bg-red-50/50",
      issue.severity === 'P1' && "border-amber-200 bg-amber-50/50",
      issue.severity === 'P2' && "border-gray-200",
      issue.severity === 'P3' && "border-gray-100",
    )}>
      <div 
        className={cn("flex items-center gap-3", onToggle && "cursor-pointer")}
        onClick={onToggle}
      >
        {onToggle && (
          <div className="shrink-0">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        )}
        <Badge variant={getSeverityBadgeVariant(issue.severity)} className="shrink-0">
          {issue.severity}
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{issue.element}</div>
          {!compact && (
            <div className="text-xs text-muted-foreground truncate">{issue.description}</div>
          )}
        </div>
        <Badge variant="outline" className="text-xs shrink-0">{issue.viewport}</Badge>
        <Badge variant="secondary" className="text-xs shrink-0 capitalize">{issue.category.replace('-', ' ')}</Badge>
      </div>
      
      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Route</div>
              <div className="font-mono text-xs">{issue.route}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Selector</div>
              <div className="font-mono text-xs">{issue.selector}</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Measured</div>
            <div className="font-mono text-xs bg-muted p-2 rounded mt-1">
              {JSON.stringify(issue.measured, null, 2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Recommendation</div>
            <div className="text-sm">{issue.recommendation}</div>
          </div>
          {issue.file && (
            <div>
              <div className="text-xs text-muted-foreground">File</div>
              <Badge variant="secondary" className="text-xs">{issue.file}</Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ResponsiveAuditPage;
