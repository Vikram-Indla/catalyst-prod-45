import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Team Settings Page - Configure team-level settings
 * Source: Administration guide PDF, Page 18
 */
export default function TeamSettings() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Settings</h1>
            <p className="text-muted-foreground mt-2">
              Configure team-level settings and preferences.
            </p>
          </div>
          <Button variant="default" className="bg-brand-gold hover:bg-brand-gold-hover">
            Save Settings
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Configuration</CardTitle>
            <CardDescription>
              Team-specific settings and preferences per Jira Align specification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO: Team settings configuration fields (needs confirmation - source: pg 18)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
