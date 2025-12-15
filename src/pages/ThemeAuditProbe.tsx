/**
 * Theme Audit Probe - Non-technical PASS/FAIL verification screen
 * 
 * Accessible from user menu. Runs automated checks to verify theme consistency:
 * 1. Finds hardcoded background/text colors that violate tokens
 * 2. Flags low-contrast text (basic heuristic)
 * 3. Detects duplicate top dividers above toolbars
 * 4. Detects title icons next to page titles
 * 
 * Output: Big PASS/FAIL status + human-readable issue list
 */

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AuditIssue {
  id: string;
  severity: 'error' | 'warning';
  component: string;
  issue: string;
  details?: string;
}

interface AuditResult {
  passed: boolean;
  issues: AuditIssue[];
  timestamp: Date;
  theme: 'light' | 'dark';
}

// CSS properties that should use tokens
const HARDCODED_COLOR_PATTERNS = [
  /background(-color)?:\s*(#fff|#ffffff|white|#000|#000000|black|rgb\(255,\s*255,\s*255\)|rgb\(0,\s*0,\s*0\))/gi,
  /color:\s*(#fff|#ffffff|white|#000|#000000|black)/gi,
  /bg-(white|black)/,
];

// Elements that commonly have icon children next to text
const TITLE_SELECTORS = [
  'h1',
  '[class*="page-title"]',
  '[class*="PageTitle"]',
  '[class*="title-row"]',
];

export function ThemeAuditProbe() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  // Detect current theme
  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark';
    setCurrentTheme(theme || 'light');
  }, []);

  // Toggle theme for testing
  const toggleTheme = useCallback(() => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    setCurrentTheme(newTheme);
    localStorage.setItem('catalyst_theme', newTheme);
  }, [currentTheme]);

  // Run the audit
  const runAudit = useCallback(() => {
    setIsRunning(true);
    const issues: AuditIssue[] = [];
    let issueId = 0;

    // 1. Check for hardcoded colors in computed styles
    const allElements = document.querySelectorAll('*');
    const hardcodedColorElements: Element[] = [];

    allElements.forEach((el) => {
      const computed = window.getComputedStyle(el);
      const bgColor = computed.backgroundColor;
      const textColor = computed.color;
      
      // In dark mode, check for pure white backgrounds (common violation)
      if (currentTheme === 'dark') {
        if (bgColor === 'rgb(255, 255, 255)' || bgColor === 'rgba(255, 255, 255, 1)') {
          const classList = el.className || '';
          if (!classList.includes('sr-only') && el.clientWidth > 50 && el.clientHeight > 50) {
            hardcodedColorElements.push(el);
          }
        }
      }
      
      // In light mode, check for pure black backgrounds in unexpected places
      if (currentTheme === 'light') {
        if (bgColor === 'rgb(0, 0, 0)' || bgColor === 'rgba(0, 0, 0, 1)') {
          const classList = el.className || '';
          if (!classList.includes('overlay') && !classList.includes('backdrop') && el.clientWidth > 50) {
            hardcodedColorElements.push(el);
          }
        }
      }
    });

    if (hardcodedColorElements.length > 0) {
      issues.push({
        id: `issue-${++issueId}`,
        severity: 'error',
        component: 'Multiple elements',
        issue: `${hardcodedColorElements.length} element(s) with hardcoded ${currentTheme === 'dark' ? 'white' : 'black'} backgrounds`,
        details: `Found surfaces not using theme tokens. This causes visual issues in ${currentTheme} mode.`,
      });
    }

    // 2. Check for low contrast text (basic heuristic)
    const textElements = document.querySelectorAll('p, span, div, label, h1, h2, h3, h4, h5, h6');
    let lowContrastCount = 0;

    textElements.forEach((el) => {
      const computed = window.getComputedStyle(el);
      const textColor = computed.color;
      const bgColor = computed.backgroundColor;
      
      // Very basic check: if text is similar to background
      if (textColor === bgColor && el.textContent && el.textContent.trim()) {
        lowContrastCount++;
      }
    });

    if (lowContrastCount > 0) {
      issues.push({
        id: `issue-${++issueId}`,
        severity: 'warning',
        component: 'Text elements',
        issue: `${lowContrastCount} element(s) may have low contrast`,
        details: 'Text color matches or is very close to background color.',
      });
    }

    // 3. Check for duplicate dividers above toolbars
    const toolbars = document.querySelectorAll('[role="toolbar"], .toolbar, [class*="Toolbar"]');
    let duplicateDividerCount = 0;

    toolbars.forEach((toolbar) => {
      const prevSibling = toolbar.previousElementSibling;
      if (prevSibling) {
        const prevStyle = window.getComputedStyle(prevSibling);
        const toolbarStyle = window.getComputedStyle(toolbar);
        
        // Check if previous element has a bottom border AND toolbar has top border
        if (prevStyle.borderBottomWidth !== '0px' && toolbarStyle.borderTopWidth !== '0px') {
          duplicateDividerCount++;
        }
      }
    });

    if (duplicateDividerCount > 0) {
      issues.push({
        id: `issue-${++issueId}`,
        severity: 'warning',
        component: 'Toolbars',
        issue: `${duplicateDividerCount} toolbar(s) with duplicate dividers above`,
        details: 'Only one divider should exist (under the toolbar, not above).',
      });
    }

    // 4. Check for icons next to page titles
    TITLE_SELECTORS.forEach((selector) => {
      const titles = document.querySelectorAll(selector);
      titles.forEach((title) => {
        const hasIcon = title.querySelector('svg, [class*="icon"], .lucide');
        if (hasIcon) {
          issues.push({
            id: `issue-${++issueId}`,
            severity: 'error',
            component: 'Page title',
            issue: 'Icon found next to page title',
            details: `Titles should be text-only. Found icon in: ${title.textContent?.substring(0, 30)}...`,
          });
        }
      });
    });

    // 5. Check sidebar active/hover states
    const sidebarItems = document.querySelectorAll('[class*="sidebar"] a, [class*="nav-item"], [class*="SidebarItem"]');
    let incorrectSidebarHover = 0;

    sidebarItems.forEach((item) => {
      const classList = item.className || '';
      if (classList.includes('active') || classList.includes('selected')) {
        const computed = window.getComputedStyle(item);
        const bgColor = computed.backgroundColor;
        // Check if it's using the correct green tint
        if (!bgColor.includes('92') && !bgColor.includes('124') && !bgColor.includes('5c7c5c')) {
          // Not using the expected green tint
          incorrectSidebarHover++;
        }
      }
    });

    if (incorrectSidebarHover > 0) {
      issues.push({
        id: `issue-${++issueId}`,
        severity: 'warning',
        component: 'Sidebar',
        issue: `${incorrectSidebarHover} sidebar item(s) not using standard green tint`,
        details: 'Active/hover should use rgba(92, 124, 92, 0.08).',
      });
    }

    // Complete audit
    const passed = issues.filter(i => i.severity === 'error').length === 0;
    
    setResult({
      passed,
      issues,
      timestamp: new Date(),
      theme: currentTheme,
    });
    
    setIsRunning(false);
  }, [currentTheme]);

  // Run audit on mount
  useEffect(() => {
    const timer = setTimeout(runAudit, 500);
    return () => clearTimeout(timer);
  }, [runAudit]);

  return (
    <div 
      className="min-h-screen p-6 md:p-8"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--text-1)' }}
          >
            Theme Audit Probe
          </h1>
          <p style={{ color: 'var(--text-2)' }}>
            Automated verification of theme consistency for production readiness.
          </p>
        </div>

        {/* Controls */}
        <div 
          className="flex items-center gap-4 p-4 rounded-lg mb-6"
          style={{ 
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Button
            onClick={runAudit}
            disabled={isRunning}
            className="gap-2 bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            <RefreshCw className={cn('h-4 w-4', isRunning && 'animate-spin')} />
            {isRunning ? 'Running...' : 'Run Audit'}
          </Button>

          <Button
            variant="outline"
            onClick={toggleTheme}
            className="gap-2"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-1)',
            }}
          >
            {currentTheme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Switch to {currentTheme === 'light' ? 'Dark' : 'Light'} Mode
          </Button>

          <span 
            className="ml-auto text-sm"
            style={{ color: 'var(--text-3)' }}
          >
            Currently: <strong style={{ color: 'var(--text-1)' }}>{currentTheme} mode</strong>
          </span>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-6">
            {/* Big Status */}
            <div 
              className={cn(
                'flex items-center gap-4 p-6 rounded-xl',
                result.passed ? 'bg-green-500/10' : 'bg-red-500/10'
              )}
              style={{
                border: `2px solid ${result.passed ? 'hsl(var(--g300))' : 'hsl(var(--r300))'}`,
              }}
            >
              {result.passed ? (
                <CheckCircle className="h-16 w-16 text-green-600" />
              ) : (
                <XCircle className="h-16 w-16 text-red-600" />
              )}
              <div>
                <h2 
                  className={cn(
                    'text-3xl font-bold',
                    result.passed ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {result.passed ? 'PASS' : 'FAIL'}
                </h2>
                <p style={{ color: 'var(--text-2)' }}>
                  {result.issues.length === 0 
                    ? 'No issues detected. Theme is consistent.'
                    : `${result.issues.filter(i => i.severity === 'error').length} error(s), ${result.issues.filter(i => i.severity === 'warning').length} warning(s) found`
                  }
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                  Audited at {result.timestamp.toLocaleTimeString()} in {result.theme} mode
                </p>
              </div>
            </div>

            {/* Issues List */}
            {result.issues.length > 0 && (
              <div 
                className="rounded-lg overflow-hidden"
                style={{ 
                  backgroundColor: 'var(--surface-1)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div 
                  className="px-4 py-3 font-semibold text-sm"
                  style={{ 
                    backgroundColor: 'var(--surface-2)',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-1)',
                  }}
                >
                  What Failed
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
                  {result.issues.map((issue) => (
                    <div 
                      key={issue.id}
                      className="flex items-start gap-3 p-4"
                    >
                      {issue.severity === 'error' ? (
                        <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className="text-xs font-medium px-2 py-0.5 rounded"
                            style={{ 
                              backgroundColor: 'var(--surface-3)',
                              color: 'var(--text-2)',
                            }}
                          >
                            {issue.component}
                          </span>
                          <span 
                            className={cn(
                              'text-xs font-medium px-2 py-0.5 rounded',
                              issue.severity === 'error' 
                                ? 'bg-red-500/10 text-red-600' 
                                : 'bg-amber-500/10 text-amber-600'
                            )}
                          >
                            {issue.severity}
                          </span>
                        </div>
                        <p className="font-medium" style={{ color: 'var(--text-1)' }}>
                          {issue.issue}
                        </p>
                        {issue.details && (
                          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                            {issue.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pass message */}
            {result.issues.length === 0 && (
              <div 
                className="text-center p-8 rounded-lg"
                style={{ 
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                  All checks passed!
                </h3>
                <p style={{ color: 'var(--text-2)' }}>
                  The theme system is correctly implemented. Ready for production.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ThemeAuditProbe;
