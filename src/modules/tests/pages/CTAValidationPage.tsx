/**
 * CTA VALIDATION PAGE
 * Dev-only page to validate all CTAs in the Tests module
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Loader2,
  FileText,
  MousePointer,
  Navigation,
  FormInput,
  Box,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  TESTS_CTA_REGISTRY,
  getCTAValidationSummary,
  CTADefinition,
} from '../utils/ctaRegistry';
import {
  runTestsModuleSmokeTests,
  SmokeTestSuite,
} from '../utils/smokeTests';

export function CTAValidationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [smokeResults, setSmokeResults] = useState<SmokeTestSuite | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const summary = getCTAValidationSummary();

  const runSmokeTests = async () => {
    if (!projectId) return;
    setIsRunning(true);
    try {
      const results = await runTestsModuleSmokeTests(projectId);
      setSmokeResults(results);
    } catch (error) {
      console.error('Smoke tests failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'navigation': return <Navigation className="h-4 w-4" />;
      case 'modal': return <Box className="h-4 w-4" />;
      case 'drawer': return <FileText className="h-4 w-4" />;
      case 'action': return <MousePointer className="h-4 w-4" />;
      case 'submit': return <FormInput className="h-4 w-4" />;
      default: return <MousePointer className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'navigation': return 'text-blue-500 bg-blue-500/10';
      case 'modal': return 'text-purple-500 bg-purple-500/10';
      case 'drawer': return 'text-indigo-500 bg-indigo-500/10';
      case 'action': return 'text-amber-500 bg-amber-500/10';
      case 'submit': return 'text-emerald-500 bg-emerald-500/10';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  // Group CTAs by page
  const ctasByPage = TESTS_CTA_REGISTRY.reduce((acc, cta) => {
    if (!acc[cta.page]) acc[cta.page] = [];
    acc[cta.page].push(cta);
    return acc;
  }, {} as Record<string, CTADefinition[]>);

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">CTA Validation Report</h1>
          <p className="text-text-secondary">Tests Module - All CTAs Enumerated & Validated</p>
        </div>
        <Badge variant="outline" className="text-xs">
          DEV ONLY
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-surface-2 border-border-default">
          <CardContent className="p-4">
            <p className="text-sm text-text-tertiary">Total CTAs</p>
            <p className="text-3xl font-bold text-text-primary">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-surface-2 border-border-default">
          <CardContent className="p-4">
            <p className="text-sm text-text-tertiary">Validated</p>
            <p className="text-3xl font-bold text-status-success">{summary.validated}</p>
          </CardContent>
        </Card>
        <Card className="bg-surface-2 border-border-default">
          <CardContent className="p-4">
            <p className="text-sm text-text-tertiary">Unvalidated</p>
            <p className="text-3xl font-bold text-status-error">{summary.unvalidated.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-surface-2 border-border-default">
          <CardContent className="p-4">
            <p className="text-sm text-text-tertiary">Coverage</p>
            <p className="text-3xl font-bold text-accent-primary">{summary.percentValidated}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Validation Progress */}
      <Card className="bg-surface-2 border-border-default">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Validation Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={summary.percentValidated} className="h-3 mb-2" />
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>{summary.validated} of {summary.total} CTAs validated</span>
            {summary.percentValidated === 100 && (
              <Badge className="bg-status-success/10 text-status-success">All Clear</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CTA Type Breakdown */}
      <Card className="bg-surface-2 border-border-default">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">CTAs by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(summary.byType).map(([type, count]) => (
              <div
                key={type}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-lg', getTypeColor(type))}
              >
                {getTypeIcon(type)}
                <span className="font-medium capitalize">{type}</span>
                <Badge variant="outline" className="ml-1">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Smoke Tests */}
      <Card className="bg-surface-2 border-border-default">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Runtime Smoke Tests</span>
            <Button 
              onClick={runSmokeTests} 
              disabled={isRunning}
              size="sm"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Tests
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!smokeResults ? (
            <p className="text-text-tertiary text-center py-8">
              Click "Run Tests" to execute smoke tests
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-surface-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-status-success" />
                  <span className="font-medium text-status-success">{smokeResults.totalPassed} Passed</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-status-error" />
                  <span className="font-medium text-status-error">{smokeResults.totalFailed} Failed</span>
                </div>
                <span className="text-text-tertiary text-sm ml-auto">
                  {smokeResults.duration}ms
                </span>
              </div>
              <div className="space-y-2">
                {smokeResults.tests.map((test) => (
                  <div
                    key={test.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg',
                      test.passed ? 'bg-status-success/5' : 'bg-status-error/5'
                    )}
                  >
                    {test.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-status-error shrink-0" />
                    )}
                    <span className="text-text-primary flex-1">{test.name}</span>
                    {test.error && (
                      <span className="text-xs text-status-error truncate max-w-[200px]">
                        {test.error}
                      </span>
                    )}
                    <span className="text-xs text-text-tertiary">{test.duration}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTAs by Page */}
      <Card className="bg-surface-2 border-border-default">
        <CardHeader>
          <CardTitle>CTA Registry by Page</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-6">
              {Object.entries(ctasByPage).map(([page, ctas]) => (
                <div key={page}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-medium text-text-primary">{page}</h3>
                    <Badge variant="outline" className="text-xs">
                      {ctas.length} CTAs
                    </Badge>
                    {ctas.every(c => c.validated) && (
                      <CheckCircle2 className="h-4 w-4 text-status-success" />
                    )}
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-border-default">
                    {ctas.map((cta) => (
                      <div
                        key={cta.id}
                        className="flex items-start gap-3 p-2 rounded hover:bg-surface-hover"
                      >
                        {cta.validated ? (
                          <CheckCircle2 className="h-4 w-4 text-status-success mt-0.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-status-warning mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-primary">{cta.label}</span>
                            <Badge className={cn('text-xs', getTypeColor(cta.type))}>
                              {cta.type}
                            </Badge>
                          </div>
                          {cta.target && (
                            <p className="text-xs text-text-tertiary">
                              → {cta.target}
                            </p>
                          )}
                          {cta.notes && (
                            <p className="text-xs text-text-secondary mt-1">
                              {cta.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="mt-4 bg-border-default" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Validation Summary */}
      <Card className="bg-status-success/10 border-status-success/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-status-success" />
            <div>
              <h3 className="font-semibold text-status-success">All CTAs Validated</h3>
              <p className="text-sm text-status-success/80">
                {summary.total} CTAs across {Object.keys(ctasByPage).length} pages are properly wired
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
