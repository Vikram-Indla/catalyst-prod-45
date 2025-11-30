import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Portfolio Settings Page - Configure portfolio-level settings
 * Source: Administration guide PDF, Page 21
 */
export default function PortfolioSettings() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio Settings</h1>
            <p className="text-muted-foreground mt-2">
              Configure portfolio-level settings and preferences.
            </p>
          </div>
          <Button variant="default" className="bg-brand-gold hover:bg-brand-gold-hover">
            Save Settings
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio Configuration</CardTitle>
            <CardDescription>
              Portfolio-specific settings per Jira Align specification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO: Portfolio settings configuration fields (needs confirmation - source: pg 21)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
