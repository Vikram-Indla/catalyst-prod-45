/**
 * Gap Detection Grid Component
 * Shows pages/components not aligned with design system baseline
 */

import { useState, useMemo } from 'react';
import { 
  AlertTriangle, Filter, Wrench, 
  FileCode, Zap, Smartphone, Copy, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  detectedGaps, 
  responsivenessGaps,
  type DesignGap,
  type ResponsivenessGap,
} from '@/lib/designAudit/designSystemBaseline';
import { toast } from 'sonner';

interface GapDetectionGridProps {
  onFixSelected?: (gaps: DesignGap[]) => void;
}

// Generate fix instruction for a gap
function generateFixInstruction(gap: DesignGap | ResponsivenessGap): string {
  if ('component' in gap) {
    // Design gap
    return `Fix design system gap in ${gap.file || gap.component}:

**Issue:** ${gap.component} uses ${gap.property}: ${gap.current}
**Expected:** ${gap.property}: ${gap.expected} (per design baseline)
**Route:** ${gap.route}
**Category:** ${gap.category}
**Severity:** ${gap.severity}

Please update the ${gap.property} value from "${gap.current}" to "${gap.expected}" to align with the Catalyst design system baseline.`;
  } else {
    // Responsiveness gap
    return `Fix responsive issue on ${gap.route}:

**Route:** ${gap.route}
**Viewport:** ${gap.viewport}
**Score:** ${gap.score}%
**Issues:** ${gap.issues} (P0: ${gap.p0}, P1: ${gap.p1})
**Top Issue:** ${gap.topIssue}

Please fix the "${gap.topIssue}" responsiveness issue on ${gap.route} at ${gap.viewport} viewport. Ensure the layout doesn't overflow, elements are properly sized, and touch targets meet minimum 44px requirements.`;
  }
}

// Copy instruction to clipboard and show toast
async function copyFixInstruction(gap: DesignGap | ResponsivenessGap) {
  const instruction = generateFixInstruction(gap);
  try {
    await navigator.clipboard.writeText(instruction);
    toast.success('Fix instruction copied! Paste it in the chat to fix this issue.');
  } catch {
    toast.error('Failed to copy instruction');
  }
}

