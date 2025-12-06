import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Program Settings Page - Configure program-level settings
 * Source: Administration guide PDF, Page 20
 */
export default function ProgramSettings() {
  return (
    <AdminGuard>
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between border-b bg-card px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Program Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure program-level settings and preferences.
            </p>
          </div>
          <Button variant="default" className="bg-brand-gold hover:bg-brand-gold-hover">
            Save Settings
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Program Configuration</CardTitle>
            <CardDescription>
              Program-specific settings per Jira Align specification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO: Program settings configuration fields (needs confirmation - source: pg 20)
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
