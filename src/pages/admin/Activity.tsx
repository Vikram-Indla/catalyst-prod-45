import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Activity Page - Track user activity by names, roles, login tracking
 * Source: Administration guide PDF, Page 7
 */
export default function Activity() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
          <p className="text-muted-foreground mt-2">
            Track user activity by users' names and roles. Access user profiles, roles, and announcements.
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>People</CardTitle>
              <CardDescription>
                Users assigned to roles and security permissions. Data security based on team assignment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                TODO: User activity grid (needs confirmation - source: pg 7)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Login Activity</CardTitle>
              <CardDescription>
                Track recent user sign-ins by IP address, date, and time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                TODO: Login activity table (needs confirmation - source: pg 7)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <CardDescription>
                Customize access-based roles to control navigation and button access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                TODO: Roles overview (needs confirmation - source: pg 7)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
              <CardDescription>
                Active and inactive announcements for your instance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                TODO: Announcements list (needs confirmation - source: pg 7)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
