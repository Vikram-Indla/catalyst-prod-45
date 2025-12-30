import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Programs Management Page - Manage programs in the organization
 */
export default function Programs() {
  return (
    <AdminGuard>
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between border-b bg-card px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Programs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage programs and their configurations.
            </p>
          </div>
          <Button variant="default" className="bg-brand-primary hover:bg-brand-primary-hover">
            Add Program
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Program Management</CardTitle>
              <CardDescription>
                Create and manage programs across your organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Program management functionality coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminGuard>
  );
}