export function GapDetectionGrid({ onFixSelected }: GapDetectionGridProps) {
  const [selectedGaps, setSelectedGaps] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showResponsive, setShowResponsive] = useState(false);

  // Filter gaps
  const filteredGaps = useMemo(() => {
    return detectedGaps.filter(gap => {
      if (categoryFilter !== 'all' && gap.category !== categoryFilter) return false;
      if (severityFilter !== 'all' && gap.severity !== severityFilter) return false;
      return true;
    });
  }, [categoryFilter, severityFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: detectedGaps.length,
    p0: detectedGaps.filter(g => g.severity === 'P0').length,
    p1: detectedGaps.filter(g => g.severity === 'P1').length,
    p2: detectedGaps.filter(g => g.severity === 'P2').length,
    p3: detectedGaps.filter(g => g.severity === 'P3').length,
    autoFixable: detectedGaps.filter(g => g.autoFixable).length,
    responsive: responsivenessGaps.length,
  }), []);

  const toggleGap = (id: string) => {
    const newSet = new Set(selectedGaps);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedGaps(newSet);
  };

  const selectAll = () => {
    if (selectedGaps.size === filteredGaps.length) {
      setSelectedGaps(new Set());
    } else {
      setSelectedGaps(new Set(filteredGaps.map(g => g.id)));
    }
  };

  const handleFixSelected = () => {
    const gaps = detectedGaps.filter(g => selectedGaps.has(g.id));
    const autoFixable = gaps.filter(g => g.autoFixable);
    const manual = gaps.filter(g => !g.autoFixable);
    
    if (autoFixable.length > 0) {
      toast.success(`Queued ${autoFixable.length} auto-fixable issues for repair`);
    }
    if (manual.length > 0) {
      toast.info(`${manual.length} issues require manual intervention`);
    }
    
    onFixSelected?.(gaps);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'P0': return 'bg-destructive text-destructive-foreground';
      case 'P1': return 'bg-warning text-warning-foreground';
      case 'P2': return 'bg-info text-info-foreground';
      case 'P3': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'color': return <div className="h-3 w-3 rounded bg-brand-gold" />;
      case 'spacing': return <div className="h-3 w-3 border-2 border-current rounded" />;
      case 'typography': return <span className="text-[10px] font-bold">Aa</span>;
      case 'layout': return <div className="h-3 w-3 grid grid-cols-2 gap-0.5"><div className="bg-current rounded-sm" /><div className="bg-current rounded-sm" /><div className="bg-current rounded-sm" /><div className="bg-current rounded-sm" /></div>;
      case 'component': return <FileCode className="h-3 w-3" />;
      case 'responsive': return <Smartphone className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total Gaps</div>
        </Card>
        <Card className={cn("p-3", stats.p0 > 0 && "border-destructive/50")}>
          <div className="text-2xl font-bold text-destructive">{stats.p0}</div>
          <div className="text-xs text-muted-foreground">P0 Critical</div>
        </Card>
        <Card className={cn("p-3", stats.p1 > 0 && "border-warning/50")}>
          <div className="text-2xl font-bold text-warning">{stats.p1}</div>
          <div className="text-xs text-muted-foreground">P1 Major</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-info">{stats.p2}</div>
          <div className="text-xs text-muted-foreground">P2 Medium</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-muted-foreground">{stats.p3}</div>
          <div className="text-xs text-muted-foreground">P3 Minor</div>
        </Card>
        <Card className="p-3 border-success/50">
          <div className="text-2xl font-bold text-success">{stats.autoFixable}</div>
          <div className="text-xs text-muted-foreground">Auto-fixable</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-brand-gold">{stats.responsive}</div>
          <div className="text-xs text-muted-foreground">Responsive</div>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="color">Color</SelectItem>
              <SelectItem value="spacing">Spacing</SelectItem>
              <SelectItem value="typography">Typography</SelectItem>
              <SelectItem value="layout">Layout</SelectItem>
              <SelectItem value="component">Component</SelectItem>
              <SelectItem value="responsive">Responsive</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="P0">P0 Critical</SelectItem>
              <SelectItem value="P1">P1 Major</SelectItem>
              <SelectItem value="P2">P2 Medium</SelectItem>
              <SelectItem value="P3">P3 Minor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowResponsive(!showResponsive)}
          className={showResponsive ? 'bg-brand-gold/10 border-brand-gold/30' : ''}
        >
          <Smartphone className="h-4 w-4 mr-1.5" />
          Responsive Gaps
        </Button>

        {selectedGaps.size > 0 && (
          <Button size="sm" onClick={handleFixSelected} className="bg-brand-gold hover:bg-brand-gold-hover">
            <Wrench className="h-4 w-4 mr-1.5" />
            Fix Selected ({selectedGaps.size})
          </Button>
        )}
      </div>

      {/* Gap Grid */}
      {!showResponsive ? (
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Design Gaps ({filteredGaps.length})
                </CardTitle>
                <CardDescription>Pages and components not aligned with baseline</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedGaps.size === filteredGaps.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="divide-y">
                {filteredGaps.map(gap => (
                  <div 
                    key={gap.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors",
                      selectedGaps.has(gap.id) && "bg-brand-gold/5"
                    )}
                  >
                    <Checkbox
                      checked={selectedGaps.has(gap.id)}
                      onCheckedChange={() => toggleGap(gap.id)}
                    />
                    
                    <Badge className={cn("text-xs shrink-0", getSeverityColor(gap.severity))}>
                      {gap.severity}
                    </Badge>
                    
                    <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                      {getCategoryIcon(gap.category)}
                      <span className="text-xs capitalize">{gap.category}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{gap.component}</span>
                        <code className="text-[10px] text-muted-foreground bg-secondary px-1 rounded">
                          {gap.route}
                        </code>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span className="text-destructive">{gap.current}</span>
                        {' → '}
                        <span className="text-success">{gap.expected}</span>
                        <span className="ml-2 text-muted-foreground">({gap.property})</span>
                      </div>
                    </div>
                    
                    {gap.autoFixable ? (
                      <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                        <Zap className="h-3 w-3 mr-1" />
                        Auto-fix
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Manual</Badge>
                    )}
                    
                    {gap.file && (
                      <code className="text-[10px] text-muted-foreground shrink-0">{gap.file}</code>
                    )}

                    {/* Fix Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 gap-1.5 shrink-0 hover:bg-brand-gold/10 hover:border-brand-gold/30 hover:text-brand-gold"
                          onClick={() => copyFixInstruction(gap)}
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span className="text-xs">Fix</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="text-xs">Copy fix instruction to clipboard, then paste in chat to fix this issue</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        /* Responsive Gaps View */
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-brand-gold" />
              Responsive Gaps ({responsivenessGaps.length})
            </CardTitle>
            <CardDescription>Routes with responsiveness issues by viewport</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card border-b">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Route</th>
                    <th className="text-left font-medium px-4 py-2">Viewport</th>
                    <th className="text-center font-medium px-4 py-2">Score</th>
                    <th className="text-center font-medium px-4 py-2">Issues</th>
                    <th className="text-center font-medium px-4 py-2">P0/P1</th>
                    <th className="text-left font-medium px-4 py-2">Top Issue</th>
                    <th className="text-right font-medium px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {responsivenessGaps.map((gap, idx) => (
                    <tr key={idx} className="border-b hover:bg-secondary/30">
                      <td className="px-4 py-2">
                        <code className="text-xs px-1.5 py-0.5 bg-secondary rounded">{gap.route}</code>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{gap.viewport}</td>
                      <td className="px-4 py-2 text-center">
                        <Badge className={cn(
                          "text-xs",
                          gap.score >= 80 ? "bg-success/10 text-success" :
                          gap.score >= 60 ? "bg-warning/10 text-warning" :
                          "bg-destructive/10 text-destructive"
                        )}>
                          {gap.score}%
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-center font-medium">{gap.issues}</td>
                      <td className="px-4 py-2 text-center">
                        {gap.p0 > 0 && <Badge className="bg-destructive text-xs mr-1">{gap.p0}</Badge>}
                        {gap.p1 > 0 && <Badge className="bg-warning text-xs">{gap.p1}</Badge>}
                        {gap.p0 === 0 && gap.p1 === 0 && <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{gap.topIssue}</td>
                      <td className="px-4 py-2 text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 gap-1.5 hover:bg-brand-gold/10 hover:border-brand-gold/30 hover:text-brand-gold"
                              onClick={() => copyFixInstruction(gap)}
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span className="text-xs">Fix</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <p className="text-xs">Copy fix instruction to clipboard, then paste in chat</p>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
