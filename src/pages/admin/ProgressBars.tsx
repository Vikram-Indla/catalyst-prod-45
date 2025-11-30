import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Configure Progress Bars Page - Progress alert thresholds configuration
 * Source: Administration guide PDF, Page 23
 */
export default function ProgressBars() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configure Progress Bars</h1>
            <p className="text-muted-foreground mt-2">
              Set progress alert thresholds: Late (red) and Warning (yellow) percentages by time elapsed.
            </p>
          </div>
          <Button variant="default" className="bg-brand-gold hover:bg-brand-gold-hover">
            Save Configuration
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Progress Alert Thresholds</CardTitle>
            <CardDescription>
              Configure Late (%) and Warning (%) thresholds at 10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90% time elapsed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              TODO: Progress threshold table with Time Elapsed columns (10%-90%), Late (%) row, Warning (%) row (needs confirmation - source: pg 23-24)
            </p>
            <p className="text-xs text-muted-foreground">
              Example from reference: Late starts at 0% until 50% time elapsed, then 20% at 50%, 35% at 60%, etc. Warning starts at 0% until 30%, then 10% at 30%, 20% at 40%, 35% at 50%, etc.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
