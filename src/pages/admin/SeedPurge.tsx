/**
 * Seed Data Purge Admin Page
 * 
 * Super Admin only page to purge all seeded/demo data from the database.
 * 
 * SAFETY GUARDRAILS:
 * 1. Super Admin only access
 * 2. Environment check (blocked in production)
 * 3. VITE_ALLOW_SEED_PURGE flag required
 * 4. Dry run mode first
 * 5. Explicit confirmation text required
 * 6. All executions audited
 */

import { useState } from 'react';
import { SuperAdminGuard } from '@/components/admin/SuperAdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Shield, 
  Trash2, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Database,
  AlertOctagon
} from 'lucide-react';
import { useSeedPurge, PurgeResult } from '@/hooks/useSeedPurge';
import { cn } from '@/lib/utils';

export default function SeedPurge() {
  const [confirmationText, setConfirmationText] = useState('');
  const [hasDryRunCompleted, setHasDryRunCompleted] = useState(false);
  const { isRunning, progress, summary, runPurge, checkEnvironmentGuardrails } = useSeedPurge();

  const guardrailStatus = checkEnvironmentGuardrails();
  const isConfirmationValid = confirmationText === 'PURGE SEEDED DATA';

  const handleDryRun = async () => {
    setHasDryRunCompleted(false);
    await runPurge(true, '');
    setHasDryRunCompleted(true);
  };

  const handleActualPurge = async () => {
    if (!isConfirmationValid) return;
    await runPurge(false, confirmationText);
    setConfirmationText('');
    setHasDryRunCompleted(false);
  };

  const getStatusBadge = (result: PurgeResult) => {
    switch (result.status) {
      case 'deleted':
        return <Badge className="bg-[#0d9488]/20 text-[#0d9488]">Deleted</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      case 'pending':
        return <Badge className="bg-[#2563eb]/20 text-[#2563eb]">Pending</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  const progressPercent = progress.length > 0 
    ? Math.round((progress.length / 80) * 100) 
    : 0;

  return (
    <SuperAdminGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Seed Data Purge</h1>
            <p className="text-muted-foreground">
              Remove all seeded/demo data from the database
            </p>
          </div>
        </div>

        {/* Guardrail Status */}
        <Card className={cn(
          "border-2",
          guardrailStatus.allowed ? "border-[#0d9488]/50" : "border-destructive/50"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Environment Safety Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            {guardrailStatus.allowed ? (
              <Alert className="bg-[#0d9488]/10 border-[#0d9488]/30">
                <CheckCircle2 className="h-4 w-4 text-[#0d9488]" />
                <AlertTitle className="text-[#0d9488]">Purge Allowed</AlertTitle>
                <AlertDescription className="text-[#0d9488]/80">
                  Environment checks passed. You may proceed with dry run.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertOctagon className="h-4 w-4" />
                <AlertTitle>Purge Blocked</AlertTitle>
                <AlertDescription>{guardrailStatus.reason}</AlertDescription>
              </Alert>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Environment:</span>
                <Badge variant="outline">
                  {import.meta.env.VITE_ENVIRONMENT || 'development'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Purge Flag:</span>
                <Badge variant={import.meta.env.VITE_ALLOW_SEED_PURGE === 'true' ? 'default' : 'secondary'}>
                  {import.meta.env.VITE_ALLOW_SEED_PURGE || 'not set'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning */}
        <Alert variant="destructive" className="border-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Destructive Operation</AlertTitle>
          <AlertDescription>
            This will permanently delete all seeded data from the database. This action cannot be undone.
            Always run a dry run first to see what will be deleted.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Purge Actions
            </CardTitle>
            <CardDescription>
              Step 1: Run a dry run to see what will be deleted. Step 2: Confirm and execute.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Dry Run */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Step 1</Badge>
                <span className="font-medium">Dry Run (Preview)</span>
              </div>
              <Button
                onClick={handleDryRun}
                disabled={!guardrailStatus.allowed || isRunning}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Search className="h-4 w-4 mr-2" />
                {isRunning && summary?.isDryRun ? 'Scanning...' : 'Run Dry Run'}
              </Button>
            </div>

            {/* Step 2: Actual Purge */}
            {hasDryRunCompleted && summary && !summary.blocked && summary.totalDeleted > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Step 2</Badge>
                  <span className="font-medium">Execute Purge</span>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmation">
                    Type <code className="px-1 py-0.5 bg-muted rounded text-xs">PURGE SEEDED DATA</code> to confirm:
                  </Label>
                  <Input
                    id="confirmation"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="Type confirmation text..."
                    className={cn(
                      "max-w-md",
                      isConfirmationValid && "border-[#0d9488] focus-visible:ring-[#0d9488]"
                    )}
                  />
                </div>

                <Button
                  onClick={handleActualPurge}
                  disabled={!isConfirmationValid || isRunning}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isRunning && !summary?.isDryRun ? 'Purging...' : 'Execute Purge'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress */}
        {isRunning && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 animate-spin" />
                {summary?.isDryRun ? 'Scanning Tables...' : 'Purging Tables...'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progressPercent} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">
                Processing: {progress.length} tables
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {summary && !isRunning && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {summary.blocked ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-[#0d9488]" />
                )}
                {summary.isDryRun ? 'Dry Run Results' : 'Purge Results'}
              </CardTitle>
              <CardDescription>
                {summary.blocked ? (
                  summary.blockReason
                ) : (
                  <>
                    {summary.isDryRun ? 'Would delete' : 'Deleted'}{' '}
                    <span className="font-bold text-foreground">{summary.totalDeleted}</span> rows
                    in {summary.executionTimeMs}ms
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!summary.blocked && summary.results.length > 0 && (
                <ScrollArea className="h-[400px] rounded-md border">
                  <div className="p-4 space-y-2">
                    {summary.results
                      .filter(r => r.count > 0 || r.status === 'error')
                      .map((result, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center justify-between py-2 px-3 rounded-md",
                            result.status === 'error' && "bg-destructive/10",
                            result.count > 0 && result.status !== 'error' && "bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <code className="text-sm font-mono">{result.table}</code>
                            {result.error && (
                              <span className="text-xs text-destructive">{result.error}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{result.count}</span>
                            {getStatusBadge(result)}
                          </div>
                        </div>
                      ))}
                    
                    {summary.results.filter(r => r.count > 0 || r.status === 'error').length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No seeded data found in any tables.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </SuperAdminGuard>
  );
}
