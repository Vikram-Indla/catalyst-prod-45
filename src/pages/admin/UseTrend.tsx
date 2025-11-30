import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Use Trend Page - Login charts and trends
 * Source: Administration guide PDF, Page 9
 */
export default function UseTrend() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Use Trend</h1>
          <p className="text-muted-foreground mt-2">
            Track user activity over time with login charts and invalid login tracking.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Total Logins Chart</CardTitle>
            <CardDescription>
              User activity over the years, showing number of logins per year broken down by weeks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO: Chart with print/export to PDF/image options (needs confirmation - source: pg 9)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Login Activity</CardTitle>
            <CardDescription>
              Track recent users by IP address, date, and time (includes manual and SSO logins).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO: Login activity table (needs confirmation - source: pg 9)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invalid Login Activity</CardTitle>
            <CardDescription>
              Check reasons why logins were invalid for certain users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO: Invalid login table with reason column (needs confirmation - source: pg 9)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
