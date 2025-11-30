import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Changes Page - Activity logs for system changes
 * Source: Administration guide PDF, Page 8
 */
export default function Changes() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Changes</h1>
          <p className="text-muted-foreground mt-2">
            Activity logs give information about changes in the application: type, date, details, and user who made it.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
            <CardDescription>
              Track changes made in the product over time with date range filtering.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO: Activity logs grid with date range picker, user ID filter, Apply Filters button (needs confirmation - source: pg 8)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
