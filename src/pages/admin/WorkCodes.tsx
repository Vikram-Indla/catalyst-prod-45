import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Work Codes Page - Create, update, and search identification and work codes
 * Source: Administration guide PDF, Page 10
 */
export default function WorkCodes() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Work Codes</h1>
          <p className="text-muted-foreground mt-2">
            Create, update, and search for identification and work codes.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Manage Identification Codes and Work Codes</CardTitle>
            <CardDescription>
              Requires Administration &gt; Work Code Admin permission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              TODO: Create New button, search with Apply Filters, work codes grid (needs confirmation - source: pg 10)
            </p>
            <p className="text-xs text-muted-foreground">
              Fields: Work Code (name), Type (dropdown, cannot change after creation), Description, Cost Center (multi-select), State (enabled/disabled), Save button
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
