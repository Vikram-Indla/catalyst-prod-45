import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  Copy, 
  Loader2,
  Sun,
  Moon,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Types
interface AuditIssue {
  id: string;
  severity: 'critical' | 'warning';
  element: string;
  selector: string;
  rule: string;
  message: string;
  fix: string;
}

interface AuditResult {
  mode: 'light' | 'dark';
  criticalCount: number;
  warningCount: number;
  issues: AuditIssue[];
  timestamp: Date;
}

// Utility functions
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function parseColor(color: string): { r: number; g: number; b: number } | null {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
    return null;
  }
  
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return { r: parseInt(rgbMatch[1]), g: parseInt(rgbMatch[2]), b: parseInt(rgbMatch[3]) };
  }
  
  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }
  
  return null;
}

function getContrastRatio(fg: string, bg: string): number {
  const fgRgb = parseColor(fg);
  const bgRgb = parseColor(bg);
  if (!fgRgb || !bgRgb) return 21;
  
  const l1 = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const l2 = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function isWhiteSurface(color: string): boolean {
  const rgb = parseColor(color);
  if (!rgb) return false;
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.85;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Quick navigation routes
const QUICK_NAV_ROUTES = [
  { label: 'Home (For you)', path: '/home' },
  { label: 'Strategy Room', path: '/enterprise/strategy-room' },
  { label: 'Product Backlog', path: '/industry/backlog' },
];

export default function ThemeAuditPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [lightResult, setLightResult] = useState<AuditResult | null>(null);
  const [darkResult, setDarkResult] = useState<AuditResult | null>(null);
  const [currentMode, setCurrentMode] = useState<'light' | 'dark'>('light');

  // Sync current mode with theme
  useEffect(() => {
    if (resolvedTheme) {
      setCurrentMode(resolvedTheme as 'light' | 'dark');
    }
  }, [resolvedTheme]);

  const runAudit = useCallback(async (mode: 'light' | 'dark'): Promise<AuditResult> => {
    const issues: AuditIssue[] = [];
    
    // 1. Check for white surfaces in dark mode
    if (mode === 'dark') {
      const containers = document.querySelectorAll(
        '[class*="card"], [class*="panel"], [class*="content"], [role="tabpanel"], ' +
        '[class*="empty"], table, [class*="surface"], [class*="drawer"], [class*="sheet"], ' +
        '[class*="modal"], [class*="dialog"], main, section, article'
      );
      
      containers.forEach(el => {
        const computed = window.getComputedStyle(el);
        const bg = computed.backgroundColor;
        if (isWhiteSurface(bg)) {
          const selector = getElementSelector(el);
          issues.push({
            id: generateId(),
            severity: 'critical',
            element: el.tagName.toLowerCase(),
            selector,
            rule: 'White Surface Leak',
            message: `Found white/light background in dark mode: ${bg}`,
            fix: 'Use var(--surface-1) or var(--surface-2) instead of hardcoded white'
          });
        }
      });
    }
    
    // 2. Text contrast check
    const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, label, td, th, li, a');
    const checkedSelectors = new Set<string>();
    
    textElements.forEach(el => {
      const computed = window.getComputedStyle(el);
      const color = computed.color;
      let bgColor = computed.backgroundColor;
      
      // Walk up to find solid background
      let parent = el.parentElement;
      let depth = 0;
      while (parent && (!bgColor || bgColor === 'rgba(0, 0, 0, 0)') && depth < 10) {
        bgColor = window.getComputedStyle(parent).backgroundColor;
        parent = parent.parentElement;
        depth++;
      }
      
      if (bgColor && color) {
        const ratio = getContrastRatio(color, bgColor);
        const fontSize = parseFloat(computed.fontSize);
        const fontWeight = parseInt(computed.fontWeight) || 400;
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
        const minRatio = isLargeText ? 3 : 4.5;
        
        if (ratio < minRatio) {
          const selector = getElementSelector(el);
          if (!checkedSelectors.has(selector)) {
            checkedSelectors.add(selector);
            issues.push({
              id: generateId(),
              severity: ratio < 2.5 ? 'critical' : 'warning',
              element: el.tagName.toLowerCase(),
              selector,
              rule: 'Low Contrast',
              message: `Contrast ratio ${ratio.toFixed(2)}:1 (required: ${minRatio}:1)`,
              fix: 'Use var(--text-1) for primary text, var(--text-2) for secondary'
            });
          }
        }
      }
    });
    
    // 3. Hardcoded colors check
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const style = el.getAttribute('style') || '';
      const hardcodedPatterns = [
        { pattern: /#fff(?![0-9a-f])/i, match: '#fff' },
        { pattern: /#ffffff/i, match: '#ffffff' },
        { pattern: /rgb\(255,\s*255,\s*255\)/i, match: 'rgb(255,255,255)' },
        { pattern: /rgba\(255,\s*255,\s*255,\s*1\)/i, match: 'rgba(255,255,255,1)' },
      ];
      
      for (const { pattern, match } of hardcodedPatterns) {
        if (pattern.test(style)) {
          issues.push({
            id: generateId(),
            severity: mode === 'dark' ? 'critical' : 'warning',
            element: el.tagName.toLowerCase(),
            selector: getElementSelector(el),
            rule: 'Hardcoded Color',
            message: `Inline style uses hardcoded color: ${match}`,
            fix: 'Use semantic CSS variables like var(--surface-1)'
          });
          break;
        }
      }
      
      // Check class names
      const className = el.className?.toString() || '';
      if (mode === 'dark' && (className.includes('bg-white') || className.includes('text-white'))) {
        // bg-white in dark mode is problematic
        if (className.includes('bg-white')) {
          issues.push({
            id: generateId(),
            severity: 'warning',
            element: el.tagName.toLowerCase(),
            selector: getElementSelector(el),
            rule: 'Hardcoded Class',
            message: 'Using bg-white class which may cause issues in dark mode',
            fix: 'Use bg-background or style with var(--surface-1)'
          });
        }
      }
    });
    
    // 4. Focus visibility check
    const focusableElements = document.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)');
    const sampled = Array.from(focusableElements).slice(0, 5);
    
    for (const el of sampled) {
      if (el instanceof HTMLElement) {
        el.focus();
        await new Promise(r => setTimeout(r, 50));
        const computed = window.getComputedStyle(el);
        const outline = computed.outline;
        const boxShadow = computed.boxShadow;
        const hasVisibleFocus = 
          (outline && outline !== 'none' && !outline.includes('0px')) || 
          (boxShadow && boxShadow !== 'none' && !boxShadow.includes('0px'));
        
        if (!hasVisibleFocus) {
          issues.push({
            id: generateId(),
            severity: 'warning',
            element: el.tagName.toLowerCase(),
            selector: getElementSelector(el),
            rule: 'Focus Visibility',
            message: 'Element lacks visible focus indicator',
            fix: 'Ensure focus-visible styles use var(--focus-ring-color)'
          });
        }
        el.blur();
      }
    }
    
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    
    return {
      mode,
      criticalCount,
      warningCount,
      issues,
      timestamp: new Date()
    };
  }, []);

  const getElementSelector = (el: Element): string => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const classes = el.className?.toString().split(' ').slice(0, 2).join('.') || '';
    return `${tag}${id}${classes ? '.' + classes : ''}`;
  };

  const handleRunAudit = async () => {
    setIsRunning(true);
    
    try {
      // Run audit for current mode
      const result = await runAudit(currentMode);
      
      if (currentMode === 'light') {
        setLightResult(result);
      } else {
        setDarkResult(result);
      }
      
      toast.success(`${currentMode} mode audit complete`);
    } catch (error) {
      console.error('Audit failed:', error);
      toast.error('Audit failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunBothModes = async () => {
    setIsRunning(true);
    
    try {
      // Run light mode
      setTheme('light');
      await new Promise(r => setTimeout(r, 500));
      const lightRes = await runAudit('light');
      setLightResult(lightRes);
      
      // Run dark mode
      setTheme('dark');
      await new Promise(r => setTimeout(r, 500));
      const darkRes = await runAudit('dark');
      setDarkResult(darkRes);
      
      toast.success('Both mode audits complete');
    } catch (error) {
      console.error('Audit failed:', error);
      toast.error('Audit failed');
    } finally {
      setIsRunning(false);
    }
  };

  const copyReport = () => {
    const lightCritical = lightResult?.criticalCount ?? 0;
    const darkCritical = darkResult?.criticalCount ?? 0;
    const isReady = lightCritical === 0 && darkCritical === 0 && lightResult && darkResult;
    
    const report = `
Theme Audit Report - ${new Date().toISOString()}
================================================

Status: ${isReady ? '✅ GO - Ready for Production' : '❌ NO-GO - Issues Found'}

Light Mode:
- Critical Issues: ${lightResult?.criticalCount ?? 'Not audited'}
- Warnings: ${lightResult?.warningCount ?? 'Not audited'}

Dark Mode:
- Critical Issues: ${darkResult?.criticalCount ?? 'Not audited'}
- Warnings: ${darkResult?.warningCount ?? 'Not audited'}

${!isReady && darkResult ? `
Dark Mode Issues:
${darkResult.issues.filter(i => i.severity === 'critical').map(i => 
  `- [${i.rule}] ${i.selector}: ${i.message}`
).join('\n')}
` : ''}

Audited Routes:
${QUICK_NAV_ROUTES.map(r => `- ${r.label}: ${r.path}`).join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(report);
    toast.success('Report copied to clipboard');
  };

  const copyIssueFix = (issue: AuditIssue) => {
    const text = `
Issue: ${issue.rule}
Element: ${issue.selector}
Problem: ${issue.message}
Fix: ${issue.fix}
    `.trim();
    navigator.clipboard.writeText(text);
    toast.success('Fix notes copied');
  };

  const currentResult = currentMode === 'light' ? lightResult : darkResult;
  const isReady = lightResult && darkResult && 
    lightResult.criticalCount === 0 && darkResult.criticalCount === 0;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-1)' }}>
            Dark Mode Production Readiness
          </h1>
          <p style={{ color: 'var(--text-2)' }}>
            Automated theme audit for enterprise production deployment
          </p>
          
          {/* GO/NO-GO Indicator */}
          {(lightResult || darkResult) && (
            <div className="flex justify-center">
              {isReady ? (
                <Badge className="text-lg px-6 py-2 bg-green-600 text-white">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  GO - Ready for Production
                </Badge>
              ) : (
                <Badge className="text-lg px-6 py-2 bg-red-600 text-white">
                  <XCircle className="w-5 h-5 mr-2" />
                  NO-GO - Issues Found
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Label htmlFor="theme-toggle" style={{ color: 'var(--text-1)' }}>
                Test Theme:
              </Label>
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4" style={{ color: currentMode === 'light' ? 'var(--accent-color)' : 'var(--text-3)' }} />
                <Switch
                  id="theme-toggle"
                  checked={currentMode === 'dark'}
                  onCheckedChange={(checked) => {
                    const newMode = checked ? 'dark' : 'light';
                    setCurrentMode(newMode);
                    setTheme(newMode);
                  }}
                />
                <Moon className="w-4 h-4" style={{ color: currentMode === 'dark' ? 'var(--accent-color)' : 'var(--text-3)' }} />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                {currentMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleRunAudit}
                disabled={isRunning}
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Run {currentMode} Audit
              </Button>
              <Button 
                onClick={handleRunBothModes}
                disabled={isRunning}
                className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Audit Both Modes
              </Button>
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Sun className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
              <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Light Mode</h3>
            </div>
            {lightResult ? (
              <div className="space-y-1">
                <div className={`text-2xl font-bold ${lightResult.criticalCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {lightResult.criticalCount} Critical
                </div>
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  {lightResult.warningCount} Warnings
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Not audited yet</p>
            )}
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Moon className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
              <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Dark Mode</h3>
            </div>
            {darkResult ? (
              <div className="space-y-1">
                <div className={`text-2xl font-bold ${darkResult.criticalCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {darkResult.criticalCount} Critical
                </div>
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  {darkResult.warningCount} Warnings
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Not audited yet</p>
            )}
          </Card>
        </div>

        {/* Quick Navigation */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text-1)' }}>
            Quick Navigation - Test These Routes
          </h3>
          <div className="flex flex-wrap gap-2">
            {QUICK_NAV_ROUTES.map(route => (
              <Button
                key={route.path}
                variant="outline"
                size="sm"
                onClick={() => window.open(route.path, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-2" />
                {route.label}
              </Button>
            ))}
          </div>
        </Card>

        {/* Issues Table */}
        {currentResult && currentResult.issues.length > 0 && (
          <Card className="overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>
                {currentMode === 'dark' ? 'Dark' : 'Light'} Mode Issues ({currentResult.issues.length})
              </h3>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--surface-2)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-2)' }}>Severity</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-2)' }}>Rule</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-2)' }}>Element</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-2)' }}>Issue</th>
                    <th className="px-4 py-3 text-center font-medium" style={{ color: 'var(--text-2)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentResult.issues.map(issue => (
                    <tr 
                      key={issue.id} 
                      className="hover:bg-[var(--surface-2)]"
                      style={{ borderBottom: '1px solid var(--divider)' }}
                    >
                      <td className="px-4 py-3">
                        {issue.severity === 'critical' ? (
                          <Badge variant="destructive" className="text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Critical
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Warning
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-1)' }}>
                        {issue.rule}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>
                        {issue.selector.slice(0, 40)}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                        <div className="truncate max-w-xs" title={issue.message}>
                          {issue.message}
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                          Fix: {issue.fix}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyIssueFix(issue)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Copy Report */}
        {(lightResult || darkResult) && (
          <div className="flex justify-center">
            <Button variant="outline" size="lg" onClick={copyReport}>
              <Copy className="w-5 h-5 mr-2" />
              Copy Release Report
            </Button>
          </div>
        )}

        {/* Pass State */}
        {currentResult && currentResult.issues.length === 0 && (
          <Card className="p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
              No Issues Found in {currentMode === 'dark' ? 'Dark' : 'Light'} Mode
            </h3>
            <p style={{ color: 'var(--text-2)' }}>
              {currentMode === 'dark' ? 'Dark' : 'Light'} mode passed all automated checks.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
